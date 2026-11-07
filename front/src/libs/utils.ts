import { type ClassValue, clsx } from 'clsx'
import dayjs, { type Dayjs } from 'dayjs'
import { twMerge } from 'tailwind-merge'

import type { CalendarEvent } from '../components/custom/Calendar/calendar.tsx'
import type { Appointment } from '../types/appointment.ts'
import type { AppointmentPatient } from '../types/appointmentPatient.ts'
import type { Pathway } from '../types/pathway.ts'
import type { Slot } from '../types/slot.ts'
import type { SlotTemplate } from '../types/slotTemplate.ts'
import type { Soignant } from '../types/soignant.ts'
import type { Thematic } from '../types/thematic.ts'
import { getContrastTextColor } from './color.ts'
import {
  getFreeIntervals,
  hasSlotAvailability,
  isSlotVisible,
} from './slotAvailability.ts'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeParse<T>(value: string | null, fallback: T): T {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

export const containsKeyword = (states: string[], keywords: string[]) =>
  states && keywords.some((keyword) => states.includes(keyword))

/**
 * Transforme un objet {clé: label} en [{value, label}]
 */
export function toSelectOptions<T extends Record<string, string>>(dict: T) {
  return Object.entries(dict).map(([value, label]) => ({
    value,
    label,
  }))
}

export function getLabel<T extends Record<string, string>>(
  dict: T,
  value: string | null | undefined,
  fallback: string = '-',
): string {
  if (!value) {
    return fallback
  }
  return dict[value] || value
}

/**
 * Event
 */
export const buildCalendarEventsFromSlots = (
  slots: Slot[],
  states: string[],
  conflictLabels?: Map<string, string[]>,
): CalendarEvent[] => {
  if (!slots) {
    return []
  }

  return slots.map((slot) => {
    const slotStates = [...states]

    if (containsKeyword(slotStates, ['fillable'])) {
      slotStates.push(
        slot.slotTemplate?.isIndividual ? 'individual' : 'multiple',
      )
    }

    const display = containsKeyword(slotStates, ['individual', 'multiple'])
      ? 'background'
      : 'block'

    const slotColor = slot.slotTemplate?.color ?? '#2563eb'
    return {
      id: `slot_${slot.id}`,
      title: slot.slotTemplate?.soignants?.length
        ? slot.slotTemplate.soignants.map((s) => s.name).join(', ')
        : 'Soignant inconnu',
      start: slot.startDate,
      end: slot.endDate,
      color: slotColor,
      contrastColor: getContrastTextColor(slotColor),
      display,
      className: 'fc-slot',
      editable: !containsKeyword(slotStates, ['editable']) && !slot.locked,
      extendedProps: {
        type: 'slot',
        thematic: slot.slotTemplate?.thematic,
        location: slot.slotTemplate?.location?.name,
        secondaryTags: slot.pathway?.template?.secondaryTags ?? [],
        states: slotStates,
        templateID: slot.slotTemplate?.id,
        capacity: slot.slotTemplate?.capacity,
        appointments: slot.appointments,
        locked: slot.locked,
        // Supprimé mais gardé pour ses rendez-vous : plus rien ne s'y pose.
        archived: !!slot.archivedAt,
        conflicts: conflictLabels?.get(slot.id) ?? [],
      },
    }
  })
}

/**
 * Une ligne du tableau Agenda : un créneau du jour, avec les patients de
 * tous ses rendez-vous.
 */
export type DaySlotRow = {
  id: string
  slotId: string
  // Sous-ligne d'un créneau individuel : un de ses rendez-vous, ou un intervalle libre.
  kind?: 'appointment' | 'free'
  subRows?: DaySlotRow[]
  // Le rendez-vous du créneau quand il n'y en a qu'un : cible des actions de la ligne.
  appointmentId: string | null
  startDate: string
  endDate: string
  thematic: string
  thematicId?: string | null
  location: string
  soignants: Soignant[]
  patients: (AppointmentPatient & { appointmentId: string })[]
  type?: string
  isIndividual: boolean
  capacity: number
  // Un patient peut encore y prendre rendez-vous.
  canBook: boolean
  // Pourquoi on n'y prend plus rendez-vous, quoi qu'il reste de libre.
  closed?: 'locked' | 'archived'
}

const toRowPatients = (appointments: Appointment[]) =>
  appointments.flatMap((appointment) =>
    (appointment.appointmentPatients ?? []).map((appointmentPatient) => ({
      ...appointmentPatient,
      appointmentId: appointment.id,
    })),
  )

const byStartDate = (a: { startDate: string }, b: { startDate: string }) =>
  dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf()

const closedReason = (slot: Slot): DaySlotRow['closed'] => {
  if (slot.archivedAt) {
    return 'archived'
  }
  return slot.locked ? 'locked' : undefined
}

const buildDaySlotRow = (slot: Slot): DaySlotRow => {
  const appointments = slot.appointments ?? []
  // Un créneau supprimé n'accepte plus d'inscription, même s'il reste affiché.
  const bookable = !slot.locked && !slot.archivedAt
  const single = appointments.length === 1 ? appointments[0] : null
  const isIndividual = slot.slotTemplate?.isIndividual ?? false
  const row: DaySlotRow = {
    id: slot.id,
    slotId: slot.id,
    appointmentId: single?.id ?? null,
    startDate: slot.startDate,
    endDate: slot.endDate,
    thematic: single?.thematic ?? slot.slotTemplate?.thematic ?? '',
    thematicId: single?.thematicId ?? slot.slotTemplate?.thematicId,
    location: slot.slotTemplate?.location?.name ?? '',
    soignants: slot.slotTemplate?.soignants ?? [],
    patients: toRowPatients(appointments),
    type: slot.slotTemplate?.type ?? undefined,
    isIndividual,
    capacity: slot.slotTemplate?.capacity ?? 1,
    canBook: bookable && hasSlotAvailability(slot),
    closed: closedReason(slot),
  }
  if (!isIndividual || appointments.length === 0) {
    return row
  }

  // Rendez-vous sur un créneau individuel : un sous-tableau, où l'on
  // prend rendez-vous sur les intervalles libres.
  const empty = {
    thematic: '',
    thematicId: null,
    patients: [],
    type: undefined,
  }
  return {
    ...row,
    canBook: false,
    subRows: [
      ...appointments.map((appointment) => ({
        ...row,
        id: appointment.id,
        kind: 'appointment' as const,
        appointmentId: appointment.id,
        startDate: appointment.startDate,
        endDate: appointment.endDate,
        thematic: appointment.thematic ?? row.thematic,
        thematicId: appointment.thematicId,
        patients: toRowPatients([appointment]),
        canBook: false,
      })),
      ...getFreeIntervals(slot).map((interval) => ({
        ...row,
        ...empty,
        id: `${slot.id}_libre_${interval.start}`,
        kind: 'free' as const,
        appointmentId: null,
        startDate: interval.start,
        endDate: interval.end,
        canBook: bookable,
      })),
    ].sort(byStartDate),
  }
}

/**
 * Garde les créneaux du jour demandé (comparaison en UTC), sauf les archivés
 * restés vides, et trie par heure de début croissante.
 */
export const buildDaySlotRows = (
  slots: Slot[] | undefined,
  day: Dayjs,
): DaySlotRow[] => {
  if (!slots) {
    return []
  }

  return slots
    .filter(
      (slot) =>
        dayjs.utc(slot.startDate).isSame(day, 'day') && isSlotVisible(slot),
    )
    .map(buildDaySlotRow)
    .sort(byStartDate)
}

export const buildCalendarEventsFromSlotTemplates = (
  slotTemplates: SlotTemplate[],
  startDate: string,
): CalendarEvent[] => {
  if (!slotTemplates) {
    return []
  }
  return slotTemplates.map((slotTemplate) => {
    const offset = slotTemplate.offsetDays ?? 0
    const base = dayjs.utc(startDate).add(offset, 'day').toISOString()

    const start = combineDateAndTime(base, slotTemplate.startTime)
    const end = combineDateAndTime(base, slotTemplate.endTime)

    const templateColor = slotTemplate.color ?? '#2563eb'
    return {
      id: `template_${slotTemplate.id}`,
      title: slotTemplate.soignants?.length
        ? slotTemplate.soignants.map((s) => s.name).join(', ')
        : 'Soignant inconnu',
      start: start.toISOString(),
      end: end.toISOString(),
      color: templateColor,
      contrastColor: getContrastTextColor(templateColor),
      extendedProps: {
        type: 'template',
        thematic: slotTemplate.thematic,
        location: slotTemplate.location?.name,
        capacity: slotTemplate.capacity,
        isIndividual: slotTemplate.isIndividual ?? false,
      },
    }
  })
}

export function buildPathwayEvents(pathways: Pathway[]): CalendarEvent[] {
  return pathways.map((pathway) => {
    const endDate = pathway.slots?.reduce((max, slot) => {
      return dayjs.utc(slot.endDate).isAfter(dayjs.utc(max))
        ? slot.endDate
        : max
    }, pathway.startDate)

    const weekStart = dayjs.utc(pathway.startDate).isoWeekday(1).startOf('day')
    const weekEnd = dayjs
      .utc(endDate ?? pathway.startDate)
      .isoWeekday(1)
      .add(7, 'day')
      .startOf('day')

    // Collect distinct weeks (as ISO monday dates) where slots exist
    const slotWeeks = [
      ...new Set(
        (pathway.slots ?? []).map((slot) =>
          dayjs
            .utc(slot.startDate)
            .isoWeekday(1)
            .startOf('day')
            .format('YYYY-MM-DD'),
        ),
      ),
    ].sort()

    return {
      id: pathway.id,
      title: pathway.template?.name ?? 'Parcours inconnu',
      start: weekStart.format('YYYY-MM-DD'),
      end: weekEnd.format('YYYY-MM-DD'),
      color: pathway.template?.color ?? '#2563eb',
      extendedProps: {
        type: 'pathway',
        slotWeeks,
      },
    }
  })
}

/**
 * Date / Time
 */
export function combineDateAndTime(
  date: Date | string,
  time: Date | string,
): Date {
  const baseDate = dayjs.utc(date)
  const baseTime = dayjs.utc(time)

  return baseDate
    .hour(baseTime.hour())
    .minute(baseTime.minute())
    .second(baseTime.second())
    .millisecond(baseTime.millisecond())
    .toDate()
}

/** « Coaching (30min) » : le nom de la thématique, suivi de sa durée quand elle en a une. */
export const thematicLabel = ({
  name,
  duration,
}: {
  name: string
  duration?: number | null
}) => (duration ? `${name} (${duration}min)` : name)

/** Libellé de la thématique `id`, à défaut `fallback` (nom seul, thématique introuvable). */
export const thematicLabelByID = (
  thematics: Thematic[] | undefined,
  id: string | null | undefined,
  fallback?: string,
) => {
  const thematic = thematics?.find((t) => t.id === id)
  return thematic ? thematicLabel(thematic) : fallback
}

export const formatDuration = (start?: Date | string, end?: Date | string) => {
  if (!start || !end) {
    return ''
  }

  const diffInMinutes = dayjs(end).diff(dayjs(start), 'minute')
  const hours = Math.floor(diffInMinutes / 60)
  const minutes = diffInMinutes % 60

  if (hours === 0) {
    return `(${minutes}min)`
  }

  if (minutes === 0) {
    return `(${hours}h)`
  }

  return `(${hours}h${minutes})`
}

export const generateDurationOptions = (
  startDate?: string,
  maxDate?: string,
) => {
  if (!startDate || !maxDate) {
    return []
  }

  const maxMinutes = dayjs(maxDate).diff(dayjs(startDate), 'minute')
  const options = []

  for (let min = 15; min <= maxMinutes; min += 15) {
    const hours = Math.floor(min / 60)
    const minutes = min % 60
    let label = ''
    if (hours && minutes) {
      label = `${hours}h${minutes}`
    } else if (hours) {
      label = `${hours}h`
    } else {
      label = `${minutes}min`
    }

    options.push({ label, value: min.toString() })
  }

  return options
}

// Agenda : un tableau par soignant (un créneau partagé apparaît dans chacun), limité
// aux soignants cochés s'il y en a. Un soignant masqué de l'Agenda (MDS-76) compte
// comme absent : ses créneaux vont dans « Sans soignant ».
export const groupDaySlotRowsBySoignant = (
  rows: DaySlotRow[],
  selectedSoignantIDs: string[],
  soignants: Soignant[],
) => {
  const hiddenIDs = new Set(
    soignants.filter((s) => s.hiddenInAgenda).map((s) => s.id),
  )
  const visibles = (row: DaySlotRow) =>
    row.soignants.filter((s) => !hiddenIDs.has(s.id))
  const bySoignant = new Map(rows.flatMap(visibles).map((s) => [s.id, s]))
  const result: { soignant: Soignant | null; rows: DaySlotRow[] }[] = [
    ...bySoignant.values(),
  ]
    .filter(
      (s) =>
        selectedSoignantIDs.length === 0 || selectedSoignantIDs.includes(s.id),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    .map((soignant) => ({
      soignant,
      rows: rows.filter((row) =>
        row.soignants.some((s) => s.id === soignant.id),
      ),
    }))
  const withoutSoignant = rows.filter((row) => visibles(row).length === 0)
  if (selectedSoignantIDs.length === 0 && withoutSoignant.length > 0) {
    result.push({ soignant: null, rows: withoutSoignant })
  }
  return result
}
