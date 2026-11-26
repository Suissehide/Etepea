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

// Les administrateurs sont prévenus des modifications faites par un autre qu'eux.
describe('notification PLANNING_CHANGED', () => {
  let t: TestApp
  let E: string
  let S: string
  let coord: Cookies
  let admin: Cookies
  const ids: Record<string, string> = {}

  const url = (path: string) => tenantUrl(E, S, path)

  const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms))

  // Écriture en tâche de fond : on attend le compte attendu, ou on laisse passer le délai pour un zéro.
  const recues = async (email: string, attendu: number, action?: string) => {
    const lire = async () =>
      (
        await testDb.notification.findMany({
          where: { userId: ids[email], type: 'PLANNING_CHANGED' },
        })
      ).filter(
        (n) => !action || (n.payload as { action: string }).action === action,
      )
    if (attendu === 0) {
      await attendre(500)
      return await lire()
    }
    for (let i = 0; i < 40; i += 1) {
      const rows = await lire()
      if (rows.length >= attendu) {
        await attendre(200)
        return await lire()
      }
      await attendre(50)
    }
    return await lire()
  }

  const creerCreneau = async (heure: number) => {
    const modele = await testDb.slotTemplate.create({
      data: {
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T10:00:00Z'),
        offsetDays: 0,
        isIndividual: true,
        color: '#fff',
        serviceId: S,
        establishmentId: E,
      },
    })
    return await testDb.slot.create({
      data: {
        startDate: new Date(Date.UTC(2026, 3, 1, heure)),
        endDate: new Date(Date.UTC(2026, 3, 1, heure + 1)),
        slotTemplateID: modele.id,
        serviceId: S,
        establishmentId: E,
      },
    })
  }

  const semaine = async (date: string, c: Cookies) => {
    const res = await t.app.inject({
      method: 'POST',
      url: url('/forbidden-week'),
      cookies: c,
      payload: { date },
    })
    expect(res.statusCode).toBe(201)
    return (res.json() as { id: string }).id
  }

  // Laisse finir les écritures en tâche de fond de l'étape précédente, puis repart de zéro.
  const purger = async () => {
    await attendre(500)
    await testDb.notification.deleteMany()
    await testDb.activityLog.deleteMany()
  }

  beforeAll(async () => {
    await truncateAll()
    E = (await createEstablishment('E-PLAN-NOTIF')).id
    S = (await createService(E, 'S-PLAN-NOTIF')).id
    const comptes = [
      ['coord@plan-notif.fr', 'MEMBER'],
      ['admin@plan-notif.fr', 'ADMIN'],
      ['admin2@plan-notif.fr', 'ADMIN'],
      ['admin-off@plan-notif.fr', 'ADMIN'],
      ['admin-muet@plan-notif.fr', 'ADMIN'],
    ] as const
    for (const [email, role] of comptes) {
      ids[email] = (
        await createUser({
          email,
          memberships: [
            {
              establishmentId: E,
              role,
              services:
                role === 'MEMBER'
                  ? [{ serviceId: S, role: 'COORDINATEUR' }]
                  : [],
            },
          ],
        })
      ).id
    }
    await testDb.user.update({
      where: { id: ids['admin-off@plan-notif.fr'] },
      data: { deactivatedAt: new Date() },
    })
    await testDb.user.update({
      where: { id: ids['admin-muet@plan-notif.fr'] },
      data: { notificationPrefs: { app: { planning: false } } },
    })
    t = await buildTestApp()
    coord = await signIn(t.app, 'coord@plan-notif.fr')
    admin = await signIn(t.app, 'admin@plan-notif.fr')
  })

  afterAll(async () => {
    await t.close()
    await testDb.$disconnect()
  })

  it('un membre supprime une semaine : les administrateurs actifs sont prévenus, pas les autres', async () => {
    const id = await semaine('2026-08-12T00:00:00.000Z', coord)
    await purger()
    const res = await t.app.inject({
      method: 'DELETE',
      url: url(`/forbidden-week/${id}`),
      cookies: coord,
    })
    expect(res.statusCode).toBe(204)

    const [n] = await recues('admin2@plan-notif.fr', 1, 'planning.deleted')
    const ligne = await testDb.activityLog.findFirstOrThrow({
      where: { action: 'planning.deleted', entityID: id },
    })
    expect(n.payload).toMatchObject({
      action: 'planning.deleted',
      entityType: 'forbiddenWeek',
      actorId: ids['coord@plan-notif.fr'],
      activityLogId: ligne.id,
    })
    expect(await recues('admin@plan-notif.fr', 1)).toHaveLength(1)
    expect(await recues('admin-off@plan-notif.fr', 0)).toHaveLength(0)
    expect(await recues('admin-muet@plan-notif.fr', 0)).toHaveLength(0)
    expect(await recues('coord@plan-notif.fr', 0)).toHaveLength(0)
  })

  it('trois modifications dans l’heure : une seule notification', async () => {
    const slot = await creerCreneau(11)
    await purger()
    for (const h of [12, 13, 14]) {
      const res = await t.app.inject({
        method: 'PATCH',
        url: url(`/slot/${slot.id}`),
        cookies: coord,
        payload: {
          startDate: `2026-04-01T${h}:00:00.000Z`,
          endDate: `2026-04-01T${h + 1}:00:00.000Z`,
        },
      })
      expect(res.statusCode).toBe(200)
    }
    expect(
      await recues('admin@plan-notif.fr', 1, 'planning.updated'),
    ).toHaveLength(1)
  })

  it('deux suppressions : deux notifications', async () => {
    const a = await creerCreneau(15)
    const b = await creerCreneau(17)
    await purger()
    for (const s of [a, b]) {
      const res = await t.app.inject({
        method: 'DELETE',
        url: url(`/slot/${s.id}`),
        cookies: coord,
      })
      expect(res.statusCode).toBeLessThan(300)
    }
    expect(
      await recues('admin@plan-notif.fr', 2, 'planning.deleted'),
    ).toHaveLength(2)
  })

  it("l'administrateur modifie : journal oui, notification non", async () => {
    const id = await semaine('2026-09-09T00:00:00.000Z', admin)
    await purger()
    const res = await t.app.inject({
      method: 'DELETE',
      url: url(`/forbidden-week/${id}`),
      cookies: admin,
    })
    expect(res.statusCode).toBe(204)
    const supprimees = () =>
      testDb.activityLog.count({ where: { action: 'planning.deleted' } })
    for (let i = 0; i < 40 && (await supprimees()) === 0; i += 1) {
      await attendre(50)
    }
    expect(await supprimees()).toBe(1)
    for (const email of ['admin@plan-notif.fr', 'admin2@plan-notif.fr']) {
      expect(await recues(email, 0)).toHaveLength(0)
    }
  })
})
