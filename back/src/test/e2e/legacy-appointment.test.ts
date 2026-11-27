import { buildTestApp, type TestApp } from './setup/app'
import { testDb, truncateAll } from './setup/db'
import { tenantUrl, twoServicesScenario } from './setup/fixtures'

const TOKEN = 'secret-de-test'

const rdv = {
  legacyId: '42',
  date: '2026-12-03',
  time: '14:30',
  durationMinutes: 45,
  patientName: 'DUPONT Marie',
  thematic: 'HTA',
  type: 'telephonic',
}

describe('Rendez-vous de l ancienne app', () => {
  let testApp: TestApp
  let scenario: Awaited<ReturnType<typeof twoServicesScenario>>

  const push = (body: object, token = TOKEN) =>
    testApp.app.inject({
      method: 'POST',
      url: '/legacy-appointments',
      headers: { 'x-etepea-token': token },
      payload: body,
    })

  const list = (serviceId: string, cookies: Record<string, string>) =>
    testApp.app.inject({
      method: 'GET',
      url: tenantUrl(scenario.est.id, serviceId, '/legacy-appointments'),
      cookies,
    })

  beforeAll(async () => {
    await truncateAll()
    testApp = await buildTestApp()
    scenario = await twoServicesScenario(testApp.app)
    process.env.LEGACY_RDV_TOKEN = TOKEN
    process.env.LEGACY_RDV_ESTABLISHMENT_ID = scenario.est.id
    process.env.LEGACY_RDV_SERVICE_ID = scenario.serviceA.id
    await testApp.close()
    testApp = await buildTestApp()
  })

  afterAll(async () => {
    delete process.env.LEGACY_RDV_TOKEN
    delete process.env.LEGACY_RDV_ESTABLISHMENT_ID
    delete process.env.LEGACY_RDV_SERVICE_ID
    await testApp.close()
    await testDb.$disconnect()
  })

  it('refuse tout tant que la fonctionnalité est éteinte', async () => {
    expect((await push(rdv)).statusCode).toBe(404)
    expect(
      (await list(scenario.serviceA.id, scenario.cookiesA)).statusCode,
    ).toBe(404)
  })

  it('refuse un mauvais jeton', async () => {
    await testDb.service.update({
      where: { id: scenario.serviceA.id },
      data: { features: ['legacy-rdv'] },
    })
    expect((await push(rdv, 'faux')).statusCode).toBe(401)
    expect((await push(rdv, '')).statusCode).toBe(401)
  })

  it('reçoit un rendez-vous et ne le duplique pas si l appel est rejoué', async () => {
    expect((await push(rdv)).statusCode).toBe(204)
    expect((await push({ ...rdv, time: '15:00' })).statusCode).toBe(204)
    const res = await list(scenario.serviceA.id, scenario.cookiesA)
    expect(res.statusCode).toBe(200)
    const rows = res.json()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      legacyId: '42',
      time: '15:00',
      durationMinutes: 45,
      patientName: 'DUPONT Marie',
      thematic: 'HTA',
      type: 'telephonic',
      reportedAt: null,
    })
    expect(rows[0].date.slice(0, 10)).toBe('2026-12-03')
  })

  it('marque un rendez-vous reporté puis le rouvre', async () => {
    const [row] = (await list(scenario.serviceA.id, scenario.cookiesA)).json()
    const patch = (reported: boolean) =>
      testApp.app.inject({
        method: 'PATCH',
        url: tenantUrl(
          scenario.est.id,
          scenario.serviceA.id,
          `/legacy-appointments/${row.id}`,
        ),
        cookies: scenario.cookiesA,
        payload: { reported },
      })
    expect((await patch(true)).json().reportedAt).not.toBeNull()
    expect((await patch(false)).json().reportedAt).toBeNull()
  })

  it('n expose rien à un autre service, même activé par l établissement', async () => {
    await testDb.establishment.update({
      where: { id: scenario.est.id },
      data: { features: ['legacy-rdv'] },
    })
    const res = await list(scenario.serviceB.id, scenario.cookiesB)
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
    const [row] = await testDb.legacyAppointment.findMany()
    const patch = await testApp.app.inject({
      method: 'PATCH',
      url: tenantUrl(
        scenario.est.id,
        scenario.serviceB.id,
        `/legacy-appointments/${row?.id}`,
      ),
      cookies: scenario.cookiesB,
      payload: { reported: true },
    })
    expect(patch.statusCode).toBe(404)
    const del = await testApp.app.inject({
      method: 'DELETE',
      url: tenantUrl(
        scenario.est.id,
        scenario.serviceB.id,
        `/legacy-appointments/${row?.id}`,
      ),
      cookies: scenario.cookiesB,
    })
    expect(del.statusCode).toBe(404)
  })

  it('supprime un rendez-vous', async () => {
    const [row] = (await list(scenario.serviceA.id, scenario.cookiesA)).json()
    const url = tenantUrl(
      scenario.est.id,
      scenario.serviceA.id,
      `/legacy-appointments/${row.id}`,
    )
    const del = () =>
      testApp.app.inject({ method: 'DELETE', url, cookies: scenario.cookiesA })
    expect((await del()).statusCode).toBe(204)
    expect(
      (await list(scenario.serviceA.id, scenario.cookiesA)).json(),
    ).toEqual([])
    expect((await del()).statusCode).toBe(404)
  })

  it('refuse un corps invalide', async () => {
    expect((await push({ ...rdv, time: '14h30' })).statusCode).toBe(400)
    expect((await push({ ...rdv, type: 'ambu' })).statusCode).toBe(400)
  })
})
