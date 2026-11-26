import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { EstablishmentRole, ServiceRole } from '../../../generated/enums'
import {
  DEFAULT_ROLE_PERMISSIONS,
  ESTABLISHMENT_PERMISSIONS,
  hasPermission,
  parsePermissions,
} from '../../../main/utils/permissions'

describe('permissions', () => {
  it('donne toutes les permissions de service au coordinateur', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.COORDINATEUR).toEqual(
      expect.arrayContaining([
        'planning:read',
        'planning:write',
        'referentials:read',
        'referentials:write',
        'patient:read',
        'patient:write',
        'clinical:read',
        'clinical:write',
        'appointment:write',
        'pdf:export',
        'notifications:own',
        'members:read',
      ]),
    )
  })

  it('reserve les indicateurs ARS au coordinateur', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.COORDINATEUR).toContain('stats:read')
    for (const role of ['INTERVENANT', 'SECRETARIAT', 'LECTURE'] as const) {
      expect(DEFAULT_ROLE_PERMISSIONS[role]).not.toContain('stats:read')
    }
  })

  it('refuse le contenu clinique au secretariat et a la lecture', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.SECRETARIAT).not.toContain('clinical:read')
    expect(DEFAULT_ROLE_PERMISSIONS.LECTURE).not.toContain('clinical:read')
    expect(DEFAULT_ROLE_PERMISSIONS.LECTURE).not.toContain('patient:write')
  })

  it('accorde les lectures a tous les roles', () => {
    for (const role of [
      'COORDINATEUR',
      'INTERVENANT',
      'SECRETARIAT',
      'LECTURE',
    ] as const) {
      expect(DEFAULT_ROLE_PERMISSIONS[role]).toContain('planning:read')
      expect(DEFAULT_ROLE_PERMISSIONS[role]).toContain('referentials:read')
      expect(DEFAULT_ROLE_PERMISSIONS[role]).toContain('patient:read')
      expect(DEFAULT_ROLE_PERMISSIONS[role]).toContain('notifications:own')
      expect(DEFAULT_ROLE_PERMISSIONS[role]).toContain('members:read')
    }
  })

  it('donne les taches a tous les roles sauf la lecture', () => {
    for (const role of [
      'COORDINATEUR',
      'INTERVENANT',
      'SECRETARIAT',
    ] as const) {
      expect(DEFAULT_ROLE_PERMISSIONS[role]).toContain('tasks:read')
      expect(DEFAULT_ROLE_PERMISSIONS[role]).toContain('tasks:write')
    }
    expect(DEFAULT_ROLE_PERMISSIONS.LECTURE).not.toContain('tasks:read')
    expect(DEFAULT_ROLE_PERMISSIONS.LECTURE).not.toContain('tasks:write')
  })

  it('reserve la gestion des membres a l administrateur d etablissement', () => {
    expect(ESTABLISHMENT_PERMISSIONS.ADMIN).toContain('members:manage')
    expect(ESTABLISHMENT_PERMISSIONS.MEMBER).toHaveLength(0)
  })

  // MDS-17 : l'equipe d'un service se gere depuis ce service, par son coordinateur seul. La
  // propriete qui compte ici est la SEPARATION des deux echelles, pas le nom choisi :
  // `service-members:manage` ne doit jamais tomber dans la branche d'etablissement (un ADMIN
  // sans service courant l'obtiendrait alors sur une route DE SERVICE), et `members:manage` ne
  // doit jamais s'obtenir par un role de service.
  it('reserve l equipe du service au coordinateur, sans toucher a members:manage', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.COORDINATEUR).toContain(
      'service-members:manage',
    )
    for (const role of ['INTERVENANT', 'SECRETARIAT', 'LECTURE'] as const) {
      expect(DEFAULT_ROLE_PERMISSIONS[role]).not.toContain(
        'service-members:manage',
      )
    }
    expect(ESTABLISHMENT_PERMISSIONS.ADMIN).not.toContain(
      'service-members:manage',
    )
    expect(
      hasPermission(
        {
          servicePermissions: DEFAULT_ROLE_PERMISSIONS.COORDINATEUR,
          establishmentRole: 'MEMBER',
        },
        'service-members:manage',
      ),
    ).toBe(true)
    expect(
      hasPermission(
        {
          servicePermissions: DEFAULT_ROLE_PERMISSIONS.COORDINATEUR,
          establishmentRole: 'MEMBER',
        },
        'members:manage',
      ),
    ).toBe(false)
    expect(
      hasPermission(
        { servicePermissions: null, establishmentRole: 'ADMIN' },
        'service-members:manage',
      ),
    ).toBe(false)
  })

  it('hasPermission route vers le bon niveau', () => {
    const roles = {
      servicePermissions: DEFAULT_ROLE_PERMISSIONS.SECRETARIAT,
      establishmentRole: 'ADMIN',
    } as const
    expect(hasPermission(roles, 'appointment:write')).toBe(true)
    expect(hasPermission(roles, 'clinical:write')).toBe(false)
    expect(hasPermission(roles, 'members:manage')).toBe(true)
    expect(
      hasPermission(
        { servicePermissions: null, establishmentRole: 'MEMBER' },
        'patient:read',
      ),
    ).toBe(false)
    // Le journal d'activite est monte sous le prefixe de service mais porte
    // une permission d'etablissement : c'est establishmentRole qui tranche,
    // jamais le role de service.
    expect(hasPermission(roles, 'activity-log:read')).toBe(true)
    expect(
      hasPermission(
        {
          servicePermissions: DEFAULT_ROLE_PERMISSIONS.COORDINATEUR,
          establishmentRole: 'MEMBER',
        },
        'activity-log:read',
      ),
    ).toBe(false)
  })

  // Deux permissions distinctes portent le journal des consultations,
  // `consultations:read` (service, COORDINATEUR) et `access-log:read` (etablissement, ADMIN) —
  // noms volontairement NON HOMOGRAPHES (le premier jet, `accessLog:read`,
  // ne se distinguait de `access-log:read` que par la casse et un trait d'union — un piege de
  // lecture permanent dans une matrice dupliquee entre deux depots), voir le commentaire
  // au-dessus de `consultations:read` (utils/permissions.ts). Ce test tient la propriete qui
  // justifie la distinction ELLE-MEME (independamment du nom choisi) : un administrateur
  // d'etablissement sans service courant (le cas reel de la route d'administration,
  // `serviceId: null`) doit obtenir `access-log:read`, jamais `consultations:read` — et
  // reciproquement, un coordinateur de service ne doit jamais obtenir `access-log:read` par sa
  // seule appartenance de service.
  it('distingue consultations:read (service) de access-log:read (etablissement)', () => {
    expect(
      hasPermission(
        { servicePermissions: null, establishmentRole: 'ADMIN' },
        'access-log:read',
      ),
    ).toBe(true)
    expect(
      hasPermission(
        { servicePermissions: null, establishmentRole: 'ADMIN' },
        'consultations:read',
      ),
    ).toBe(false)
    expect(
      hasPermission(
        {
          servicePermissions: DEFAULT_ROLE_PERMISSIONS.COORDINATEUR,
          establishmentRole: 'MEMBER',
        },
        'consultations:read',
      ),
    ).toBe(true)
    expect(
      hasPermission(
        {
          servicePermissions: DEFAULT_ROLE_PERMISSIONS.COORDINATEUR,
          establishmentRole: 'MEMBER',
        },
        'access-log:read',
      ),
    ).toBe(false)
  })

  // `establishments:manage` n'est accordee par AUCUN role d'etablissement ni
  // de service (habilitations.md : seule la colonne Super-admin est cochee) : c'est
  // `requireSuperAdmin` (drapeau `isSuperAdmin`), pas cette matrice, qui protege
  // `POST /super-admin/establishments`. Verifie meme avec le role le plus permissif (ADMIN).
  it('n accorde jamais establishments:manage par un role d etablissement ou de service', () => {
    expect(
      hasPermission(
        { servicePermissions: null, establishmentRole: 'ADMIN' },
        'establishments:manage',
      ),
    ).toBe(false)
    expect(
      hasPermission(
        {
          servicePermissions: DEFAULT_ROLE_PERMISSIONS.COORDINATEUR,
          establishmentRole: 'ADMIN',
        },
        'establishments:manage',
      ),
    ).toBe(false)
  })

  // Les roles sont declares a trois endroits : les enums Prisma, cette
  // matrice, et le schema HTTP des membres. Ce test empeche la matrice de
  // diverger du schema en silence — un role ajoute cote Prisma et oublie ici
  // n'aurait aucune permission sans que rien ne le signale.
  it('couvre exactement les roles des enums Prisma', () => {
    expect(Object.keys(DEFAULT_ROLE_PERMISSIONS).sort()).toEqual(
      Object.values(ServiceRole).sort(),
    )
    expect(Object.keys(ESTABLISHMENT_PERMISSIONS).sort()).toEqual(
      Object.values(EstablishmentRole).sort(),
    )
  })

  it('accorde les nouvelles clés là où l’ancienne l’était', () => {
    for (const k of [
      'thematics:write',
      'soignants:write',
      'locations:write',
      'diagnostic-templates:write',
      'pdf-design:write',
      'patient-form:write',
      'pathway-templates:write',
    ] as const)
      expect(DEFAULT_ROLE_PERMISSIONS.COORDINATEUR).toContain(k)
    expect(DEFAULT_ROLE_PERMISSIONS.INTERVENANT).toEqual(
      expect.arrayContaining(['patient:create', 'appointment:create']),
    )
    expect(DEFAULT_ROLE_PERMISSIONS.SECRETARIAT).toEqual(
      expect.arrayContaining(['patient:create', 'appointment:create']),
    )
    expect(DEFAULT_ROLE_PERMISSIONS.LECTURE).not.toContain('patient:create')
  })

  it('ouvre les quatre onglets du quotidien à chaque rôle par défaut', () => {
    for (const p of Object.values(DEFAULT_ROLE_PERMISSIONS))
      expect(p).toEqual(
        expect.arrayContaining([
          'dashboard:read',
          'agenda:read',
          'patients:read',
          'suivi:read',
        ]),
      )
  })

  it('lit la liste du rôle', () => {
    const roles = {
      servicePermissions: ['agenda:read'],
      establishmentRole: 'MEMBER',
    } as const
    expect(hasPermission(roles, 'agenda:read')).toBe(true)
    expect(hasPermission(roles, 'suivi:read')).toBe(false)
    expect(
      hasPermission(
        { servicePermissions: null, establishmentRole: 'ADMIN' },
        'roles:manage',
      ),
    ).toBe(true)
  })

  it('ignore une clé inconnue', () => {
    expect(parsePermissions(['agenda:read', 'patient:fly'])).toEqual([
      'agenda:read',
    ])
  })

  it('est identique a la copie du front', () => {
    const back = readFileSync(
      join(__dirname, '../../../main/utils/permissions.ts'),
      'utf8',
    )
    const front = readFileSync(
      join(__dirname, '../../../../../front/src/utils/permissions.ts'),
      'utf8',
    )
    expect(front).toBe(back)
  })
})
