import {
  DateCalendar,
  DateField,
  PickerDay,
  type PickerDayProps,
} from '@mui/x-date-pickers'
import type { Dayjs } from 'dayjs'
import { useState } from 'react'

import { Button } from '../../../ui/button.tsx'
import {
  type ExportPeriod,
  MAX_WEEK_COUNT,
  periodBetween,
} from './export-period.ts'

export type PeriodBound = 'from' | 'to'

interface ExportCustomPeriodProps {
  initialFrom: Dayjs
  initialTo: Dayjs
  /** Borne que le calendrier remplit au premier clic. */
  initialFocus: PeriodBound
  onApply: (period: ExportPeriod) => void
  onCancel: () => void
}

interface RangeDayProps {
  from: Dayjs | null
  to: Dayjs | null
}

const isValid = (date: Dayjs | null): date is Dayjs => !!date?.isValid()

// Le calendrier gratuit de MUI ne sait pas surligner une plage : on la dessine
// jour par jour, bornes pleines et jours intermédiaires en bande.
function RangeDay(props: PickerDayProps & RangeDayProps) {
  const { day, from, to, ...other } = props
  const isFrom = isValid(from) && day.isSame(from, 'day')
  const isTo = isValid(to) && day.isSame(to, 'day')
  const inside =
    isValid(from) &&
    isValid(to) &&
    day.isAfter(from, 'day') &&
    day.isBefore(to, 'day')

  return (
    <PickerDay
      {...other}
      day={day}
      selected={isFrom || isTo}
      sx={{
        '--PickerDay-horizontalMargin': '0px',
        ...(inside && {
          borderRadius: 0,
          backgroundColor:
            'color-mix(in srgb, var(--primary) 15%, transparent)',
          color: 'var(--primary-dark)',
        }),
      }}
    />
  )
}

/** Période libre : saisie au clavier ou deux clics dans le calendrier. */
export default function ExportCustomPeriod({
  initialFrom,
  initialTo,
  initialFocus,
  onApply,
  onCancel,
}: ExportCustomPeriodProps) {
  const [from, setFrom] = useState<Dayjs | null>(initialFrom)
  const [to, setTo] = useState<Dayjs | null>(initialTo)
  const [focus, setFocus] = useState<PeriodBound>(initialFocus)
  // Le calendrier suit la dernière date touchée, au clavier comme à la souris.
  const [shown, setShown] = useState<Dayjs>(
    initialFocus === 'to' ? initialTo : initialFrom,
  )

  const reversed = isValid(from) && isValid(to) && to.isBefore(from, 'day')
  const period =
    isValid(from) && isValid(to) && !reversed ? periodBetween(from, to) : null
  const tooLong = !!period && period.weekCount > MAX_WEEK_COUNT

  const handleType = (bound: PeriodBound) => (value: Dayjs | null) => {
    ;(bound === 'from' ? setFrom : setTo)(value)
    if (isValid(value)) {
      setShown(value)
    }
  }

  const handlePick = (day: Dayjs | null) => {
    if (!isValid(day)) {
      return
    }
    setShown(day)
    if (focus === 'from') {
      setFrom(day)
      if (isValid(to) && to.isBefore(day, 'day')) {
        setTo(null)
      }
      setFocus('to')
    } else if (isValid(from) && day.isBefore(from, 'day')) {
      setFrom(day)
    } else {
      setTo(day)
      setFocus('from')
    }
  }

  return (
    <div className="flex w-[360px] flex-col">
      <div className="px-5 pt-4 text-base font-semibold text-foreground">
        Période personnalisée
      </div>
      <div className="grid grid-cols-2 gap-3 px-5 pt-4">
        <DateField
          label="Du"
          value={from}
          onChange={handleType('from')}
          format="DD/MM/YYYY"
          timezone="UTC"
          size="small"
          slotProps={{
            textField: {
              onFocus: () => setFocus('from'),
              focused: focus === 'from' ? true : undefined,
            },
          }}
        />
        <DateField
          label="Au"
          value={to}
          onChange={handleType('to')}
          format="DD/MM/YYYY"
          timezone="UTC"
          size="small"
          slotProps={{
            textField: {
              onFocus: () => setFocus('to'),
              focused: focus === 'to' ? true : undefined,
              error: reversed,
              helperText: reversed ? 'Avant la date de début' : undefined,
            },
          }}
        />
      </div>
      <DateCalendar
        value={shown}
        onChange={handlePick}
        timezone="UTC"
        views={['day']}
        slots={{ day: RangeDay as React.ComponentType<PickerDayProps> }}
        slotProps={{ day: { from, to } as never }}
        sx={{ width: 320, height: 'auto', margin: '4px auto 0' }}
      />
      <p className="mx-5 mt-1 mb-0 rounded-md bg-surface-douce px-2.5 py-2 text-xs leading-normal text-text-dark">
        {period
          ? `L’export prend des semaines entières : du lundi ${period.weekStart.format('DD/MM/YYYY')} au vendredi ${period.weekStart
              .add(period.weekCount - 1, 'week')
              .add(4, 'day')
              .format(
                'DD/MM/YYYY',
              )}, ${period.weekCount} page${period.weekCount > 1 ? 's' : ''}.${tooLong ? ` Maximum ${MAX_WEEK_COUNT} semaines.` : ''}`
          : 'Saisissez les deux dates ou cliquez-les dans le calendrier.'}
      </p>
      <div className="flex justify-end gap-2 px-4 pt-3 pb-3.5">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          disabled={!period || tooLong}
          onClick={() => period && onApply(period)}
        >
          Valider
        </Button>
      </div>
    </div>
  )
}
