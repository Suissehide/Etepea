import { buildTestApp, type TestApp } from './setup/app'
import { testDb, truncateAll } from './setup/db'
import {
  createEstablishment,
  createService,
  createUser,
  signIn,
  tenantUrl,
} from './setup/fixtures'

const MARDI_SEANCE = ['2027-01-05T09:45:00.000Z', '2027-01-05T11:00:00.000Z']
const MERCREDI_SEANCE = ['2027-01-06T09:45:00.000Z', '2027-01-06T11:00:00.000Z']
const MARDI_APREM = ['2027-01-05T13:30:00.000Z', '2027-01-05T14:15:00.000Z']
const MERCREDI_COLLE = ['2027-01-06T11:00:00.000Z', '2027-01-06T11:45:00.000Z']
const MOTIF = (tag: string) =>
  `Échec d'inscription à traiter à la main : aucun créneau sans trou pour "${tag}"`

// Un optionnel ne se pose pas sur un créneau qui laisse un trou dans la journée du patient.
describe('créneaux sans trou', () => {
  let testApp: TestApp
  let establishmentId: string
  let serviceId: string
  let cookies: { access_token: string }

  const inject = (path: string, payload: unknown) =>
    testApp.app.inject({
      method: 'POST',
      url: tenantUrl(establishmentId, serviceId, path),
      cookies,
      payload: payload as never,
    })

  const createTemplate = (
    mainTag: string,
    flags: { optional?: boolean; firstAppointmentOnly?: boolean } = {},
  ) =>
    testDb.pathwayTemplate.create({
      data: {
        name: mainTag,
        color: '#123456',
        mainTag,
        secondaryTags: [],
        serviceId,
        establishmentId,
        ...flags,
      },
    })

  // Un cycle par appel, avec les créneaux donnés.
  const createCycle = async (
    templateID: string,
    isIndividual: boolean,
    ...slots: string[][]
  ) => {
    const pathway = await testDb.pathway.create({
      data: {
        startDate: new Date(slots[0]?.[0] ?? ''),
        templateID,
        serviceId,
        establishmentId,
      },
    })
    for (const [start, end] of slots) {
      const startDate = new Date(start ?? '')
      const endDate = new Date(end ?? '')
      const slotTemplate = await testDb.slotTemplate.create({
        data: {
          startTime: startDate,
          endTime: endDate,
          offsetDays: 0,
          isIndividual,
          capacity: isIndividual ? undefined : 10,
          color: '#fff',
          templateID,
          serviceId,
          establishmentId,
        },
      })
      await testDb.slot.create({
        data: {
          startDate,
          endDate,
          pathwayID: pathway.id,
          slotTemplateID: slotTemplate.id,
          serviceId,
          establishmentId,
        },
      })
    }
  }

  // Principal le mardi et le mercredi matin, consultation le mardi après-midi et, au choix, collée le mercredi.
  const scenario = async (
    prefix: string,
    { mercredi = true, optional = true } = {},
  ) => {
    const principal = await createTemplate(`${prefix}-PRINCIPAL`)
    await createCycle(principal.id, false, MARDI_SEANCE, MERCREDI_SEANCE)
    const consultation = await createTemplate(`${prefix}-CONSULT`, {
      optional,
      firstAppointmentOnly: true,
    })
    await createCycle(consultation.id, true, MARDI_APREM)
    if (mercredi) {
      await createCycle(consultation.id, true, MERCREDI_COLLE)
    }
    return {
      principal: { tag: `${prefix}-PRINCIPAL`, timeOfDay: 'ALL_DAY' },
      consultation: {
        tag: `${prefix}-CONSULT`,
        timeOfDay: 'ALL_DAY',
        duration: 45,
      },
    }
  }

  const newPatient = async (lastName: string) => {
    const res = await inject('/patient', { firstName: 'Trou', lastName })
    return res.json().id as string
  }

  const enroll = (patientID: string, pathways: unknown[], extra = {}) =>
    inject(`/patient/${patientID}/enroll`, { patientID, pathways, ...extra })

  const startOf = (res: { json: () => any }, index = 0) =>
    res.json().enrollments[index]?.appointments[0]?.startDate

  beforeAll(async () => {
    await truncateAll()
    establishmentId = (await createEstablishment('E-TROUS')).id
    serviceId = (await createService(establishmentId, 'S-TROUS')).id
    await createUser({
      email: 'coordinateur@trous.fr',
      memberships: [
        {
          establishmentId,
          role: 'MEMBER',
          services: [{ serviceId, role: 'COORDINATEUR' }],
        },
      ],
    })
    testApp = await buildTestApp()
    cookies = await signIn(testApp.app, 'coordinateur@trous.fr')
  })

  afterAll(async () => {
    await testApp.close()
    await testDb.$disconnect()
  })

  it('préfère le créneau collé à un rendez-vous au créneau le plus tôt', async () => {
    const { principal, consultation } = await scenario('A')
    const patientID = await newPatient('Colle')
    await enroll(patientID, [principal])

    const preview = await inject('/patient/enroll/preview', {
      patientID,
      pathways: [consultation],
    })
    expect(preview.json()[0].startDate).toBe(MERCREDI_COLLE[0])

    const res = await enroll(patientID, [consultation])
    expect(res.json().failedEnrollments).toEqual([])
    expect(startOf(res)).toBe(MERCREDI_COLLE[0])
  })

  it("échoue quand il ne reste qu'un créneau à trou, à l'aperçu comme à l'inscription", async () => {
    const { principal, consultation } = await scenario('B', { mercredi: false })
    const patientID = await newPatient('Echec')
    await enroll(patientID, [principal])

    const preview = await inject('/patient/enroll/preview', {
      patientID,
      pathways: [consultation],
    })
    expect(preview.json()[0]).toMatchObject({
      startDate: null,
      reason: MOTIF('B-CONSULT'),
    })

    const res = await enroll(patientID, [consultation])
    expect(res.json().enrollments).toEqual([])
    expect(res.json().failedEnrollments[0].reason).toBe(MOTIF('B-CONSULT'))
    expect(
      await testDb.enrollmentIssue.count({
        where: { reason: MOTIF('B-CONSULT') },
      }),
    ).toBe(1)
  })

  it("prend le plus tôt quand l'option est cochée", async () => {
    const { principal, consultation } = await scenario('C')
    const patientID = await newPatient('Option')
    await enroll(patientID, [principal])

    const preview = await inject('/patient/enroll/preview', {
      patientID,
      pathways: [consultation],
      optionalsAllowGaps: true,
    })
    expect(preview.json()[0].startDate).toBe(MARDI_APREM[0])

    const res = await enroll(patientID, [consultation], {
      optionalsAllowGaps: true,
    })
    expect(startOf(res)).toBe(MARDI_APREM[0])
  })

  it('voit les rendez-vous du principal demandé dans la même requête', async () => {
    const { principal, consultation } = await scenario('D')
    const pathways = [principal, consultation]

    const preview = await inject('/patient/enroll/preview', { pathways })
    expect(preview.json()[1].startDate).toBe(MERCREDI_COLLE[0])

    const res = await enroll(await newPatient('Ensemble'), pathways)
    expect(res.json().failedEnrollments).toEqual([])
    expect(startOf(res, 1)).toBe(MERCREDI_COLLE[0])
  })

  it('prend le plus tôt pour un patient sans rendez-vous', async () => {
    const { consultation } = await scenario('E')
    const res = await enroll(await newPatient('Libre'), [consultation])
    expect(startOf(res)).toBe(MARDI_APREM[0])
  })

  it('laisse un parcours principal se placer au plus tôt, même avec un trou', async () => {
    const { principal, consultation } = await scenario('F', {
      optional: false,
    })
    const patientID = await newPatient('Principal')
    await enroll(patientID, [principal])
    const res = await enroll(patientID, [consultation])
    expect(startOf(res)).toBe(MARDI_APREM[0])
  })
})
