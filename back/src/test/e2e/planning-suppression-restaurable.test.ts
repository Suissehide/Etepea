import { buildTestApp, type TestApp } from './setup/app'
import { futur } from './setup/dates'
import { testDb, truncateAll } from './setup/db'
import {
  createEstablishment,
  createService,
  createUser,
  signIn,
  tenantUrl,
} from './setup/fixtures'

type Cookies = { access_token: string }

// Supprimer un créneau ou un parcours l'archive : les rendez-vous restent, la suppression est restaurable.
describe('suppressions restaurables du planning', () => {
  let t: TestApp
  let E: string
  let A: string
  let soignantID: string
  let ideID: string
  let cookies: Cookies

  const url = (path: string) => tenantUrl(E, A, path)

  const creerCreneau = async (
    start: string,
    end: string,
    extra: { pathwayID?: string; locationID?: string } = {},
  ) => {
    const slotTemplate = await testDb.slotTemplate.create({
      data: {
        startTime: new Date(start),
        endTime: new Date(end),
        offsetDays: 0,
        isIndividual: false,
        capacity: 10,
        color: '#fff',
        locationID: extra.locationID,
        establishmentId: E,
        serviceId: A,
      },
    })
    await testDb.slotTemplateSoignant.create({
      data: {
        slotTemplateId: slotTemplate.id,
        soignantId: soignantID,
        serviceId: A,
        establishmentId: E,
      },
    })
    const slot = await testDb.slot.create({
      data: {
        startDate: new Date(start),
        endDate: new Date(end),
        pathwayID: extra.pathwayID,
        slotTemplateID: slotTemplate.id,
        establishmentId: E,
        serviceId: A,
      },
    })
    return { slot, slotTemplate }
  }

  const inscrire = async (slotID: string, start: string, end: string) => {
    const patient = await testDb.patient.create({
      data: {
        firstName: 'Paul',
        lastName: slotID,
        establishmentId: E,
        createDate: new Date(),
      },
    })
    const appointment = await testDb.appointment.create({
      data: {
        startDate: new Date(start),
        endDate: new Date(end),
        establishmentId: E,
        serviceId: A,
        slotID,
      },
    })
    await testDb.appointmentPatient.create({
      data: {
        establishmentId: E,
        serviceId: A,
        appointmentId: appointment.id,
        patientId: patient.id,
      },
    })
    return appointment
  }

  beforeAll(async () => {
    t = await buildTestApp()
    await truncateAll()
    E = (await createEstablishment('E-SUPPR-RESTAURABLE')).id
    A = (await createService(E, 'S-SUPPR-RESTAURABLE')).id
    soignantID = (
      await testDb.soignant.create({
        data: { name: 'IDE', establishmentId: E, serviceId: A },
      })
    ).id
    await createUser({
      email: 'coord@suppr.fr',
      memberships: [
        {
          establishmentId: E,
          services: [{ serviceId: A, role: 'COORDINATEUR' }],
        },
      ],
    })
    ideID = (
      await createUser({
        email: 'ide@suppr.fr',
        memberships: [
          {
            establishmentId: E,
            services: [
              { serviceId: A, role: 'INTERVENANT', soignantId: soignantID },
            ],
          },
        ],
      })
    ).id
    cookies = await signIn(t.app, 'coord@suppr.fr')
  })

  afterAll(async () => {
    await t.close()
    await testDb.$disconnect()
  })

  it('DELETE /slot/:id sur un créneau vide : 204 et la ligne reste, archivée', async () => {
    const { slot } = await creerCreneau(futur(30, '09:00'), futur(30, '09:30'))

    const res = await t.app.inject({
      method: 'DELETE',
      url: url(`/slot/${slot.id}`),
      cookies,
    })

    expect(res.statusCode).toBe(204)
    const ligne = await testDb.slot.findUnique({ where: { id: slot.id } })
    expect(ligne?.archivedAt).toBeInstanceOf(Date)
  })

  it('DELETE /pathway/:id archive les créneaux, garde rendez-vous et modèles, notifie', async () => {
    const pathway = await testDb.pathway.create({
      data: {
        startDate: new Date(futur(31, '00:00')),
        establishmentId: E,
        serviceId: A,
      },
    })
    const { slot, slotTemplate } = await creerCreneau(
      futur(31, '09:00'),
      futur(31, '09:30'),
      { pathwayID: pathway.id },
    )
    const appointment = await inscrire(
      slot.id,
      futur(31, '09:00'),
      futur(31, '09:30'),
    )

    const res = await t.app.inject({
      method: 'DELETE',
      url: url(`/pathway/${pathway.id}`),
      cookies,
    })

    expect(res.statusCode).toBe(204)
    expect(
      await testDb.pathway.findUnique({ where: { id: pathway.id } }),
    ).toBeNull()
    const ligne = await testDb.slot.findUnique({ where: { id: slot.id } })
    expect(ligne?.archivedAt).toBeInstanceOf(Date)
    expect(ligne?.pathwayID).toBeNull()
    expect(
      await testDb.appointment.findUnique({ where: { id: appointment.id } }),
    ).not.toBeNull()
    expect(
      await testDb.slotTemplate.findUnique({ where: { id: slotTemplate.id } }),
    ).not.toBeNull()

    // Notification écrite en tâche de fond.
    let notifs = 0
    for (let i = 0; i < 40 && notifs < 1; i += 1) {
      const rows = await testDb.notification.findMany({
        where: { userId: ideID, type: 'APPOINTMENT_CANCELLED' },
      })
      notifs = rows.filter(
        (r) =>
          (r.payload as { appointmentId?: string }).appointmentId ===
          appointment.id,
      ).length
      if (notifs < 1) {
        await new Promise((r) => setTimeout(r, 50))
      }
    }
    expect(notifs).toBe(1)
  })

  it('les conflits ignorent un créneau archivé qui chevauche un autre dans la même salle', async () => {
    const salle = await testDb.location.create({
      data: { name: 'Salle X', establishmentId: E, serviceId: A },
    })
    const a = await creerCreneau(futur(32, '09:00'), futur(32, '10:00'), {
      locationID: salle.id,
    })
    const b = await creerCreneau(futur(32, '09:30'), futur(32, '10:30'), {
      locationID: salle.id,
    })
    await inscrire(a.slot.id, futur(32, '09:00'), futur(32, '09:30'))
    await inscrire(b.slot.id, futur(32, '09:30'), futur(32, '10:00'))
    await testDb.slot.update({
      where: { id: b.slot.id },
      data: { archivedAt: new Date() },
    })

    const res = await t.app.inject({
      method: 'GET',
      url: url(
        `/slot/conflicts?from=${futur(32, '00:00')}&to=${futur(33, '00:00')}`,
      ),
      cookies,
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ conflicts: [] })
  })
})
