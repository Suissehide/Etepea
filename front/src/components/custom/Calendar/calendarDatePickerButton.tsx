import {
  DateCalendar,
  LocalizationProvider,
  type PickerDayProps,
} from '@mui/x-date-pickers'
import dayjs, { type Dayjs } from 'dayjs'
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import type { PlanningCycle } from '../../../types/planningCycle.ts'
import { cycleWeekNumber } from '../../../utils/weekCycle.ts'
import { WeekDay } from '../../ui/weekPicker.tsx'

// Aujourd'hui reste bien visible à côté de la date sélectionnée.
export const DATE_CALENDAR_SX = {
  '& .MuiPickerDay-today': {
    outlineColor: 'var(--primary)',
    color: 'var(--primary)',
    fontWeight: 600,
  },
}

// Les jours de semaine perdent leur marge : libellés et numéros de semaine suivent.
const PICKER_SX = {
  ...DATE_CALENDAR_SX,
  '& .MuiPickerDay-root': { '--PickerDay-horizontalMargin': '0px' },
  '& .MuiDayCalendar-weekDayLabel, & .MuiDayCalendar-weekNumberLabel': {
    width: 36,
    margin: 0,
  },
  '& .MuiDayCalendar-weekNumber': {
    width: 36,
    margin: 0,
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-light)',
  },
}

/** Largeur du calendrier MUI, bordure comprise. */
const POPOVER_WIDTH = 322

/** Lundi de la semaine ISO `n` la plus proche de `autour` : MUI ne donne que le numéro. */
function lundiDeLaSemaine(n: number, autour: Dayjs): Dayjs {
  const lundis = [-1, 0, 1].map((decalage) =>
    dayjs
      .utc(`${autour.year() + decalage}-01-04`)
      .startOf('isoWeek')
      .add(n - 1, 'week'),
  )
  const ecart = (lundi: Dayjs) => Math.abs(lundi.diff(autour, 'day'))
  return lundis.reduce((a, b) => (ecart(b) < ecart(a) ? b : a))
}

/** Même convention que le titre du calendrier : S7 dans le cycle, s45 sans cycle. */
export function libelleSemaine(
  n: number,
  mois: Dayjs,
  cycle?: PlanningCycle | null,
): string {
  if (!cycle) {
    return `s${n}`
  }
  const semaine = cycleWeekNumber(
    lundiDeLaSemaine(n, mois.add(15, 'day')),
    cycle,
  )
  return semaine === null ? '–' : `S${semaine}`
}

interface Props {
  anchorEl: HTMLElement | null
  setAnchorEl: Dispatch<SetStateAction<HTMLElement | null>>
  onChange: (date: Dayjs | null) => void
  /** Date affichée par le calendrier, présélectionnée à l'ouverture. */
  value?: Dayjs
  /** Vrai : toute la semaine de `value` est coloriée. */
  semaine?: boolean
  /** Cycle du service, pour numéroter les semaines ; absent = numéros ISO. */
  cycle?: PlanningCycle | null
  /** Débuts des semaines interdites, coloriées en rouge. */
  semainesInterdites?: string[]
}

export default function CalendarDatePickerButton({
  anchorEl,
  setAnchorEl,
  ...props
}: Props) {
  const ouvert = !!anchorEl
  // Échap ferme ; en capture, pour ne pas vider aussi la sélection du planning.
  useEffect(() => {
    if (!ouvert) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setAnchorEl(null)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [ouvert, setAnchorEl])

  if (!anchorEl) {
    return null
  }

  const rect = anchorEl.getBoundingClientRect()

  return createPortal(
    <>
      {/* Voile de fermeture : un vrai bouton, donc atteignable au clavier. */}
      <button
        type="button"
        aria-label="Fermer le selecteur de date"
        className="fixed inset-0 z-[199]"
        onClick={() => setAnchorEl(null)}
      />
      <div
        style={{
          position: 'fixed',
          top: rect.bottom + 8,
          // Aligné à gauche du déclencheur, sans déborder de l'écran à droite.
          left: Math.max(
            8,
            Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8),
          ),
          zIndex: 200,
        }}
        className="rounded-md border border-border bg-popover shadow-md animate-in fade-in-0 zoom-in-95"
      >
        <Selecteur {...props} />
      </div>
    </>,
    document.body,
  )
}

// Monté à chaque ouverture : mois affiché et survol repartent de zéro.
function Selecteur({
  onChange,
  value,
  semaine,
  cycle,
  semainesInterdites = [],
}: Omit<Props, 'anchorEl' | 'setAnchorEl'>) {
  const date = value ?? dayjs.utc()
  const interdites = new Set(
    semainesInterdites.map((d) =>
      dayjs.utc(d).isoWeekday(1).format('YYYY-MM-DD'),
    ),
  )
  const [mois, setMois] = useState(date.startOf('month'))
  const [hoveredDay, setHoveredDay] = useState<Dayjs | null>(null)

  return (
    // Imbriqué : ne remplace que ces deux libellés, le reste vient du fournisseur racine.
    <LocalizationProvider
      localeText={{
        calendarWeekNumberHeaderText: '',
        calendarWeekNumberText: (n: number) => libelleSemaine(n, mois, cycle),
      }}
    >
      <DateCalendar
        onChange={onChange}
        defaultValue={date}
        timezone="UTC"
        onMonthChange={setMois}
        displayWeekNumber
        sx={PICKER_SX}
        slots={{ day: WeekDay as React.ComponentType<PickerDayProps> }}
        slotProps={{
          // Hors vue semaine, ni semaine sélectionnée ni survol : le jour sélectionné reste celui de MUI.
          day: ((ownerState: PickerDayProps) => ({
            selectedWeekStart: semaine ? date.isoWeekday(1) : null,
            hoveredWeekStart: semaine
              ? (hoveredDay?.isoWeekday(1) ?? null)
              : null,
            isForbidden: interdites.has(
              ownerState.day.isoWeekday(1).format('YYYY-MM-DD'),
            ),
            onPointerEnter: () => setHoveredDay(ownerState.day),
            onPointerLeave: () => setHoveredDay(null),
          })) as never,
        }}
      />
    </LocalizationProvider>
  )
}
