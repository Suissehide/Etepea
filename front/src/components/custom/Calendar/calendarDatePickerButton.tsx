import { DateCalendar, type PickerDayProps } from '@mui/x-date-pickers'
import dayjs, { type Dayjs } from 'dayjs'
import { type Dispatch, type SetStateAction, useState } from 'react'
import { createPortal } from 'react-dom'

import { WeekDay } from '../../ui/weekPicker.tsx'

// Aujourd'hui reste bien visible à côté de la date sélectionnée.
export const DATE_CALENDAR_SX = {
  '& .MuiPickerDay-today': {
    outlineColor: 'var(--primary)',
    color: 'var(--primary)',
    fontWeight: 600,
  },
}

// Les jours de semaine perdent leur marge : les libellés suivent, sinon ils se décalent.
const WEEK_SX = {
  ...DATE_CALENDAR_SX,
  '& .MuiDayCalendar-weekDayLabel': { width: 36, margin: 0 },
}

/** Largeur du calendrier MUI, bordure comprise. */
const POPOVER_WIDTH = 322

interface Props {
  anchorEl: HTMLElement | null
  setAnchorEl: Dispatch<SetStateAction<HTMLElement | null>>
  onChange: (date: Dayjs | null) => void
  /** Date affichée par le calendrier, présélectionnée à l'ouverture. */
  value?: Dayjs
  /** Vrai : toute la semaine de `value` est coloriée. */
  semaine?: boolean
}

export default function CalendarDatePickerButton({
  anchorEl,
  setAnchorEl,
  onChange,
  value,
  semaine,
}: Props) {
  const [hoveredDay, setHoveredDay] = useState<Dayjs | null>(null)
  if (!anchorEl) {
    return null
  }

  const rect = anchorEl.getBoundingClientRect()
  const date = value ?? dayjs.utc()

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
        {semaine ? (
          <DateCalendar
            onChange={onChange}
            defaultValue={date}
            timezone="UTC"
            sx={WEEK_SX}
            slots={{ day: WeekDay as React.ComponentType<PickerDayProps> }}
            slotProps={{
              day: ((ownerState: PickerDayProps) => ({
                selectedWeekStart: date.isoWeekday(1),
                hoveredWeekStart: hoveredDay?.isoWeekday(1) ?? null,
                isForbidden: false,
                onPointerEnter: () => setHoveredDay(ownerState.day),
                onPointerLeave: () => setHoveredDay(null),
              })) as never,
            }}
          />
        ) : (
          <DateCalendar
            onChange={onChange}
            defaultValue={date}
            timezone="UTC"
            sx={DATE_CALENDAR_SX}
          />
        )}
      </div>
    </>,
    document.body,
  )
}
