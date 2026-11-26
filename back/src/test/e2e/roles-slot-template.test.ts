import { buildTestApp, type TestApp } from './setup/app'
import { testDb, truncateAll } from './setup/db'
import {
  createEstablishment,
  createService,
  createUser,
  signIn,
  tenantUrl,
} from './setup/fixtures'

type Cookies = { access_token: string }

describe('creneaux de parcours theoriques : pathway-templates:write', () => {
  let t: TestApp
  let E: string
  let S: string
  let coord: Cookies
  let planner: Cookies
  let templateId: string
  let slotId: string

  const payload = {
    startTime: '2026-11-02T09:00:00.000Z',
    endTime: '2026-11-02T10:00:00.000Z',
    offsetDays: 0,
    color: '#123456',
    isIndividual: false,
    soignantIDs: [],
  }

  beforeAll(async () => {
    await truncateAll()
    E = (await createEstablishment('E-SLOT-TPL')).id
    S = (await createService(E, 'S-SLOT-TPL')).id
    const role = await testDb.serviceRoleDef.create({
      data: {
        establishmentId: E,
        serviceId: S,
        name: 'Planificateur',
        permissions: ['planning:read', 'planning:write'],
      },
    })
    await createUser({
      email: 'coord@slot-tpl.fr',
      memberships: [
        {
          establishmentId: E,
          services: [{ serviceId: S, role: 'COORDINATEUR' }],
        },
      ],
    })
    await createUser({
      email: 'planner@slot-tpl.fr',
      memberships: [
        {
          establishmentId: E,
          services: [{ serviceId: S, role: 'INTERVENANT', roleId: role.id }],
        },
      ],
    })
    const template = await testDb.slotTemplate.create({
      data: {
        startTime: new Date(payload.startTime),
        endTime: new Date(payload.endTime),
        offsetDays: 0,
        isIndividual: false,
        color: '#fff',
        serviceId: S,
        establishmentId: E,
      },
    })
    templateId = template.id
    const slot = await testDb.slot.create({
      data: {
        startDate: new Date('2026-11-02T09:00:00Z'),
        endDate: new Date('2026-11-02T10:00:00Z'),
        slotTemplateID: templateId,
        serviceId: S,
        establishmentId: E,
      },
    })
    slotId = slot.id
    t = await buildTestApp()
    coord = await signIn(t.app, 'coord@slot-tpl.fr')
    planner = await signIn(t.app, 'planner@slot-tpl.fr')
  })

  afterAll(async () => {
    await t.close()
    await testDb.$disconnect()
  })

  const call = (
    cookies: Cookies,
    method: 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: object,
  ) =>
    t.app.inject({
      method,
      url: tenantUrl(E, S, path),
      cookies,
      payload: body as never,
    })

  it('sans pathway-templates:write : POST, PATCH et DELETE refuses', async () => {
    const post = await call(planner, 'POST', '/slot-template', payload)
    const patch = await call(planner, 'PATCH', `/slot-template/${templateId}`, {
      color: '#000',
    })
    const del = await call(planner, 'DELETE', `/slot-template/${templateId}`)
    expect([post.statusCode, patch.statusCode, del.statusCode]).toEqual([
      403, 403, 403,
    ])
  })

  it('le meme membre peut toujours modifier un creneau', async () => {
    const res = await call(planner, 'PATCH', `/slot/${slotId}`, {
      archivedAt: null,
    })
    expect(res.statusCode).toBe(200)
  })

  it('un coordinateur peut creer un creneau de parcours theorique', async () => {
    const res = await call(coord, 'POST', '/slot-template', payload)
    expect(res.statusCode).toBe(201)
  })
})
