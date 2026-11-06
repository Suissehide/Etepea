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

// Un parcours B qui dépend de A ne commence qu'après le dernier rendez-vous du patient en A.
describe('parcours prérequis', () => {
  let testApp: TestApp
  let establishmentId: string
  let serviceId: string
  let cookies: Cookies

  const inject = (method: 'POST' | 'PATCH', path: string, payload: unknown) =>
    testApp.app.inject({
      method,
      url: tenantUrl(establishmentId, serviceId, path),
      cookies,
      payload: payload as never,
    })

  const createTemplate = async (
    mainTag: string,
    prerequisiteIDs: string[],
    optional = false,
  ) => {
    const res = await inject('POST', '/pathway-template', {
      name: mainTag,
      color: '#123456',
      mainTag,
      slotTemplateIDs: [],
      prerequisiteIDs,
      optional,
    })
    expect(res.statusCode).toBe(201)
    return res.json().id as string
  }

  // Une instance de parcours d'un seul créneau collectif.
  const createPathway = async (
    templateID: string,
    start: string,
    closed: { locked?: boolean; archivedAt?: Date } = {},
  ) => {
    const startDate = new Date(start)
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
    const slotTemplate = await testDb.slotTemplate.create({
      data: {
        startTime: startDate,
        endTime: endDate,
        offsetDays: 0,
        isIndividual: false,
        capacity: 10,
        color: '#fff',
        templateID,
        serviceId,
        establishmentId,
      },
    })
    const pathway = await testDb.pathway.create({
      data: { startDate, templateID, serviceId, establishmentId },
    })
    await testDb.slot.create({
      data: {
        startDate,
        endDate,
        pathwayID: pathway.id,
        slotTemplateID: slotTemplate.id,
        serviceId,
        establishmentId,
        ...closed,
      },
    })
    return pathway.id
  }

  beforeAll(async () => {
    await truncateAll()
    const establishment = await createEstablishment('E-PREREQUIS')
    establishmentId = establishment.id
    const service = await createService(establishmentId, 'S-PREREQUIS')
    serviceId = service.id
    await createUser({
      email: 'coordinateur@prerequis.fr',
      memberships: [
        {
          establishmentId,
          role: 'MEMBER',
          services: [{ serviceId, role: 'COORDINATEUR' }],
        },
      ],
    })
    testApp = await buildTestApp()
    cookies = await signIn(testApp.app, 'coordinateur@prerequis.fr')
  })

  afterAll(async () => {
    await testApp.close()
    await testDb.$disconnect()
  })

  it('duplique un parcours avec ses créneaux modèles et leurs soignants', async () => {
    const a = await createTemplate('DUP-A', [])
    const b = await createTemplate('DUP-B', [a])
    const soignant = await testDb.soignant.create({
      data: { name: 'IDE', serviceId, establishmentId },
    })
    await testDb.slotTemplate.create({
      data: {
        startTime: new Date('1970-01-01T09:00:00.000Z'),
        endTime: new Date('1970-01-01T10:00:00.000Z'),
        offsetDays: 2,
        isIndividual: false,
        capacity: 8,
        color: '#123456',
        templateID: b,
        serviceId,
        establishmentId,
        soignantLinks: { create: { soignantId: soignant.id, establishmentId } },
      },
    })

    const res = await inject('POST', `/pathway-template/${b}/duplicate`, {})
    expect(res.statusCode).toBe(201)
    const copy = res.json()
    expect(copy.id).not.toBe(b)
    expect(copy.name).toBe('DUP-B (copie)')
    expect(copy.prerequisiteIDs).toEqual([a])
    expect(copy.slotTemplates).toHaveLength(1)
    expect(copy.slotTemplates[0]).toMatchObject({
      offsetDays: 2,
      capacity: 8,
      soignants: [{ id: soignant.id }],
    })
    expect(await testDb.slotTemplate.count({ where: { templateID: b } })).toBe(
      1,
    )
  })

  it('refuse une dépendance circulaire', async () => {
    const a = await createTemplate('CYCLE-A', [])
    const b = await createTemplate('CYCLE-B', [a])
    const res = await inject('PATCH', `/pathway-template/${a}`, {
      prerequisiteIDs: [b],
    })
    expect(res.statusCode).toBe(400)
  })

  it('inscrit B sur la première instance qui commence après la fin de A', async () => {
    const a = await createTemplate('PRE-A', [])
    const b = await createTemplate('PRE-B', [a])
    await createPathway(a, '2026-11-10T09:00:00.000Z')
    await createPathway(b, '2026-11-02T09:00:00.000Z')
    const bAfterA = await createPathway(b, '2026-11-17T09:00:00.000Z')

    const created = await inject('POST', '/patient', {
      firstName: 'Ada',
      lastName: 'Lovelace',
    })
    const patientId = created.json().id as string

    // B est demandé avant A : l'ordre des prérequis l'emporte.
    const res = await inject('POST', `/patient/${patientId}/enroll`, {
      patientID: patientId,
      startDate: '2026-11-01T00:00:00.000Z',
      pathways: [
        { tag: 'PRE-B', timeOfDay: 'ALL_DAY' },
        { tag: 'PRE-A', timeOfDay: 'ALL_DAY' },
      ],
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().failedEnrollments).toEqual([])

    const pathwaysOfB = await testDb.appointment.findMany({
      where: {
        appointmentPatients: { some: { patientId } },
        slot: { pathway: { templateID: b } },
      },
      select: { slot: { select: { pathwayID: true } } },
    })
    expect(pathwaysOfB.map((apt) => apt.slot.pathwayID)).toEqual([bAfterA])
  })

  it('donne la date de départ de chaque parcours selon sa propre date de début, sans rien écrire', async () => {
    const t = await createTemplate('APERCU', [])
    await createPathway(t, '2026-12-01T09:00:00.000Z')
    await createPathway(t, '2026-12-15T09:00:00.000Z')

    const res = await inject('POST', '/patient/enroll/preview', {
      pathways: [
        {
          tag: 'APERCU',
          timeOfDay: 'ALL_DAY',
          startDate: '2026-11-20T00:00:00.000Z',
        },
        {
          tag: 'APERCU',
          timeOfDay: 'ALL_DAY',
          startDate: '2026-12-10T00:00:00.000Z',
        },
        { tag: 'INCONNU', timeOfDay: 'ALL_DAY', startDate: '2026-12-10' },
      ],
    })
    expect(res.statusCode).toBe(200)
    const [first, second, unknown] = res.json()
    expect(first.startDate).toBe('2026-12-01T09:00:00.000Z')
    expect(second.startDate).toBe('2026-12-15T09:00:00.000Z')
    expect(unknown.startDate).toBeNull()
    expect(unknown.reason).toBeTruthy()
    expect(
      await testDb.appointment.count({
        where: { slot: { pathway: { templateID: t } } },
      }),
    ).toBe(0)
  })

  it("décale dans l'aperçu un parcours dont le prérequis est demandé en même temps", async () => {
    const a = await createTemplate('APERCU-PRE-A', [])
    const b = await createTemplate('APERCU-PRE-B', [a])
    await createPathway(a, '2027-01-12T09:00:00.000Z')
    await createPathway(b, '2027-01-05T09:00:00.000Z')
    await createPathway(b, '2027-01-19T09:00:00.000Z')

    const res = await inject('POST', '/patient/enroll/preview', {
      pathways: [
        { tag: 'APERCU-PRE-B', timeOfDay: 'ALL_DAY', startDate: '2027-01-01' },
        { tag: 'APERCU-PRE-A', timeOfDay: 'ALL_DAY', startDate: '2027-01-01' },
      ],
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().map((p: { startDate: string }) => p.startDate)).toEqual([
      '2027-01-19T09:00:00.000Z',
      '2027-01-12T09:00:00.000Z',
    ])
  })

  it('ignore les créneaux verrouillés ou supprimés, à l aperçu comme à l inscription', async () => {
    const t = await createTemplate('VERROU', [])
    await createPathway(t, '2027-02-02T09:00:00.000Z', { locked: true })
    await createPathway(t, '2027-02-09T09:00:00.000Z', {
      archivedAt: new Date(),
    })
    const open = await createPathway(t, '2027-02-16T09:00:00.000Z')

    const preview = await inject('POST', '/patient/enroll/preview', {
      pathways: [
        { tag: 'VERROU', timeOfDay: 'ALL_DAY', startDate: '2027-02-01' },
      ],
    })
    expect(preview.json()[0].startDate).toBe('2027-02-16T09:00:00.000Z')

    const created = await inject('POST', '/patient', {
      firstName: 'Grace',
      lastName: 'Hopper',
    })
    const patientId = created.json().id as string
    const res = await inject('POST', `/patient/${patientId}/enroll`, {
      patientID: patientId,
      startDate: '2027-02-01T00:00:00.000Z',
      pathways: [{ tag: 'VERROU', timeOfDay: 'ALL_DAY' }],
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().failedEnrollments).toEqual([])
    const appointments = await testDb.appointment.findMany({
      where: { appointmentPatients: { some: { patientId } } },
      select: { slot: { select: { pathwayID: true } } },
    })
    expect(appointments.map((apt) => apt.slot.pathwayID)).toEqual([open])
  })

  describe('parcours optionnels (MDS-68)', () => {
    let stressAfterRc: string
    let rc: string

    beforeAll(async () => {
      rc = await createTemplate('OPT-RC', [])
      const stress = await createTemplate('OPT-STRESS', [], true)
      await createPathway(rc, '2027-03-23T09:00:00.000Z')
      await createPathway(stress, '2027-03-09T09:00:00.000Z')
      stressAfterRc = await createPathway(stress, '2027-03-30T09:00:00.000Z')
    })

    const stressPathwayOf = async (patientId: string) =>
      (
        await testDb.appointment.findMany({
          where: {
            appointmentPatients: { some: { patientId } },
            slot: { pathway: { templateID: { not: rc } } },
          },
          select: { slot: { select: { pathwayID: true } } },
        })
      ).map((apt) => apt.slot.pathwayID)

    const newPatient = async (firstName: string) =>
      (
        await inject('POST', '/patient', { firstName, lastName: 'Optionnel' })
      ).json().id as string

    it("fait partir l'optionnel au début du principal demandé, sans date saisie", async () => {
      const res = await inject('POST', '/patient/enroll/preview', {
        pathways: [
          { tag: 'OPT-STRESS', timeOfDay: 'ALL_DAY' },
          { tag: 'OPT-RC', timeOfDay: 'ALL_DAY' },
        ],
      })
      expect(res.statusCode).toBe(200)
      const [stress, principal] = res.json()
      expect(principal.startDate).toBe('2027-03-23T09:00:00.000Z')
      expect(stress.from).toBe('2027-03-23T09:00:00.000Z')
      expect(stress.startDate).toBe('2027-03-30T09:00:00.000Z')
    })

    it('garde la date saisie à la main', async () => {
      const res = await inject('POST', '/patient/enroll/preview', {
        pathways: [
          { tag: 'OPT-RC', timeOfDay: 'ALL_DAY' },
          { tag: 'OPT-STRESS', timeOfDay: 'ALL_DAY', startDate: '2027-03-01' },
        ],
      })
      expect(res.json()[1].startDate).toBe('2027-03-09T09:00:00.000Z')
    })

    it("inscrit l'optionnel après le début du principal de la même demande", async () => {
      const patientId = await newPatient('Mêmedemande')
      const res = await inject('POST', `/patient/${patientId}/enroll`, {
        patientID: patientId,
        pathways: [
          { tag: 'OPT-STRESS', timeOfDay: 'ALL_DAY' },
          { tag: 'OPT-RC', timeOfDay: 'ALL_DAY' },
        ],
      })
      expect(res.json().failedEnrollments).toEqual([])
      expect(await stressPathwayOf(patientId)).toEqual([stressAfterRc])
    })

    it("part du principal déjà inscrit quand la demande n'en contient pas", async () => {
      const patientId = await newPatient('Dejainscrit')
      await inject('POST', `/patient/${patientId}/enroll`, {
        patientID: patientId,
        pathways: [{ tag: 'OPT-RC', timeOfDay: 'ALL_DAY' }],
      })
      const preview = await inject('POST', '/patient/enroll/preview', {
        patientID: patientId,
        pathways: [{ tag: 'OPT-STRESS', timeOfDay: 'ALL_DAY' }],
      })
      expect(preview.json()[0].startDate).toBe('2027-03-30T09:00:00.000Z')
      await inject('POST', `/patient/${patientId}/enroll`, {
        patientID: patientId,
        pathways: [{ tag: 'OPT-STRESS', timeOfDay: 'ALL_DAY' }],
      })
      expect(await stressPathwayOf(patientId)).toEqual([stressAfterRc])
    })
  })
})
