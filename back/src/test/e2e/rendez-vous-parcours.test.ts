import { buildTestApp, type TestApp } from './setup/app'
import { testDb, truncateAll } from './setup/db'
import {
  createEstablishment,
  createService,
  createUser,
  signIn,
  tenantUrl,
} from './setup/fixtures'

describe('rendez-vous et parcours', () => {
  let testApp: TestApp
  let establishmentId: string
  let serviceId: string
  let cookies: { access_token: string }

  beforeAll(async () => {
    await truncateAll()
    establishmentId = (await createEstablishment('E-RDV-PARCOURS')).id
    serviceId = (await createService(establishmentId, 'S-RDV-PARCOURS')).id
    await createUser({
      email: 'coordinateur@rdv-parcours.fr',
      memberships: [
        {
          establishmentId,
          role: 'MEMBER',
          services: [{ serviceId, role: 'COORDINATEUR' }],
        },
      ],
    })
    testApp = await buildTestApp()
    cookies = await signIn(testApp.app, 'coordinateur@rdv-parcours.fr')
  })

  afterAll(async () => {
    await testApp.close()
    await testDb.$disconnect()
  })

  const creerRendezVous = async (pathwayID?: string) => {
    const scope = { serviceId, establishmentId }
    const slotTemplate = await testDb.slotTemplate.create({
      data: {
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T10:00:00Z'),
        offsetDays: 0,
        isIndividual: true,
        color: '#fff',
        ...scope,
      },
    })
    const slot = await testDb.slot.create({
      data: {
        startDate: new Date('2026-04-01T09:00:00Z'),
        endDate: new Date('2026-04-01T10:00:00Z'),
        slotTemplateID: slotTemplate.id,
        pathwayID,
        ...scope,
      },
    })
    return testDb.appointment.create({
      data: {
        startDate: new Date('2026-04-01T09:00:00Z'),
        endDate: new Date('2026-04-01T09:30:00Z'),
        slotID: slot.id,
        ...scope,
      },
    })
  }

  const lire = (id: string) =>
    testApp.app.inject({
      method: 'GET',
      url: tenantUrl(establishmentId, serviceId, `/appointment/${id}`),
      cookies,
    })

  it('renvoie le parcours du créneau', async () => {
    const template = await testDb.pathwayTemplate.create({
      data: {
        name: 'HDJ Insuffisance cardiaque',
        color: '#f00',
        mainTag: 'IC',
        secondaryTags: [],
        serviceId,
        establishmentId,
      },
    })
    const pathway = await testDb.pathway.create({
      data: {
        startDate: new Date('2026-04-01'),
        templateID: template.id,
        serviceId,
        establishmentId,
      },
    })
    const appointment = await creerRendezVous(pathway.id)

    const res = await lire(appointment.id)
    expect(res.statusCode).toBe(200)
    expect(res.json().slot.pathway.template.name).toBe(
      'HDJ Insuffisance cardiaque',
    )
  })

  it('reste lisible hors parcours', async () => {
    const appointment = await creerRendezVous()

    const res = await lire(appointment.id)
    expect(res.statusCode).toBe(200)
    expect(res.json().slot.pathway).toBeNull()
  })
})
