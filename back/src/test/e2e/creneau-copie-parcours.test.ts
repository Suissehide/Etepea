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

// Dupliquer un créneau : la copie reste dans le parcours de l'original.
describe('copie d un creneau', () => {
  let testApp: TestApp
  let establishmentId: string
  let serviceId: string
  let autreServiceId: string
  let pathwayId: string
  let cookies: Cookies

  const creerCreneau = async (service: string, pathwayID?: string) => {
    const slotTemplate = await testDb.slotTemplate.create({
      data: {
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T10:00:00Z'),
        offsetDays: 0,
        isIndividual: true,
        color: '#fff',
        serviceId: service,
        establishmentId,
      },
    })
    return testDb.slot.create({
      data: {
        startDate: new Date('2026-04-01T09:00:00Z'),
        endDate: new Date('2026-04-01T10:00:00Z'),
        slotTemplateID: slotTemplate.id,
        pathwayID,
        serviceId: service,
        establishmentId,
      },
    })
  }

  const copier = (copiedFromSlotID?: string, extra: object = {}) =>
    testApp.app.inject({
      method: 'POST',
      url: tenantUrl(establishmentId, serviceId, '/slot'),
      cookies,
      payload: {
        startDate: '2026-04-08T09:00:00.000Z',
        endDate: '2026-04-08T10:00:00.000Z',
        copiedFromSlotID,
        slotTemplate: {
          startTime: '2026-04-08T09:00:00.000Z',
          endTime: '2026-04-08T10:00:00.000Z',
          offsetDays: 0,
          color: '#fff',
          isIndividual: true,
          capacity: 1,
          soignantIDs: [],
        },
        ...extra,
      },
    })

  beforeAll(async () => {
    await truncateAll()
    const establishment = await createEstablishment('E-SLOT-COPIE')
    establishmentId = establishment.id
    serviceId = (await createService(establishmentId, 'S-SLOT-COPIE')).id
    autreServiceId = (await createService(establishmentId, 'S-SLOT-AUTRE')).id

    const template = await testDb.pathwayTemplate.create({
      data: {
        name: 'Réadaptation',
        color: '#f00',
        mainTag: 'RI',
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
    pathwayId = pathway.id

    await createUser({
      email: 'coordinateur@slot-copie.fr',
      memberships: [
        {
          establishmentId,
          role: 'MEMBER',
          services: [{ serviceId, role: 'COORDINATEUR' }],
        },
      ],
    })

    testApp = await buildTestApp()
    cookies = await signIn(testApp.app, 'coordinateur@slot-copie.fr')
  })

  afterAll(async () => {
    await testApp.close()
    await testDb.$disconnect()
  })

  it('la copie herite du parcours de l original', async () => {
    const original = await creerCreneau(serviceId, pathwayId)

    const res = await copier(original.id)

    expect(res.statusCode).toBe(201)
    expect(res.json().pathway.id).toBe(pathwayId)
  })

  it('la copie d un creneau hors parcours reste hors parcours', async () => {
    const original = await creerCreneau(serviceId)

    const res = await copier(original.id)

    expect(res.statusCode).toBe(201)
    expect(res.json().pathway).toBeNull()
  })

  it('un pathwayID envoye dans le corps ne rattache toujours rien', async () => {
    const res = await copier(undefined, { pathwayID: pathwayId })

    expect(res.json().pathway ?? null).toBeNull()
  })

  it('refuse de copier le creneau d un autre service, sans rien creer', async () => {
    const etranger = await creerCreneau(autreServiceId)
    const avant = await testDb.slot.count()

    const res = await copier(etranger.id)

    expect(res.statusCode).toBe(404)
    expect(await testDb.slot.count()).toBe(avant)
  })
})
