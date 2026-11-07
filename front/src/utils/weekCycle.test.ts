import 'dayjs/locale/fr'

import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'

import { cycleWeekNumber, plageSemaine } from './weekCycle.ts'

const cycle = {
  startOfWeek: '2026-01-05',
  weekCount: 3,
  forbiddenWeekStarts: ['2026-01-19', '2025-12-22'],
}
const n = (date: string) => cycleWeekNumber(dayjs.utc(date), cycle)

describe('cycleWeekNumber', () => {
  it('saute les semaines interdites, en avant comme en arrière', () => {
    expect(n('2026-01-05')).toBe(1)
    expect(n('2026-01-12')).toBe(2)
    expect(n('2026-01-19')).toBeNull()
    expect(n('2026-01-26')).toBe(3)
    expect(n('2026-02-02')).toBe(1)
    expect(n('2025-12-29')).toBe(3)
    expect(n('2025-12-22')).toBeNull()
    expect(n('2025-12-15')).toBe(2)
  })

  it('sans semaine interdite, numérote en continu', () => {
    const plain = { startOfWeek: '2026-01-05', weekCount: 6 }
    expect(cycleWeekNumber(dayjs.utc('2025-12-29'), plain)).toBe(6)
    expect(cycleWeekNumber(dayjs.utc('2026-02-16'), plain)).toBe(1)
  })
})

describe('plageSemaine', () => {
  const plage = (date: string) => plageSemaine(dayjs.utc(date).locale('fr'))

  it('va du lundi au dimanche, quel que soit le jour', () => {
    expect(plage('2026-11-06')).toBe('2 – 8 novembre')
    expect(plage('2026-11-02')).toBe('2 – 8 novembre')
    expect(plage('2026-11-08')).toBe('2 – 8 novembre')
  })

  it('nomme les deux mois quand la semaine est a cheval', () => {
    expect(plage('2026-12-02')).toBe('30 novembre – 6 décembre')
  })
})
