import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { describe, expect, it } from 'vitest'

import { NO_SOIGNANT_KEY } from '../constants/soignant.constant.ts'
import type { Slot } from '../types/slot.ts'
import { buildDaySlotRows, groupDaySlotRowsBySoignant } from './utils.ts'

dayjs.extend(utc)

const slot = (id: string, startDate: string, extra: Partial<Slot> = {}) =>
  ({
    id,
    startDate,
    endDate: startDate,
    locked: false,
    appointments: [],
    slotTemplate: { soignants: [] },
    ...extra,
  }) as unknown as Slot

const appointment = (id: string, patientID: string) => ({
  id,
  appointmentPatients: [{ id: `ap-${id}`, patient: { id: patientID } }],
})

describe('buildDaySlotRows', () => {
  it('garde la thématique du créneau et donne à part la sous-thématique du rendez-vous', () => {
    const template = { soignants: [], thematic: 'ETP', thematicId: 't-etp' }
    const rdv = (id: string, thematicId: string, thematic: string) => ({
      ...appointment(id, `p-${id}`),
      thematicId,
      thematic,
    })
    const [sous, meme] = buildDaySlotRows(
      [
        slot('sous', '2026-03-02T09:00:00.000Z', {
          slotTemplate: template,
          appointments: [rdv('a1', 't-diab', 'Diabète')],
        } as unknown as Partial<Slot>),
        slot('meme', '2026-03-02T10:00:00.000Z', {
          slotTemplate: template,
          appointments: [rdv('a2', 't-etp', 'ETP')],
        } as unknown as Partial<Slot>),
      ],
      dayjs.utc('2026-03-02'),
    )

    expect([sous.thematic, sous.subThematic]).toEqual(['ETP', 'Diabète'])
    expect([meme.thematic, meme.subThematic]).toEqual(['ETP', undefined])
  })

  it('une ligne par créneau du jour, avec les patients de tous ses rendez-vous', () => {
    const rows = buildDaySlotRows(
      [
        slot('vide', '2026-03-02T14:00:00.000Z'),
        slot('deux', '2026-03-02T09:00:00.000Z', {
          appointments: [appointment('a1', 'p1'), appointment('a2', 'p2')],
        } as Partial<Slot>),
        slot('un', '2026-03-02T11:00:00.000Z', {
          appointments: [appointment('a3', 'p3')],
        } as Partial<Slot>),
        slot('archive-vide', '2026-03-02T10:00:00.000Z', {
          archivedAt: '2026-03-01',
        }),
        slot('autre-jour', '2026-03-03T09:00:00.000Z'),
      ],
      dayjs.utc('2026-03-02'),
    )

    expect(rows.map((r) => r.id)).toEqual(['deux', 'un', 'vide'])
    expect(rows.map((r) => r.appointmentId)).toEqual([null, 'a3', null])
    expect(rows[0].patients.map((p) => p.appointmentId)).toEqual(['a1', 'a2'])
    expect(rows.map((r) => r.canBook)).toEqual([false, false, true])
  })

  it("un créneau supprimé ne reste que pour ses patients, et n'accepte plus rien", () => {
    const rows = buildDaySlotRows(
      [
        // Rendez-vous sans patient (import historique) : rien à conserver.
        slot('archive-fantome', '2026-03-02T09:00:00.000Z', {
          archivedAt: '2026-03-01',
          appointments: [{ id: 'a0', appointmentPatients: [] }],
        } as unknown as Partial<Slot>),
        slot('archive-avec-patient', '2026-03-02T10:00:00.000Z', {
          archivedAt: '2026-03-01',
          appointments: [appointment('a1', 'p1')],
        } as Partial<Slot>),
      ],
      dayjs.utc('2026-03-02'),
    )

    expect(rows.map((r) => r.id)).toEqual(['archive-avec-patient'])
    expect(rows[0].canBook).toBe(false)
    expect(rows[0].closed).toBe('archived')
  })
})

describe('buildDaySlotRows, créneau individuel', () => {
  it('dès un rendez-vous, un sous-tableau avec les intervalles libres', () => {
    const at = (h: string) => `2026-03-02T${h}:00.000Z`
    const [row] = buildDaySlotRows(
      [
        slot('ind', at('10:00'), {
          endDate: at('12:00'),
          slotTemplate: { soignants: [], isIndividual: true },
          appointments: [
            {
              ...appointment('a2', 'p2'),
              startDate: at('11:00'),
              endDate: at('11:30'),
            },
            {
              ...appointment('a1', 'p1'),
              startDate: at('10:00'),
              endDate: at('10:30'),
            },
          ],
        } as unknown as Partial<Slot>),
      ],
      dayjs.utc('2026-03-02'),
    )

    expect(row.canBook).toBe(false)
    expect(
      row.subRows?.map((r) => [
        r.kind,
        dayjs.utc(r.startDate).format('HH:mm'),
        r.canBook,
      ]),
    ).toEqual([
      ['appointment', '10:00', false],
      ['free', '10:30', true],
      ['appointment', '11:00', false],
      ['free', '11:30', true],
    ])
  })

  it('sans rendez-vous, une ligne simple', () => {
    const [row] = buildDaySlotRows(
      [
        slot('ind', '2026-03-02T10:00:00.000Z', {
          slotTemplate: { soignants: [], isIndividual: true },
        } as unknown as Partial<Slot>),
      ],
      dayjs.utc('2026-03-02'),
    )

    expect(row.subRows).toBeUndefined()
  })
})

describe('groupDaySlotRowsBySoignant', () => {
  const kine = { id: 'kine', name: 'Kiné' }
  const diet = { id: 'diet', name: 'Diététicienne', inactive: true }
  const rows = buildDaySlotRows(
    [
      slot('kine', '2026-03-02T09:00:00.000Z', {
        slotTemplate: { soignants: [kine] },
      } as Partial<Slot>),
      slot('diet', '2026-03-02T10:00:00.000Z', {
        slotTemplate: { soignants: [diet] },
      } as Partial<Slot>),
      slot('partage', '2026-03-02T11:00:00.000Z', {
        slotTemplate: { soignants: [kine, diet] },
      } as Partial<Slot>),
      slot('personne', '2026-03-02T12:00:00.000Z'),
    ],
    dayjs.utc('2026-03-02'),
  )
  const ids = (g: ReturnType<typeof groupDaySlotRowsBySoignant>) =>
    g.map((x) => [x.soignant?.id ?? null, x.rows.map((r) => r.id)])

  it('les créneaux d un soignant inactif passent dans « Sans soignant » (MDS-76)', () => {
    expect(ids(groupDaySlotRowsBySoignant(rows, [], [kine, diet]))).toEqual([
      ['kine', ['kine', 'partage']],
      [null, ['diet', 'personne']],
    ])
  })

  it('« Sans soignant » n apparaît avec une sélection que s il est coché', () => {
    expect(
      ids(groupDaySlotRowsBySoignant(rows, ['kine', 'diet'], [kine, diet])),
    ).toEqual([['kine', ['kine', 'partage']]])
    expect(
      ids(groupDaySlotRowsBySoignant(rows, [NO_SOIGNANT_KEY], [kine, diet])),
    ).toEqual([[null, ['diet', 'personne']]])
  })

  it('un soignant masqué perd son tableau comme un inactif', () => {
    const masque = { ...diet, inactive: false, hidden: true }
    expect(ids(groupDaySlotRowsBySoignant(rows, [], [kine, masque]))).toEqual([
      ['kine', ['kine', 'partage']],
      [null, ['diet', 'personne']],
    ])
  })

  it('sans drapeau, chaque soignant garde son tableau', () => {
    const visible = { ...diet, inactive: false }
    expect(ids(groupDaySlotRowsBySoignant(rows, [], [kine, visible]))).toEqual([
      ['diet', ['diet', 'partage']],
      ['kine', ['kine', 'partage']],
      [null, ['personne']],
    ])
  })
})
