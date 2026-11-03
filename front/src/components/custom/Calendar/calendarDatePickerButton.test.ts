import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { describe, expect, it } from 'vitest'

import { libelleSemaine } from './calendarDatePickerButton.tsx'

dayjs.extend(utc)

// Cycle de 6 semaines démarrant le lundi 05/01/2026 ; la semaine du 12/01 est interdite.
const cycle = {
  startOfWeek: '2026-01-05',
  weekCount: 6,
  forbiddenWeekStarts: ['2026-01-12'],
}

describe('libelleSemaine', () => {
  it('sans cycle, le numéro ISO', () => {
    expect(libelleSemaine(45, dayjs.utc('2026-11-01'))).toBe('s45')
  })

  it('avec cycle, la position dans le cycle, tiret pour une semaine interdite', () => {
    const janvier = dayjs.utc('2026-01-01')
    expect(libelleSemaine(2, janvier, cycle)).toBe('S1')
    expect(libelleSemaine(3, janvier, cycle)).toBe('–')
    expect(libelleSemaine(4, janvier, cycle)).toBe('S2')
  })

  it('au changement d année, la semaine 1 affichée en décembre est celle de janvier suivant', () => {
    // Décembre 2025 : la semaine 1 commence le 29/12/2025, celle qui précède le départ (S6).
    expect(libelleSemaine(1, dayjs.utc('2025-12-01'), cycle)).toBe('S6')
    // Janvier 2026 : la semaine 53 n'existe pas en 2025, la 52 est la précédente (S5).
    expect(libelleSemaine(52, dayjs.utc('2026-01-01'), cycle)).toBe('S5')
  })
})
