import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { describe, expect, it } from 'vitest'

import type { TrackingAppointment } from '../types/pathway.ts'
import { nextStatus, suiviDays } from './suiviDay.ts'

// `main.tsx` l'installe dans l'application ; un test de lib ne le charge pas.
dayjs.extend(utc)

const apt = (date: string, status: string | null): TrackingAppointment => ({
  appointmentId: date,
  appointmentPatientId: date,
  date,
  status,
})

describe('suiviDays', () => {
  it('distingue present, absent et non pointe', () => {
    const days = suiviDays([
      apt('2026-03-02T09:00:00.000Z', 'yes'),
      apt('2026-03-03T09:00:00.000Z', 'no'),
      apt('2026-03-04T09:00:00.000Z', null),
    ])
    expect(days.get(2)).toMatchObject({ mark: 'present', count: 1 })
    expect(days.get(3)).toMatchObject({ mark: 'absent', count: 1 })
    expect(days.get(4)).toMatchObject({ mark: 'pending', count: 1 })
  })

  it('garde tous les rendez-vous du jour et fait ressortir l absence', () => {
    const days = suiviDays([
      apt('2026-03-05T09:00:00.000Z', 'yes'),
      apt('2026-03-05T14:00:00.000Z', 'no'),
      apt('2026-03-05T16:00:00.000Z', null),
    ])
    expect(days.get(5)).toMatchObject({ mark: 'absent', count: 3 })
  })

  it('une presence l emporte sur un rendez-vous non pointe', () => {
    const days = suiviDays([
      apt('2026-03-06T09:00:00.000Z', null),
      apt('2026-03-06T14:00:00.000Z', 'yes'),
    ])
    expect(days.get(6)).toMatchObject({ mark: 'present', count: 2 })
  })

  it('garde les rendez-vous du jour pour le pointage', () => {
    const days = suiviDays([
      apt('2026-03-07T09:00:00.000Z', null),
      apt('2026-03-07T14:00:00.000Z', null),
    ])
    expect(days.get(7)?.appointments).toHaveLength(2)
  })
})

describe('nextStatus', () => {
  it('fait tourner non pointe, present, absent', () => {
    expect(nextStatus('pending')).toBe('yes')
    expect(nextStatus('present')).toBe('no')
    expect(nextStatus('absent')).toBeNull()
  })
})
