import { buildTestApp, type TestApp } from './setup/app'
import { testDb, truncateAll } from './setup/db'
import {
  createEstablishment,
  createService,
  createUser,
  signIn,
  tenantUrl,
} from './setup/fixtures'

// Chaque modification du planning laisse une ligne au journal, avec de quoi la restaurer.
describe('journal du planning', () => {
  let t: TestApp
  let establishmentId: string
  let serviceId: string
  let cookies: { access_token: string }
  let templateId: string
  let slotTemplateId: string

  const url = (path: string) => tenantUrl(establishmentId, serviceId, path)

  // Journal en tire et oublie : on attend la ligne sans jamais rendre vert un journal vide.
  const ligne = async (action: string, entityID?: string) => {
    for (let essai = 0; essai < 40; essai += 1) {
      const lignes = await testDb.activityLog.findMany({
        where: { action, ...(entityID ? { entityID } : {}) },
        orderBy: { createdAt: 'desc' },
      })
      if (lignes.length > 0) {
        return lignes
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    return []
  }

  // Un créneau a son propre modèle de créneau (relation un à un).
  const creerCreneau = async (heure: number) => {
    const modele = await testDb.slotTemplate.create({
      data: {
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T10:00:00Z'),
        offsetDays: 0,
        isIndividual: true,
        color: '#fff',
        serviceId,
        establishmentId,
      },
    })
    return await testDb.slot.create({
      data: {
        startDate: new Date(Date.UTC(2026, 3, 1, heure)),
        endDate: new Date(Date.UTC(2026, 3, 1, heure + 1)),
        slotTemplateID: modele.id,
        serviceId,
        establishmentId,
      },
    })
  }

  const verifier = (
    l: { entityType: string; detail: string | null },
    entityType: string,
  ) => {
    expect(l.entityType).toBe(entityType)
    expect(l.detail).toBeTruthy()
  }

  beforeAll(async () => {
    await truncateAll()
    establishmentId = (await createEstablishment('E-PLAN-JOURNAL')).id
    serviceId = (await createService(establishmentId, 'S-PLAN-JOURNAL')).id
    await createUser({
      email: 'coord@planning-journal.fr',
      memberships: [
        {
          establishmentId,
          role: 'MEMBER',
          services: [{ serviceId, role: 'COORDINATEUR' }],
        },
      ],
    })
    templateId = (
      await testDb.pathwayTemplate.create({
        data: {
          name: 'Réadaptation',
          color: '#f00',
          mainTag: 'RI',
          secondaryTags: [],
          serviceId,
          establishmentId,
        },
      })
    ).id
    slotTemplateId = (
      await testDb.slotTemplate.create({
        data: {
          startTime: new Date('2026-04-01T09:00:00Z'),
          endTime: new Date('2026-04-01T10:00:00Z'),
          offsetDays: 0,
          isIndividual: true,
          color: '#fff',
          templateID: templateId,
          serviceId,
          establishmentId,
        },
      })
    ).id
    t = await buildTestApp()
    cookies = await signIn(t.app, 'coord@planning-journal.fr')
  })

  afterAll(async () => {
    await t.close()
    await testDb.$disconnect()
  })

  it('POST /slot : planning.created', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: url('/slot'),
      cookies,
      payload: {
        startDate: '2026-04-02T09:00:00.000Z',
        endDate: '2026-04-02T10:00:00.000Z',
        slotTemplateID: slotTemplateId,
      },
    })
    expect(res.statusCode).toBe(201)
    const [l] = await ligne(
      'planning.created',
      (res.json() as { id: string }).id,
    )
    verifier(l, 'slot')
  })

  it('PATCH /slot : updated, deleted (archivedAt), restored (archivedAt null)', async () => {
    const slot = await creerCreneau(11)
    const patch = (payload: object) =>
      t.app.inject({
        method: 'PATCH',
        url: url(`/slot/${slot.id}`),
        cookies,
        payload,
      })

    const modif = await patch({
      startDate: '2026-04-01T13:00:00.000Z',
      endDate: '2026-04-01T14:00:00.000Z',
    })
    expect(modif.statusCode).toBe(200)
    verifier((await ligne('planning.updated', slot.id))[0], 'slot')

    const archive = await patch({ archivedAt: '2026-10-08T10:00:00.000Z' })
    expect(archive.statusCode).toBe(200)
    verifier((await ligne('planning.deleted', slot.id))[0], 'slot')

    const restaure = await patch({ archivedAt: null })
    expect(restaure.statusCode).toBe(200)
    verifier((await ligne('planning.restored', slot.id))[0], 'slot')
  })

  it('DELETE /slot : planning.deleted, rien dans restoreData', async () => {
    const slot = await creerCreneau(15)
    const res = await t.app.inject({
      method: 'DELETE',
      url: url(`/slot/${slot.id}`),
      cookies,
    })
    expect(res.statusCode).toBeLessThan(300)
    const [l] = await ligne('planning.deleted', slot.id)
    verifier(l, 'slot')
    expect(l.restoreData).toBeNull()
  })

  it('parcours : instantiate une seule ligne, regenerate updated, delete avec restoreData', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: url('/pathway/instantiate'),
      cookies,
      payload: {
        pathwayTemplateID: templateId,
        startDate: '2026-06-01T00:00:00.000Z',
      },
    })
    expect(res.statusCode).toBe(200)
    const pathwayId = (res.json() as { id: string }).id
    verifier((await ligne('planning.created', pathwayId))[0], 'pathway')
    // Les créneaux clonés par instantiate n'écrivent rien : seul le POST /slot du premier test.
    expect(
      await testDb.activityLog.count({
        where: { action: 'planning.created', entityType: 'slot' },
      }),
    ).toBe(1)

    const regen = await t.app.inject({
      method: 'POST',
      url: url('/pathway/regenerate'),
      cookies,
      payload: {
        pathwayTemplateIDs: [templateId],
        fromDate: '2026-01-01T00:00:00.000Z',
      },
    })
    expect(regen.statusCode).toBe(200)
    verifier((await ligne('planning.updated', templateId))[0], 'pathway')

    const del = await t.app.inject({
      method: 'DELETE',
      url: url(`/pathway/${pathwayId}`),
      cookies,
    })
    expect(del.statusCode).toBe(204)
    const [deleted] = await ligne('planning.deleted', pathwayId)
    verifier(deleted, 'pathway')
    const data = deleted.restoreData as {
      pathway: { id: string }
      slotIds: string[]
    }
    expect(data.pathway.id).toBe(pathwayId)
    expect(data.slotIds.length).toBeGreaterThan(0)
  })

  it('semaine interdite : created puis deleted avec { startOfWeek }', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: url('/forbidden-week'),
      cookies,
      payload: { date: '2026-08-12T00:00:00.000Z' },
    })
    expect(res.statusCode).toBe(201)
    const id = (res.json() as { id: string }).id
    verifier((await ligne('planning.created', id))[0], 'forbiddenWeek')

    const del = await t.app.inject({
      method: 'DELETE',
      url: url(`/forbidden-week/${id}`),
      cookies,
    })
    expect(del.statusCode).toBe(204)
    const [l] = await ligne('planning.deleted', id)
    verifier(l, 'forbiddenWeek')
    expect(l.restoreData).toEqual({ startOfWeek: '2026-08-10' })
  })

  it('cycle : updated puis deleted avec { startOfWeek, weekCount }', async () => {
    const put = await t.app.inject({
      method: 'PUT',
      url: url('/planning-cycle'),
      cookies,
      payload: { startOfWeek: '2026-09-02T00:00:00.000Z', weekCount: 4 },
    })
    expect(put.statusCode).toBe(200)
    const [maj] = await ligne('planning.updated', serviceId)
    verifier(maj, 'planningCycle')

    const del = await t.app.inject({
      method: 'DELETE',
      url: url('/planning-cycle'),
      cookies,
    })
    expect(del.statusCode).toBe(204)
    const [l] = await ligne('planning.deleted', serviceId)
    verifier(l, 'planningCycle')
    expect(l.restoreData).toEqual({ startOfWeek: '2026-08-31', weekCount: 4 })
  })

  it('restoreData ne sort jamais par HTTP, restoredAt si', async () => {
    const res = await t.app.inject({
      method: 'GET',
      url: url('/activity-log'),
      cookies,
    })
    expect(res.statusCode).toBe(200)
    const { data } = res.json() as { data: Record<string, unknown>[] }
    expect(data.length).toBeGreaterThan(0)
    for (const l of data) {
      expect(l).not.toHaveProperty('restoreData')
      expect(l).toHaveProperty('restoredAt', null)
    }
  })
})
