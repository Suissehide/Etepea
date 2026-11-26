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

// Restaurer une suppression du planning depuis sa ligne de journal.
describe('restauration du planning', () => {
  let t: TestApp
  let E: string
  let A: string
  let B: string
  let coord: Cookies
  let lecteur: Cookies

  const url = (path: string, service = A) => tenantUrl(E, service, path)

  const ligne = async (action: string, entityID: string) => {
    for (let essai = 0; essai < 40; essai += 1) {
      const l = await testDb.activityLog.findFirst({
        where: { action, entityID },
        orderBy: { createdAt: 'desc' },
      })
      if (l) {
        return l
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    throw new Error(`pas de ligne ${action} pour ${entityID}`)
  }

  const restaurer = (id: string, cookies = coord, service = A) =>
    t.app.inject({
      method: 'POST',
      url: url(`/planning/restore/${id}`, service),
      cookies,
    })

  const supprimer = (path: string) =>
    t.app.inject({ method: 'DELETE', url: url(path), cookies: coord })

  const creerCreneau = async (pathwayID?: string, jour = 1) => {
    const modele = await testDb.slotTemplate.create({
      data: {
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T10:00:00Z'),
        offsetDays: 0,
        isIndividual: true,
        color: '#fff',
        serviceId: A,
        establishmentId: E,
      },
    })
    return await testDb.slot.create({
      data: {
        startDate: new Date(Date.UTC(2026, 3, jour, 9)),
        endDate: new Date(Date.UTC(2026, 3, jour, 10)),
        slotTemplateID: modele.id,
        pathwayID,
        serviceId: A,
        establishmentId: E,
      },
    })
  }

  beforeAll(async () => {
    t = await buildTestApp()
    await truncateAll()
    E = (await createEstablishment('E-PLAN-RESTORE')).id
    A = (await createService(E, 'S-PLAN-RESTORE')).id
    B = (await createService(E, 'S-PLAN-RESTORE-B')).id
    await createUser({
      email: 'coord@restore.fr',
      memberships: [
        {
          establishmentId: E,
          role: 'MEMBER',
          services: [
            { serviceId: A, role: 'COORDINATEUR' },
            { serviceId: B, role: 'COORDINATEUR' },
          ],
        },
      ],
    })
    await createUser({
      email: 'lecteur@restore.fr',
      memberships: [
        {
          establishmentId: E,
          role: 'MEMBER',
          services: [{ serviceId: A, role: 'LECTURE' }],
        },
      ],
    })
    coord = await signIn(t.app, 'coord@restore.fr')
    lecteur = await signIn(t.app, 'lecteur@restore.fr')
  })

  afterAll(async () => {
    await t.close()
    await testDb.$disconnect()
  })

  it('créneau : désarchivé, ligne restaurée, restauration journalisée', async () => {
    const slot = await creerCreneau()
    expect((await supprimer(`/slot/${slot.id}`)).statusCode).toBe(204)
    const log = await ligne('planning.deleted', slot.id)

    const res = await restaurer(log.id)

    expect(res.statusCode).toBe(204)
    expect(
      (await testDb.slot.findUnique({ where: { id: slot.id } }))?.archivedAt,
    ).toBeNull()
    expect(
      (await testDb.activityLog.findUnique({ where: { id: log.id } }))
        ?.restoredAt,
    ).toBeInstanceOf(Date)
    await ligne('planning.restored', slot.id)
  })

  it('créneau disparu entre-temps : 404 et la ligne reste restaurable', async () => {
    const slot = await creerCreneau()
    await supprimer(`/slot/${slot.id}`)
    const log = await ligne('planning.deleted', slot.id)
    await testDb.slot.delete({ where: { id: slot.id } })

    const res = await restaurer(log.id)

    expect(res.statusCode).toBe(404)
    expect(res.json().message).toBe("Ce créneau n'existe plus")
    expect(
      (await testDb.activityLog.findUnique({ where: { id: log.id } }))
        ?.restoredAt,
    ).toBeNull()
  })

  it('parcours : même id, créneaux rattachés et désarchivés, priorités recréées', async () => {
    const patient = await testDb.patient.create({
      data: {
        firstName: 'Paul',
        lastName: 'Restore',
        establishmentId: E,
        createDate: new Date(),
      },
    })
    const parti = await testDb.patient.create({
      data: {
        firstName: 'Parti',
        lastName: 'Restore',
        establishmentId: E,
        createDate: new Date(),
      },
    })
    const pathway = await testDb.pathway.create({
      data: {
        startDate: new Date('2026-04-01'),
        establishmentId: E,
        serviceId: A,
      },
    })
    const slot = await creerCreneau(pathway.id, 2)
    for (const [p, priority] of [
      [patient.id, 1],
      [parti.id, 2],
    ] as const) {
      await testDb.patientPathwayPriority.create({
        data: {
          patientID: p,
          pathwayID: pathway.id,
          priority,
          establishmentId: E,
          serviceId: A,
        },
      })
    }
    expect((await supprimer(`/pathway/${pathway.id}`)).statusCode).toBe(204)
    const log = await ligne('planning.deleted', pathway.id)
    await testDb.patient.delete({ where: { id: parti.id } })

    const res = await restaurer(log.id)

    expect(res.statusCode).toBe(204)
    const retrouve = await testDb.pathway.findUnique({
      where: { id: pathway.id },
    })
    expect(retrouve?.startDate.toISOString().slice(0, 10)).toBe('2026-04-01')
    const s = await testDb.slot.findUnique({ where: { id: slot.id } })
    expect(s?.pathwayID).toBe(pathway.id)
    expect(s?.archivedAt).toBeNull()
    const priorites = await testDb.patientPathwayPriority.findMany({
      where: { pathwayID: pathway.id },
    })
    expect(priorites.map((p) => p.patientID)).toEqual([patient.id])
    await ligne('planning.restored', pathway.id)
  })

  it('semaine interdite : recréée ; déjà recréée, 409 et ligne non consommée', async () => {
    const creer = (date: string) =>
      t.app.inject({
        method: 'POST',
        url: url('/forbidden-week'),
        cookies: coord,
        payload: { date },
      })
    const w1 = (await creer('2026-07-06')).json().id as string
    await supprimer(`/forbidden-week/${w1}`)
    const log1 = await ligne('planning.deleted', w1)

    expect((await restaurer(log1.id)).statusCode).toBe(204)
    expect(
      await testDb.forbiddenWeek.count({
        where: { serviceId: A, startOfWeek: new Date('2026-07-06') },
      }),
    ).toBe(1)

    const w2 = (await creer('2026-07-13')).json().id as string
    await supprimer(`/forbidden-week/${w2}`)
    const log2 = await ligne('planning.deleted', w2)
    await creer('2026-07-13')

    const res = await restaurer(log2.id)

    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('Cette semaine est déjà interdite')
    expect(
      (await testDb.activityLog.findUnique({ where: { id: log2.id } }))
        ?.restoredAt,
    ).toBeNull()
  })

  it('cycle : rétabli ; un autre cycle enregistré depuis, 409', async () => {
    const put = (startOfWeek: string, weekCount: number) =>
      t.app.inject({
        method: 'PUT',
        url: url('/planning-cycle'),
        cookies: coord,
        payload: { startOfWeek, weekCount },
      })
    await put('2026-01-05', 4)
    await supprimer('/planning-cycle')
    const log = await ligne('planning.deleted', A)

    expect((await restaurer(log.id)).statusCode).toBe(204)
    const cycle = await testDb.planningCycle.findFirst({
      where: { serviceId: A },
    })
    expect(cycle?.weekCount).toBe(4)
    expect(cycle?.startOfWeek.toISOString().slice(0, 10)).toBe('2026-01-05')

    await supprimer('/planning-cycle')
    let log2: { id: string } | null = null
    for (let essai = 0; essai < 40 && !log2; essai += 1) {
      log2 = await testDb.activityLog.findFirst({
        where: { action: 'planning.deleted', entityID: A, restoredAt: null },
      })
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    await put('2026-02-02', 6)

    const res = await restaurer(log2?.id ?? '')

    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('Un autre cycle a été enregistré depuis')
  })

  it('deuxième restauration : 409 ; deux appels simultanés : un 204, un 409', async () => {
    const s1 = await creerCreneau(undefined, 3)
    await supprimer(`/slot/${s1.id}`)
    const l1 = await ligne('planning.deleted', s1.id)
    expect((await restaurer(l1.id)).statusCode).toBe(204)
    const deux = await restaurer(l1.id)
    expect(deux.statusCode).toBe(409)
    expect(deux.json().message).toBe('Cette suppression a déjà été restaurée')

    const s2 = await creerCreneau(undefined, 4)
    await supprimer(`/slot/${s2.id}`)
    const l2 = await ligne('planning.deleted', s2.id)
    const codes = (await Promise.all([restaurer(l2.id), restaurer(l2.id)])).map(
      (r) => r.statusCode,
    )
    expect(codes.sort()).toEqual([204, 409])
  })

  it("ligne d'un autre service ou ligne planning.updated : 404", async () => {
    const slot = await creerCreneau(undefined, 5)
    await supprimer(`/slot/${slot.id}`)
    const log = await ligne('planning.deleted', slot.id)
    expect((await restaurer(log.id, coord, B)).statusCode).toBe(404)

    const maj = await testDb.activityLog.create({
      data: {
        establishmentId: E,
        serviceId: A,
        userID: 'u',
        action: 'planning.updated',
        entityType: 'slot',
        entityID: slot.id,
      },
    })
    expect((await restaurer(maj.id)).statusCode).toBe(404)
  })

  it('sans planning:write : 403', async () => {
    expect((await restaurer('x', lecteur)).statusCode).toBe(403)
  })
})
