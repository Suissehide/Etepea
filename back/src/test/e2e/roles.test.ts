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
})
