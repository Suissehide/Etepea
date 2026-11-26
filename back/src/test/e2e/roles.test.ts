import { buildTestApp, type TestApp } from './setup/app'
import { testDb, truncateAll } from './setup/db'
import {
  adminUrl,
  createEstablishment,
  createService,
  createUser,
  roleIdOf,
  signIn,
  tenantUrl,
} from './setup/fixtures'

type RoleDto = {
  id: string
  name: string
  preset: string | null
  permissions: string[]
  hiddenSoignantIds: string[]
  memberCount: number
  archivedAt: string | null
}

describe('roles de service : liste et attribution par roleId', () => {
  let t: TestApp
  let E: string
  let A: string
  let B: string
  let coordA: { access_token: string }
  let admin: { access_token: string }

  beforeAll(async () => {
    t = await buildTestApp()
    await truncateAll()
    E = (await createEstablishment('CHU')).id
    A = (await createService(E, 'Cardiologie')).id
    B = (await createService(E, 'Pneumologie')).id
    await createUser({
      email: 'coord-a@test.fr',
      memberships: [
        {
          establishmentId: E,
          services: [{ serviceId: A, role: 'COORDINATEUR' }],
        },
      ],
    })
    await createUser({
      email: 'inter-a@test.fr',
      memberships: [
        {
          establishmentId: E,
          services: [{ serviceId: A, role: 'INTERVENANT' }],
        },
      ],
    })
    await createUser({
      email: 'admin@test.fr',
      memberships: [{ establishmentId: E, role: 'ADMIN' }],
    })
    coordA = await signIn(t.app, 'coord-a@test.fr')
    admin = await signIn(t.app, 'admin@test.fr')
  })

  afterAll(async () => {
    await t.close()
    await testDb.$disconnect()
  })

  it('GET /roles rend les quatre roles du service avec leur nombre de membres', async () => {
    const res = await t.app.inject({
      method: 'GET',
      url: tenantUrl(E, A, '/roles'),
      cookies: coordA,
    })
    expect(res.statusCode).toBe(200)
    const roles = res.json() as RoleDto[]
    expect(roles.map((r) => [r.name, r.memberCount])).toEqual([
      ['Coordinateur', 1],
      ['Intervenant', 1],
      ['Secrétariat', 0],
      ['Lecture seule', 0],
    ])
    expect(roles[0]?.preset).toBe('COORDINATEUR')
    expect(roles[0]?.permissions).toContain('service-members:manage')
    expect(roles.every((r) => r.archivedAt === null)).toBe(true)
  })

  it('GET /roles?archived=true ne rend que les roles supprimes', async () => {
    const archive = await testDb.serviceRoleDef.create({
      data: {
        name: 'Ancien',
        permissions: [],
        archivedAt: new Date(),
        serviceId: A,
        establishmentId: E,
      },
    })
    const actifs = await t.app.inject({
      method: 'GET',
      url: tenantUrl(E, A, '/roles'),
      cookies: coordA,
    })
    expect((actifs.json() as RoleDto[]).map((r) => r.id)).not.toContain(
      archive.id,
    )
    const supprimes = await t.app.inject({
      method: 'GET',
      url: tenantUrl(E, A, '/roles?archived=true'),
      cookies: coordA,
    })
    expect((supprimes.json() as RoleDto[]).map((r) => r.id)).toEqual([
      archive.id,
    ])
  })

  it('refuse (400) l invitation avec le roleId d un autre service', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: tenantUrl(E, A, '/membres'),
      cookies: coordA,
      payload: {
        email: 'nouveau@test.fr',
        roleId: await roleIdOf(B, 'LECTURE'),
      },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().message).toBe('Rôle inconnu dans ce service')
  })

  it('refuse (400) l invitation avec un role supprime', async () => {
    const archive = await testDb.serviceRoleDef.create({
      data: {
        name: 'Supprime',
        permissions: [],
        archivedAt: new Date(),
        serviceId: A,
        establishmentId: E,
      },
    })
    const res = await t.app.inject({
      method: 'POST',
      url: tenantUrl(E, A, '/membres'),
      cookies: coordA,
      payload: { email: 'nouveau@test.fr', roleId: archive.id },
    })
    expect(res.statusCode).toBe(400)
  })

  it('invite avec un roleId du service, et rend role { id, name } dans la liste', async () => {
    const lecture = await roleIdOf(A, 'LECTURE')
    const res = await t.app.inject({
      method: 'POST',
      url: tenantUrl(E, A, '/membres'),
      cookies: coordA,
      payload: { email: 'lecteur@test.fr', roleId: lecture },
    })
    expect(res.statusCode).toBe(201)
    const membres = await t.app.inject({
      method: 'GET',
      url: tenantUrl(E, A, '/membres'),
      cookies: coordA,
    })
    const lecteur = (
      membres.json() as { role: unknown; user: { email: string } }[]
    ).find((m) => m.user.email === 'lecteur@test.fr')
    expect(lecteur?.role).toEqual({ id: lecture, name: 'Lecture seule' })
  })

  it('un coordinateur ne change pas son propre role', async () => {
    const sienne = await testDb.serviceMembership.findFirstOrThrow({
      where: {
        serviceId: A,
        establishmentMembership: { user: { email: 'coord-a@test.fr' } },
      },
    })
    const res = await t.app.inject({
      method: 'PATCH',
      url: tenantUrl(E, A, `/membres/${sienne.id}`),
      cookies: coordA,
      payload: { roleId: await roleIdOf(A, 'LECTURE') },
    })
    expect(res.statusCode).toBe(409)
  })

  it('l administration d etablissement refuse (400) le roleId d un autre service', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: adminUrl(E, '/members/account'),
      cookies: admin,
      payload: {
        email: 'via-admin@test.fr',
        role: 'MEMBER',
        services: [{ serviceId: A, roleId: await roleIdOf(B, 'LECTURE') }],
      },
    })
    expect(res.statusCode).toBe(400)
    expect(
      await testDb.user.count({ where: { email: 'via-admin@test.fr' } }),
    ).toBe(0)
  })

  it('l administration d etablissement affecte par roleId', async () => {
    const intervenant = await roleIdOf(A, 'INTERVENANT')
    const res = await t.app.inject({
      method: 'POST',
      url: adminUrl(E, '/members/account'),
      cookies: admin,
      payload: {
        email: 'via-admin@test.fr',
        role: 'MEMBER',
        services: [{ serviceId: A, roleId: intervenant }],
      },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().member.serviceMemberships).toEqual([
      { serviceId: A, roleId: intervenant },
    ])
  })

  describe('role supprime deja tenu', () => {
    let archive: string
    let affectationId: string
    let membershipId: string

    beforeAll(async () => {
      archive = (
        await testDb.serviceRoleDef.create({
          data: {
            name: 'Ancien tenu',
            permissions: ['agenda:read'],
            archivedAt: new Date(),
            serviceId: A,
            establishmentId: E,
          },
        })
      ).id
      const user = await createUser({
        email: 'ancien@test.fr',
        memberships: [
          {
            establishmentId: E,
            services: [{ serviceId: A, role: 'LECTURE', roleId: archive }],
          },
        ],
      })
      const affectation = await testDb.serviceMembership.findFirstOrThrow({
        where: { serviceId: A, establishmentMembership: { userId: user.id } },
      })
      affectationId = affectation.id
      membershipId = affectation.establishmentMembershipId
    })

    const patchService = async (roleId: string) =>
      t.app.inject({
        method: 'PATCH',
        url: tenantUrl(E, A, `/membres/${affectationId}`),
        cookies: coordA,
        payload: { roleId },
      })

    it('PATCH /membres/:id refuse (400) un roleId d un autre service, ou un role supprime non tenu', async () => {
      const autreArchive = await testDb.serviceRoleDef.create({
        data: {
          name: 'Autre supprime',
          permissions: [],
          archivedAt: new Date(),
          serviceId: A,
          establishmentId: E,
        },
      })
      const etranger = await patchService(await roleIdOf(B, 'LECTURE'))
      const supprime = await patchService(autreArchive.id)
      expect([etranger.statusCode, supprime.statusCode]).toEqual([400, 400])
      expect(
        (
          await testDb.serviceMembership.findUniqueOrThrow({
            where: { id: affectationId },
          })
        ).roleId,
      ).toBe(archive)
    })

    it('PATCH /membres/:id avec le role supprime deja tenu ne refuse rien', async () => {
      const res = await patchService(archive)
      expect(res.statusCode).toBe(200)
      expect(res.json().role).toEqual({ id: archive, name: 'Ancien tenu' })
    })

    it('l administration modifie ce membre sans toucher a son role supprime, mais refuse (400) d y basculer un autre', async () => {
      const garde = await t.app.inject({
        method: 'PATCH',
        url: adminUrl(E, `/members/${membershipId}`),
        cookies: admin,
        payload: {
          role: 'MEMBER',
          services: [{ serviceId: A, roleId: archive }],
        },
      })
      expect(garde.statusCode).toBe(200)
      expect(garde.json().serviceMemberships).toEqual([
        { serviceId: A, roleId: archive, soignantId: null },
      ])

      const autreArchive = await testDb.serviceRoleDef.create({
        data: {
          name: 'Encore supprime',
          permissions: [],
          archivedAt: new Date(),
          serviceId: A,
          establishmentId: E,
        },
      })
      const bascule = await t.app.inject({
        method: 'PATCH',
        url: adminUrl(E, `/members/${membershipId}`),
        cookies: admin,
        payload: { services: [{ serviceId: A, roleId: autreArchive.id }] },
      })
      expect(bascule.statusCode).toBe(400)
    })
  })

  it('GET /roles est refuse (403) a un role sans members:read', async () => {
    const agenda = await testDb.serviceRoleDef.create({
      data: {
        name: 'Agenda seul',
        permissions: ['agenda:read'],
        serviceId: A,
        establishmentId: E,
      },
    })
    await createUser({
      email: 'agenda@test.fr',
      memberships: [
        {
          establishmentId: E,
          services: [{ serviceId: A, role: 'LECTURE', roleId: agenda.id }],
        },
      ],
    })
    const res = await t.app.inject({
      method: 'GET',
      url: tenantUrl(E, A, '/roles'),
      cookies: await signIn(t.app, 'agenda@test.fr'),
    })
    expect(res.statusCode).toBe(403)
  })

  describe('gestion des roles (roles:manage)', () => {
    const roles = (
      method: 'POST' | 'PATCH' | 'DELETE',
      path: string,
      payload?: object,
    ) =>
      t.app.inject({
        method,
        url: tenantUrl(E, A, `/roles${path}`),
        cookies: admin,
        ...(payload && { payload }),
      })

    it('refuse (403) un coordinateur non administrateur', async () => {
      const res = await t.app.inject({
        method: 'POST',
        url: tenantUrl(E, A, '/roles'),
        cookies: coordA,
        payload: { name: 'Interdit', permissions: [] },
      })
      expect(res.statusCode).toBe(403)
    })

    it('refuse (400) une permission inconnue', async () => {
      const res = await roles('POST', '', {
        name: 'Inconnu',
        permissions: ['agenda:read', 'nimporte:quoi'],
      })
      expect(res.statusCode).toBe(400)
    })

    it('cree un role, permissions dedoublonnees et nom rogne', async () => {
      const soignant = await testDb.soignant.create({
        data: { name: 'Infirmiere', serviceId: A, establishmentId: E },
      })
      const res = await roles('POST', '', {
        name: '  Diététicien  ',
        permissions: ['patient:read', 'patient:read', 'agenda:read'],
        hiddenSoignantIds: [soignant.id],
      })
      expect(res.statusCode).toBe(201)
      const role = res.json() as RoleDto
      expect(role.name).toBe('Diététicien')
      expect([...role.permissions].sort()).toEqual([
        'agenda:read',
        'patient:read',
      ])
      expect(role.hiddenSoignantIds).toEqual([soignant.id])
      expect(role.preset).toBeNull()
      expect(role.memberCount).toBe(0)
    })

    it('refuse (409) un nom deja pris, sans tenir compte de la casse', async () => {
      const res = await roles('POST', '', {
        name: 'coordinateur',
        permissions: [],
      })
      expect(res.statusCode).toBe(409)
      expect(res.json().message).toBe(
        "Un rôle s'appelle déjà « coordinateur ».",
      )
      const renomme = await roles('PATCH', `/${await roleIdOf(A, 'LECTURE')}`, {
        name: 'INTERVENANT',
      })
      expect(renomme.statusCode).toBe(409)
    })

    it('refuse (400) un soignant masque d un autre service', async () => {
      const etranger = await testDb.soignant.create({
        data: { name: 'Etranger', serviceId: B, establishmentId: E },
      })
      const res = await roles('POST', '', {
        name: 'Masque etranger',
        permissions: [],
        hiddenSoignantIds: [etranger.id],
      })
      expect(res.statusCode).toBe(400)
    })

    it('remplace les soignants masques et journalise role.updated avec le nom', async () => {
      const s1 = await testDb.soignant.create({
        data: { name: 'S1', serviceId: A, establishmentId: E },
      })
      const s2 = await testDb.soignant.create({
        data: { name: 'S2', serviceId: A, establishmentId: E },
      })
      const cree = (
        await roles('POST', '', {
          name: 'Masquage',
          permissions: ['agenda:read'],
          hiddenSoignantIds: [s1.id],
        })
      ).json() as RoleDto
      const res = await roles('PATCH', `/${cree.id}`, {
        name: 'Masquage renommé',
        hiddenSoignantIds: [s2.id],
      })
      expect(res.statusCode).toBe(200)
      expect((res.json() as RoleDto).hiddenSoignantIds).toEqual([s2.id])
      expect((res.json() as RoleDto).permissions).toEqual(['agenda:read'])

      let ligne = null
      for (let essai = 0; essai < 40 && !ligne; essai += 1) {
        ligne = await testDb.activityLog.findFirst({
          where: { action: 'role.updated', entityID: cree.id },
        })
        if (!ligne) {
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
      }
      expect(ligne?.detail).toBe('Masquage renommé')
      expect(ligne?.serviceId).toBe(A)
    })

    it('refuse (409) de supprimer un role encore attribue', async () => {
      const res = await roles('DELETE', `/${await roleIdOf(A, 'COORDINATEUR')}`)
      expect(res.statusCode).toBe(409)
      expect(res.json().message).toBe('Rôle encore attribué à 1 membre(s)')
    })

    it('refuse (409) de supprimer le role par defaut d un soignant actif', async () => {
      const cree = (
        await roles('POST', '', { name: 'Par défaut', permissions: [] })
      ).json() as RoleDto
      await testDb.soignant.create({
        data: {
          name: 'Avec defaut',
          serviceId: A,
          establishmentId: E,
          defaultRoleId: cree.id,
        },
      })
      const res = await roles('DELETE', `/${cree.id}`)
      expect(res.statusCode).toBe(409)
      expect(res.json().message).toMatch(/par défaut/)
    })

    it('supprime puis restaure, et refuse (409) la restauration sur un nom repris', async () => {
      const premier = (
        await roles('POST', '', {
          name: 'Temporaire',
          permissions: ['agenda:read'],
        })
      ).json() as RoleDto
      expect((await roles('DELETE', `/${premier.id}`)).statusCode).toBe(204)
      const supprimes = await t.app.inject({
        method: 'GET',
        url: tenantUrl(E, A, '/roles?archived=true'),
        cookies: admin,
      })
      expect((supprimes.json() as RoleDto[]).map((r) => r.id)).toContain(
        premier.id,
      )

      const second = await roles('POST', '', {
        name: 'temporaire',
        permissions: [],
      })
      expect(second.statusCode).toBe(201)
      expect((await roles('POST', `/${premier.id}/restore`)).statusCode).toBe(
        409,
      )

      await roles('DELETE', `/${(second.json() as RoleDto).id}`)
      const restaure = await roles('POST', `/${premier.id}/restore`)
      expect(restaure.statusCode).toBe(200)
      expect((restaure.json() as RoleDto).archivedAt).toBeNull()
    })

    it('un role predefini se renomme comme un autre', async () => {
      const res = await roles('PATCH', `/${await roleIdOf(A, 'SECRETARIAT')}`, {
        name: 'Accueil',
      })
      expect(res.statusCode).toBe(200)
      expect((res.json() as RoleDto).preset).toBe('SECRETARIAT')
    })
  })
})
