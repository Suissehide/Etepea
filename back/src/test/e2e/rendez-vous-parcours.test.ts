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

  describe("durée du rendez-vous individuel à l'inscription", () => {
    const scope = () => ({ serviceId, establishmentId })
    const post = (path: string, payload: unknown) =>
      testApp.app.inject({
        method: 'POST',
        url: tenantUrl(establishmentId, serviceId, path),
        cookies,
        payload: payload as never,
      })

    // Un parcours d'un créneau individuel de 2 h dont la thématique dure `duration` minutes.
    const creerParcours = async (tag: string, duration: number | null) => {
      const thematic = await testDb.thematic.create({
        data: { name: `Thématique ${tag}`, duration, ...scope() },
      })
      const template = await testDb.pathwayTemplate.create({
        data: {
          name: tag,
          color: '#f00',
          mainTag: tag,
          secondaryTags: [],
          ...scope(),
        },
      })
      const slotTemplate = await testDb.slotTemplate.create({
        data: {
          startTime: new Date('2027-06-01T09:00:00Z'),
          endTime: new Date('2027-06-01T11:00:00Z'),
          offsetDays: 0,
          isIndividual: true,
          color: '#fff',
          templateID: template.id,
          thematicId: thematic.id,
          ...scope(),
        },
      })
      const pathway = await testDb.pathway.create({
        data: {
          startDate: new Date('2027-06-01'),
          templateID: template.id,
          ...scope(),
        },
      })
      await testDb.slot.create({
        data: {
          startDate: new Date('2027-06-01T09:00:00Z'),
          endDate: new Date('2027-06-01T11:00:00Z'),
          slotTemplateID: slotTemplate.id,
          pathwayID: pathway.id,
          ...scope(),
        },
      })
    }

    const inscrire = async (
      lastName: string,
      enrollment: Record<string, unknown>,
    ) => {
      const created = await post('/patient', { firstName: 'Ada', lastName })
      const patientId = created.json().id as string
      const res = await post(`/patient/${patientId}/enroll`, {
        patientID: patientId,
        startDate: '2027-05-01T00:00:00.000Z',
        pathways: [{ timeOfDay: 'ALL_DAY', ...enrollment }],
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().failedEnrollments).toEqual([])
      const [appointment] = await testDb.appointment.findMany({
        where: { appointmentPatients: { some: { patientId } } },
      })
      return appointment
    }

    const minutes = (a: { startDate: Date; endDate: Date }) =>
      (a.endDate.getTime() - a.startDate.getTime()) / 60000

    it('prend la durée de la thématique du créneau, et cale le suivant derrière', async () => {
      await creerParcours('DUREE-60', 60)
      const premier = await inscrire('Premier', { tag: 'DUREE-60' })
      expect(minutes(premier)).toBe(60)
      const second = await inscrire('Second', { tag: 'DUREE-60' })
      expect(second.startDate).toEqual(new Date('2027-06-01T10:00:00Z'))
      expect(minutes(second)).toBe(60)
    })

    it('laisse la durée saisie au formulaire l emporter', async () => {
      await creerParcours('DUREE-SAISIE', 60)
      const appointment = await inscrire('Saisie', {
        tag: 'DUREE-SAISIE',
        duration: 45,
      })
      expect(minutes(appointment)).toBe(45)
    })

    it('retombe sur 30 minutes sans durée de thématique', async () => {
      await creerParcours('DUREE-DEFAUT', null)
      const appointment = await inscrire('Defaut', { tag: 'DUREE-DEFAUT' })
      expect(minutes(appointment)).toBe(30)
    })
  })

  it('reste lisible hors parcours', async () => {
    const appointment = await creerRendezVous()

    const res = await lire(appointment.id)
    expect(res.statusCode).toBe(200)
    expect(res.json().slot.pathway).toBeNull()
  })
})
