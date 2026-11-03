import dayjs, { type Dayjs } from 'dayjs'
import type { ReactNode } from 'react'

import { FormField } from '../ui/formField.tsx'
import { Select, type SelectOption } from '../ui/select.tsx'
import { TimePicker } from '../ui/timePicker.tsx'

interface AppointmentTimeFieldsProps {
  /** Date ISO du créneau, affichée en toutes lettres. */
  date: string
  /** Masque la date quand le contexte l'affiche déjà ailleurs. */
  showDate?: boolean
  startTime: Dayjs
  onStartTimeChange: (value: Dayjs) => void
  duration: string
  onDurationChange: (value: string) => void
  durationOptions: SelectOption[]
  disabled?: boolean
  durationDisabled?: boolean
  durationFieldId?: string
  startTimeInfo?: ReactNode
  durationInfo?: ReactNode
  /** Borne inférieure du TimePicker — restreint le choix à un intervalle libre. */
  minTime?: Dayjs
  /** Borne supérieure du TimePicker — restreint le choix à un intervalle libre. */
  maxTime?: Dayjs
  /** Débuts permis (dates ISO) : remplacent le TimePicker par une liste. */
  startTimeOptions?: SelectOption[]
}

export function AppointmentTimeFields({
  date,
  showDate = true,
  startTime,
  onStartTimeChange,
  duration,
  onDurationChange,
  durationOptions,
  disabled = false,
  durationDisabled = false,
  durationFieldId,
  startTimeInfo,
  durationInfo,
  minTime,
  maxTime,
  startTimeOptions,
}: AppointmentTimeFieldsProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {showDate && (
        <div className="text-sm font-medium">
          {dayjs
            .utc(date)
            .format('dddd D MMMM')
            .replace(/^./, (c) => c.toUpperCase())}
        </div>
      )}

      <FormField className="flex-row items-center gap-2">
        <div className="text-sm text-text-light font-medium mb-0">à</div>
        <div>
          {startTimeOptions?.length === 0 && (
            <span className="text-sm text-destructive">
              aucune tranche libre
            </span>
          )}
          {!!startTimeOptions?.length && (
            <Select
              options={startTimeOptions}
              value={startTime.toISOString()}
              onValueChange={(value) => onStartTimeChange(dayjs.utc(value))}
              disabled={disabled}
              clearable={false}
            />
          )}
          {!startTimeOptions && (
            <TimePicker
              value={startTime}
              onChange={(time) => onStartTimeChange(time ?? dayjs.utc())}
              disabled={disabled}
              minTime={minTime}
              maxTime={maxTime}
            />
          )}
          {startTimeInfo}
        </div>
      </FormField>

      <FormField className="flex-row items-center gap-2">
        <div className="text-sm text-text-light font-medium mb-0">pendant</div>
        <div>
          <Select
            id={durationFieldId}
            options={durationOptions}
            value={duration}
            onValueChange={onDurationChange}
            disabled={disabled || durationDisabled}
            clearable={false}
          />
          {durationInfo}
        </div>
      </FormField>
    </div>
  )
}
