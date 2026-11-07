import type { Dayjs } from 'dayjs'

/** Un an : au-delà, le PDF devient trop long à générer dans le navigateur. */
export const MAX_WEEK_COUNT = 53

export type ExportPeriod = { weekStart: Dayjs; weekCount: number }

/**
 * L'export prend des semaines entières : du lundi de la semaine de `from` au
 * vendredi de la semaine de `to`. Nombre de semaines non borné : à l'appelant
 * de refuser au-delà de `MAX_WEEK_COUNT`.
 */
export function periodBetween(from: Dayjs, to: Dayjs): ExportPeriod {
  const weekStart = from.isoWeekday(1).startOf('day')
  const lastWeekStart = to.isoWeekday(1).startOf('day')
  return {
    weekStart,
    weekCount: lastWeekStart.diff(weekStart, 'week') + 1,
  }
}

/** `months` mois à partir du 1er de `firstMonth`, en semaines entières. */
export function periodOfMonths(
  firstMonth: Dayjs,
  months: number,
): ExportPeriod {
  const first = firstMonth.startOf('month')
  return periodBetween(first, first.add(months, 'month').subtract(1, 'day'))
}
