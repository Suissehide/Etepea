import dayjs from 'dayjs'

import type { Slot } from '../types/slot.ts'

/** Un créneau placé sur l'axe horaire de son jour. */
export type PlacedSlot = {
  slot: Slot
  /** Minutes depuis minuit (UTC). */
  start: number
  end: number
  /** Colonne occupée parmi `laneCount` quand des créneaux se chevauchent. */
  lane: number
  laneCount: number
}

type SlotRange = (slot: Slot) => { start: string; end: string }

const minuteOf = (date: string) => {
  const d = dayjs.utc(date)
  return d.hour() * 60 + d.minute()
}

const byThematic = (a: Slot, b: Slot) =>
  (a.slotTemplate?.thematic ?? '').localeCompare(b.slotTemplate?.thematic ?? '')

const slotRange: SlotRange = (slot) => ({
  start: slot.startDate,
  end: slot.endDate,
})

/** Un créneau ne partage la largeur qu'avec ceux qui le chevauchent, de proche en proche. */
export function layoutDay(
  slots: Slot[],
  rangeOf: SlotRange = slotRange,
): PlacedSlot[] {
  const sorted = slots
    .map((slot) => {
      const { start, end } = rangeOf(slot)
      return {
        slot,
        start: minuteOf(start),
        end: minuteOf(end),
        lane: 0,
        laneCount: 1,
      }
    })
    .sort((a, b) => a.start - b.start || byThematic(a.slot, b.slot))

  let group: PlacedSlot[] = []
  let groupEnd = -1
  let laneEnds: number[] = []
  const closeGroup = () => {
    for (const placed of group) {
      placed.laneCount = laneEnds.length
    }
    group = []
    laneEnds = []
  }

  for (const placed of sorted) {
    if (placed.start >= groupEnd) {
      closeGroup()
    }
    const freeLane = laneEnds.findIndex((end) => end <= placed.start)
    placed.lane = freeLane === -1 ? laneEnds.length : freeLane
    laneEnds[placed.lane] = placed.end
    groupEnd = Math.max(groupEnd, placed.end)
    group.push(placed)
  }
  closeGroup()
  return sorted
}

/** Bornes de l'axe horaire : du premier début au dernier fin, `[0, 0]` sans créneau. */
export function hourBounds(days: PlacedSlot[][]): [number, number] {
  const placed = days.flat()
  if (placed.length === 0) {
    return [0, 0]
  }
  return [
    Math.min(...placed.map((p) => p.start)),
    Math.max(...placed.map((p) => p.end)),
  ]
}

/** Heures pleines strictement comprises dans l'axe : un trait et un libellé chacune. */
export function innerHours(startMinute: number, endMinute: number): number[] {
  const hours: number[] = []
  for (
    let minute = Math.floor(startMinute / 60) * 60 + 60;
    minute < endMinute;
    minute += 60
  ) {
    hours.push(minute)
  }
  return hours
}

export const formatMinute = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`

/** Espaces autour du tiret : react-pdf peut y couper la ligne si la colonne est étroite. */
export const formatTimeRange = ({ start, end }: PlacedSlot) =>
  `${formatMinute(start)} – ${formatMinute(end)}`

/** Plage creuse de la semaine, en minutes depuis minuit. */
export type TimeGap = { start: number; end: number }

/** Trous de plus de `minGap` minutes où aucun jour de la semaine n'a de créneau. */
export function findGaps(days: PlacedSlot[][], minGap: number): TimeGap[] {
  const busy = days
    .flat()
    .map(({ start, end }) => ({ start, end }))
    .sort((a, b) => a.start - b.start)
  const merged: TimeGap[] = []
  for (const range of busy) {
    const last = merged.at(-1)
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end)
    } else {
      merged.push({ ...range })
    }
  }
  return merged
    .slice(1)
    .map((range, i) => ({ start: merged[i].end, end: range.start }))
    .filter((gap) => gap.end - gap.start > minGap)
}

export type TimeAxis = {
  /** Position verticale d'une minute de l'axe. */
  y: (minute: number) => number
  height: number
  /** Heures pleines affichées : celles tombées dans un trou sont sautées. */
  hours: number[]
  /** Bandes « pause » à la place des trous. */
  bands: { top: number; height: number }[]
}

/**
 * Axe proportionnel (`hourHeight` par heure) dont chaque trou est ramené à une
 * bande de `bandHeight` : une matinée et une après-midi ne laissent plus des
 * heures vides entre elles. Sans trou, l'axe est l'axe continu habituel.
 */
export function buildTimeAxis({
  startMinute,
  endMinute,
  gaps,
  hourHeight,
  bandHeight,
}: {
  startMinute: number
  endMinute: number
  gaps: TimeGap[]
  hourHeight: number
  bandHeight: number
}): TimeAxis {
  const perMinute = hourHeight / 60
  const y = (minute: number) => {
    let top = (minute - startMinute) * perMinute
    for (const gap of gaps) {
      const length = gap.end - gap.start
      if (minute >= gap.end) {
        top -= length * perMinute - bandHeight
      } else if (minute > gap.start) {
        const inside = minute - gap.start
        top -= inside * perMinute - (inside / length) * bandHeight
      }
    }
    return top
  }
  const inGap = (minute: number) =>
    gaps.some((gap) => minute > gap.start && minute < gap.end)
  return {
    y,
    height: y(endMinute),
    hours: innerHours(startMinute, endMinute).filter((h) => !inGap(h)),
    bands: gaps.map((gap) => ({ top: y(gap.start), height: bandHeight })),
  }
}
