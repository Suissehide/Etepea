import dayjs, { type Dayjs } from 'dayjs'

import { cn } from '../../libs/utils.ts'

type WeekDayStripProps = {
  value: Dayjs
  onChange: (day: Dayjs) => void
}

export default function WeekDayStrip({ value, onChange }: WeekDayStripProps) {
  const weekStart = value.isoWeekday(1).startOf('day')
  const days = Array.from({ length: 7 }, (_, index) =>
    weekStart.add(index, 'day'),
  )
  const today = dayjs.utc().startOf('day')

  return (
    // Sa propre ligne sous la barre de l'agenda, sur toute la largeur : les flèches changent de
    // semaine, la bande change de jour.
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const isSelected = day.isSame(value, 'day')
        const isCurrentDay = day.isSame(today, 'day')

        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onChange(day)}
            aria-current={isSelected ? 'date' : undefined}
            className={cn(
              'flex h-[60px] w-full flex-col items-center justify-center gap-0.5 rounded-[10px] cursor-pointer transition-colors',
              isSelected
                ? 'bg-primary text-primary-foreground'
                : 'text-text-light hover:bg-muted',
            )}
          >
            <span className="text-[13px] font-medium capitalize">
              {day.format('ddd')}
            </span>
            <span
              className={cn(
                'text-lg font-semibold leading-tight',
                !isSelected && 'text-foreground',
              )}
            >
              {day.format('D')}
            </span>
            <span
              className={cn(
                'h-[5px] w-[5px] rounded-full',
                !isCurrentDay && 'bg-transparent',
                isCurrentDay && !isSelected && 'bg-primary',
                isCurrentDay && isSelected && 'bg-primary-foreground',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
