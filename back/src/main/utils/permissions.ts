// Matrice des habilitations. Référence : docs/multi-tenant/habilitations.md.
// Ce fichier est dupliqué à l'identique dans front/src/utils/permissions.ts ;
// un test unitaire back vérifie l'égalité des deux copies.

export type RolePreset =
  | 'COORDINATEUR'
  | 'INTERVENANT'
  | 'SECRETARIAT'
  | 'LECTURE'
export type EstablishmentRole = 'ADMIN' | 'MEMBER'

// Catalogue exhaustif des clés de service : le type `ServicePermission` en dérive.
export const SERVICE_PERMISSION_KEYS = [
  'planning:read',
  'planning:write',
  'referentials:read',
  'patient:read',
  'patient:write',
  'patient:delete',
  'clinical:read',
  'clinical:write',
  'appointment:write',
  'pdf:export',
  'tasks:read',
  'tasks:write',
  'notifications:own',
  'members:read',
  // Gerer l'equipe du SEUL service courant : inviter, changer le role de service, retirer.
  // Distincte de `members:manage` (etablissement), qui porte les comptes et les
  // rattachements : un coordinateur n'en a aucun.
  'service-members:manage',
  // Lire le journal des consultations (`PatientAccessLog`), a l'echelle du
  // SEUL service courant. `access-log:read` (EstablishmentPermission ci-dessous, deja present
  // pour ADMIN depuis la toute premiere version de ce fichier, bd26a72) ne convient pas pour
  // cette route DE SERVICE : `hasPermission` (plus bas) choisit sa branche — service ou
  // etablissement — sur la seule APPARTENANCE de la chaine a l'un des deux ensembles, avant
  // meme de regarder les roles de l'appelant. Une chaine presente dans les DEUX ensembles
  // prendrait toujours la branche service, y compris pour un appelant d'administration
  // d'etablissement dont `servicePermissions` est `null` — la route d'administration echouerait donc
  // TOUJOURS, quel que soit son `establishmentRole`. Verifie par execution en ecrivant d'abord
  // ce test faux.
  //
  // `accessLog:read` (premier jet) etait un homographe presque
  // parfait d'`access-log:read`, dans une matrice DUPLIQUEE entre deux depots (back et front) :
  // un piege de lecture permanent. Le court-circuit ci-dessus
  // explique pourquoi deux permissions DISTINCTES sont necessaires ; il n'explique pas pourquoi
  // choisir un nom qui ne se distingue de l'autre que par la casse et un trait d'union. Renomme
  // en `consultations:read` : aucune parente visuelle avec `access-log:read`, et un mot qui n'est
  // pas deja pris par une autre permission de ce fichier.
  //
  // CE QUE CE COMMENTAIRE NE DIT PAS ET NE DOIT PAS DIRE : que deux permissions seraient
  // « impossibles » a unifier. Une semantique « ou » (accordee des que l'UNE des deux branches
  // accorde) aurait rendu une seule permission viable en huit lignes — essaye et REJETE, parce
  // qu'elle brouillerait alors deux echelles d'habilitation distinctes : un ADMIN d'etablissement
  // membre d'un service en LECTURE obtiendrait `consultations:read` sur la route DE SERVICE par
  // sa seule appartenance de service, une confusion durable que cette tache ne doit pas
  // introduire dans une fonction dont depend chaque route du depot.
  'consultations:read',
  // Journal d'activite du SEUL service courant (chef de service). Nom distinct d'`activity-log:read`
  // pour la meme raison que `consultations:read`.
  'service-journal:read',
  // Indicateurs de l'enquete annuelle ARS du service courant, en chiffres agreges et sans donnee
  // nominative (MDS-26). Non accordee a LECTURE : la direction lit `activity:read`.
  'stats:read',
  // Saisir les indicateurs ARS a renseigner a la main (2.5, 4.2) du service courant.
  'stats:write',
  // Tableau de bord d'activite du service courant, en chiffres agreges (MDS-40). Accordee a
  // LECTURE : c'est l'ecran de la direction.
  'activity:read',
  // Ajouter (RDV, collectif) depuis le Dashboard, qui reste en consultation pour les autres rôles.
  'dashboard:write',
  'pathway-templates:write',
  'thematics:write',
  'soignants:write',
  'locations:write',
  'diagnostic-templates:write',
  'pdf-design:write',
  'patient-form:write',
  'patient:create',
  'appointment:create',
  'dashboard:read',
  'agenda:read',
  'patients:read',
  'suivi:read',
] as const
export type ServicePermission = (typeof SERVICE_PERMISSION_KEYS)[number]

export type EstablishmentPermission =
  | 'services:manage'
  | 'members:manage'
  | 'activity-log:read'
  | 'activity-log:write'
  | 'access-log:read'
  | 'establishment:rename'
  | 'roles:manage'

// Portée par le drapeau `User.isSuperAdmin`, jamais par un rôle d'établissement ou de service
// (habilitations.md, table « Permissions d'établissement et de plateforme » — colonne
// Super-admin, seule cochée pour `establishments:manage`). Aucune route ne la vérifie par
// `hasPermission` : `requireSuperAdmin` (super-admin.routes.ts) tranche seul, sur le drapeau.
export type SuperAdminPermission = 'establishments:manage'

export type Permission =
  | ServicePermission
  | EstablishmentPermission
  | SuperAdminPermission

const DAILY_TABS: readonly ServicePermission[] = [
  'dashboard:read',
  'agenda:read',
  'patients:read',
  'suivi:read',
]

const READ_ALL: readonly ServicePermission[] = [
  ...DAILY_TABS,
  'planning:read',
  'referentials:read',
  'patient:read',
  'notifications:own',
  'members:read',
]

export const DEFAULT_ROLE_NAMES: Record<RolePreset, string> = {
  COORDINATEUR: 'Coordinateur',
  INTERVENANT: 'Intervenant',
  SECRETARIAT: 'Secrétariat',
  LECTURE: 'Lecture seule',
}

export const DEFAULT_ROLE_PERMISSIONS: Record<
  RolePreset,
  readonly ServicePermission[]
> = {
  COORDINATEUR: [
    ...READ_ALL,
    'planning:write',
    'pathway-templates:write',
    'thematics:write',
    'soignants:write',
    'locations:write',
    'diagnostic-templates:write',
    'pdf-design:write',
    'patient-form:write',
    'patient:create',
    'appointment:create',
    'patient:write',
    'patient:delete',
    'clinical:read',
    'clinical:write',
    'appointment:write',
    'pdf:export',
    'tasks:read',
    'tasks:write',
    'consultations:read',
    'service-members:manage',
    'service-journal:read',
    'stats:read',
    'stats:write',
    'activity:read',
    'dashboard:write',
  ],
  INTERVENANT: [
    ...READ_ALL,
    'patient:create',
    'appointment:create',
    'patient:write',
    'clinical:read',
    'clinical:write',
    'appointment:write',
    'pdf:export',
    'tasks:read',
    'tasks:write',
  ],
  SECRETARIAT: [
    ...READ_ALL,
    'patient:create',
    'appointment:create',
    'patient:write',
    'appointment:write',
    'pdf:export',
    'tasks:read',
    'tasks:write',
  ],
  LECTURE: [...READ_ALL, 'activity:read'],
}

export const ESTABLISHMENT_PERMISSIONS: Record<
  EstablishmentRole,
  readonly EstablishmentPermission[]
> = {
  ADMIN: [
    'services:manage',
    'members:manage',
    'activity-log:read',
    'activity-log:write',
    'access-log:read',
    'establishment:rename',
    'roles:manage',
  ],
  MEMBER: [],
}

export const ALL_SERVICE_PERMISSIONS: readonly ServicePermission[] =
  SERVICE_PERMISSION_KEYS

const SERVICE_PERMISSION_SET: ReadonlySet<string> = new Set(
  SERVICE_PERMISSION_KEYS,
)

export const isServicePermission = (
  permission: Permission,
): permission is ServicePermission => SERVICE_PERMISSION_SET.has(permission)

export const parsePermissions = (raw: readonly string[]): ServicePermission[] =>
  SERVICE_PERMISSION_KEYS.filter((key) => raw.includes(key))

const ESTABLISHMENT_PERMISSION_SET: ReadonlySet<string> = new Set(
  Object.values(ESTABLISHMENT_PERMISSIONS).flat(),
)

export const isEstablishmentPermission = (
  permission: Permission,
): permission is EstablishmentPermission =>
  ESTABLISHMENT_PERMISSION_SET.has(permission)

export type RoleSet = {
  servicePermissions: readonly ServicePermission[] | null
  establishmentRole: EstablishmentRole | null
}

export const hasPermission = (
  roles: RoleSet,
  permission: Permission,
): boolean => {
  if (isServicePermission(permission)) {
    return roles.servicePermissions?.includes(permission) ?? false
  }
  if (isEstablishmentPermission(permission)) {
    return (
      roles.establishmentRole !== null &&
      ESTABLISHMENT_PERMISSIONS[roles.establishmentRole].includes(permission)
    )
  }
  // Une SuperAdminPermission (`establishments:manage`) : aucun rôle d'établissement ou de
  // service ne l'accorde jamais — voir le commentaire au-dessus de son type.
  return false
}
