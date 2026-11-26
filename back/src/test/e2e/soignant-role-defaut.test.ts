import { buildTestApp, type TestApp } from './setup/app'
import { testDb, truncateAll } from './setup/db'
import {
  createEstablishment,
  createService,
  createUser,
  roleIdOf,
  signIn,
  tenantUrl,
} from './setup/fixtures'

describe('rôle par défaut du soignant', () => {
  let t: TestApp
  let E: string
  let A: string
  let B: string
  let coord: { access_token: string }
  let soignantId: string
  let coordRole: string
  let interRole: string

  beforeAll(async () => {
    t = await buildTestApp()
    await truncateAll()
    E = (await createEstablishment('CHU')).id
    A = (await createService(E, 'Cardiologie')).id
    B = (await createService(E, 'Pneumologie')).id
    coordRole = await roleIdOf(A, 'COORDINATEUR')
    interRole = await roleIdOf(A, 'INTERVENANT')
    soignantId = (
      await testDb.soignant.create({
        data: { name: 'IDE', serviceId: A, establishmentId: E },
      })
    ).id
    await createUser({
      email: 'coord@test.fr',
      memberships: [
        {
          establishmentId: E,
          services: [{ serviceId: A, role: 'COORDINATEUR', soignantId }],
        },
      ],
    })
    await createUser({
      email: 'inter@test.fr',
      memberships: [
        {
          establishmentId: E,
          services: [{ serviceId: A, role: 'INTERVENANT', soignantId }],
        },
      ],
    })
    coord = await signIn(t.app, 'coord@test.fr')
  })

  afterAll(async () => {
    await t.close()
    await testDb.$disconnect()
  })

  const patch = (defaultRoleId: string | null) =>
    t.app.inject({
      method: 'PATCH',
      url: tenantUrl(E, A, `/soignant/${soignantId}`),
      cookies: coord,
      payload: { defaultRoleId },
    })

  it('refuse le rôle d’un autre service', async () => {
    const res = await patch(await roleIdOf(B, 'INTERVENANT'))
    expect(res.statusCode).toBe(400)
  })

  it('pose le rôle par défaut sans toucher aux comptes et compte les écarts', async () => {
    const res = await patch(interRole)
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      defaultRoleId: interRole,
      membersWithOtherRole: 1,
    })
    const roles = await testDb.serviceMembership.findMany({
      where: { soignantId },
      select: { roleId: true },
    })
    expect(roles.map((r) => r.roleId).sort()).toEqual(
      [coordRole, interRole].sort(),
    )
  })

  it('rend 0 sans rôle par défaut', async () => {
    const res = await patch(null)
    expect(res.json()).toMatchObject({
      defaultRoleId: null,
      membersWithOtherRole: 0,
    })
  })

  it('expose defaultRoleId en lecture', async () => {
    await patch(coordRole)
    const res = await t.app.inject({
      method: 'GET',
      url: tenantUrl(E, A, '/soignant'),
      cookies: coord,
    })
    expect(res.json()[0].defaultRoleId).toBe(coordRole)
  })
})
