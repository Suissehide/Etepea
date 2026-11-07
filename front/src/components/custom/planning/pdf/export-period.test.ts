import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import utc from 'dayjs/plugin/utc'
import { describe, expect, it } from 'vitest'

import {
  type ExportPeriod,
  periodBetween,
  periodOfMonths,
} from './export-period.ts'

dayjs.extend(utc)
dayjs.extend(isoWeek)

const day = (iso: string) => dayjs.utc(iso)
const fmt = ({ weekStart, weekCount }: ExportPeriod) =>
  `${weekStart.format('YYYY-MM-DD')} × ${weekCount}`

describe('periodBetween', () => {
  it('arrondit aux semaines entières, du lundi au vendredi', () => {
    expect(fmt(periodBetween(day('2026-11-04'), day('2026-11-06')))).toBe(
      '2026-11-02 × 1',
    )
    expect(fmt(periodBetween(day('2026-12-15'), day('2027-03-12')))).toBe(
      '2026-12-14 × 13',
    )
  })
})

describe('periodOfMonths', () => {
  it('va de la semaine du 1er à celle du dernier jour', () => {
    // Le 1er janvier 2027 est un vendredi : la semaine commence le 28 décembre.
    expect(fmt(periodOfMonths(day('2027-01-20'), 6))).toBe('2026-12-28 × 27')
    expect(fmt(periodOfMonths(day('2027-01-01'), 12))).toBe('2026-12-28 × 53')
    expect(fmt(periodOfMonths(day('2026-09-01'), 6))).toBe('2026-08-31 × 26')
  })
})
