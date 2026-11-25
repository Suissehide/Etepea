import dayjs from 'dayjs'

export type Interval = { startDate: Date; endDate: Date }

// 1 : collé à un rendez-vous du jour ; 2 : jour sans rendez-vous ; 3 : trou.
export type GapRank = 1 | 2 | 3

const MAX_GAP_MINUTES = 60
const AFTERNOON_HOUR = 13

const isAfternoon = (date: Date) => dayjs(date).hour() >= AFTERNOON_HOUR

const minutesBetween = (a: Interval, b: Interval) =>
  Math.max(
    dayjs(b.startDate).diff(a.endDate, 'minute'),
    dayjs(a.startDate).diff(b.endDate, 'minute'),
  )

export const gapRank = (
  candidate: Interval,
  appointments: Interval[],
): GapRank => {
  const sameDay = appointments.filter((a) =>
    dayjs(a.startDate).isSame(candidate.startDate, 'day'),
  )
  if (sameDay.length === 0) {
    return 2
  }
  return sameDay.some(
    (a) =>
      isAfternoon(a.startDate) === isAfternoon(candidate.startDate) &&
      minutesBetween(a, candidate) <= MAX_GAP_MINUTES,
  )
    ? 1
    : 3
}

export const byGapThenDate = (
  a: Interval & { rank: number },
  b: Interval & { rank: number },
) =>
  a.rank - b.rank ||
  new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
