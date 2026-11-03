import dayjs, { type Dayjs } from 'dayjs'
import {
  ArrowRight,
  CalendarArrowUp,
  ChevronLeft,
  ChevronRight,
  Copy,
} from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useEffect, useState } from 'react'

import { cn } from '../../../libs/utils.ts'
import type { ForbiddenWeek } from '../../../types/forbiddenWeek.ts'
import type { PlanningCycle } from '../../../types/planningCycle.ts'
import { cycleWeekNumber } from '../../../utils/weekCycle.ts'
import { Button } from '../../ui/button.tsx'
import { Popup, PopupContent, PopupFooter } from '../../ui/popup.tsx'

export type BulkWeekMode = 'duplicate' | 'move'

interface BaseProps {
  open: boolean
  setOpen: (open: boolean) => void
  mode: BulkWeekMode
  count: number
}

interface CalendarProps extends BaseProps {
  editMode?: false
  /** Lundi (UTC) de la semaine affichée. */
  sourceWeek: Dayjs
  planningCycle?: PlanningCycle | null
  forbiddenWeeks: ForbiddenWeek[]
  onConfirm: (weekDate: Dayjs) => void
}

interface EditModeProps extends BaseProps {
  editMode: true
  sourceWeek: number
  weekCount: number
  onConfirm: (targetWeekNum: number) => void
  planningCycle?: never
  forbiddenWeeks?: never
}

type BulkWeekFormProps = CalendarProps | EditModeProps

const MODES = {
  duplicate: { verb: 'Dupliquer', icon: Copy },
  move: { verb: 'Déplacer', icon: CalendarArrowUp },
}

const WEEKDAYS = [
  ['lun', 'L'],
  ['mar', 'M'],
  ['mer', 'M'],
  ['jeu', 'J'],
  ['ven', 'V'],
  ['sam', 'S'],
  ['dim', 'D'],
]

const QUICK_OFFSETS = [1, 2, 3, 4]
const quickLabel = (offset: number) =>
  offset === 1 ? 'Semaine suivante' : `Dans ${offset} semaines`

const slots = (count: number) => `${count} créneau${count > 1 ? 'x' : ''}`

/** Une semaine présentée par la popup, quel que soit le mode. */
type Week = {
  key: string
  short: string
  long: string
  range?: string
  forbidden?: boolean
  past?: boolean
}

type CalendarContext = {
  cycle?: PlanningCycle | null
  forbidden: Set<string>
}

function calendarWeek(
  monday: Dayjs,
  { cycle, forbidden }: CalendarContext,
): Week {
  const friday = monday.add(4, 'day')
  const key = monday.format('YYYY-MM-DD')
  const n = forbidden.has(key)
    ? null
    : cycle
      ? cycleWeekNumber(monday, cycle)
      : monday.isoWeek()
  const range =
    monday.month() === friday.month()
      ? `du ${monday.format('D')} au ${friday.format('D MMM')}`
      : `du ${monday.format('D MMM')} au ${friday.format('D MMM')}`
  const dates =
    monday.month() === friday.month()
      ? `${monday.format('D')} – ${friday.format('D MMM')}`
      : `${monday.format('D MMM')} – ${friday.format('D MMM')}`
  const short = n === null ? `semaine du ${monday.format('D MMM')}` : `S${n}`
  return {
    key,
    short,
    long: `${n === null ? 'Interdite' : short} · ${dates}`,
    range,
    forbidden: n === null,
    past: monday.isBefore(dayjs.utc().isoWeekday(1).startOf('day')),
  }
}

const templateWeek = (n: number): Week => ({
  key: String(n),
  short: `S${n}`,
  long: `Semaine ${n}`,
})

function summary(mode: BulkWeekMode, count: number, from: Week, to: Week) {
  const name = to.forbidden ? 'semaine interdite' : to.short
  // « nov. » porte déjà le point final.
  const where = to.range ? `${name}, ${to.range}` : `${name}.`
  if (mode === 'duplicate') {
    return count > 1
      ? `${count} créneaux seront créés en ${where} ${from.short} ne change pas.`
      : `1 créneau sera créé en ${where} ${from.short} ne change pas.`
  }
  return count > 1
    ? `Les ${count} créneaux de ${from.short} passeront en ${where} ${from.short} sera vidée de ces créneaux.`
    : `Le créneau de ${from.short} passera en ${where} ${from.short} sera vidée de ce créneau.`
}

export function BulkWeekForm(props: BulkWeekFormProps) {
  const { open, setOpen, mode, count } = props
  const { verb, icon: Icon } = MODES[mode]
  // La cible est une semaine du cycle (mode semaines fixes) ou un lundi UTC.
  const [target, setTarget] = useState<Dayjs | number | null>(null)

  const source = props.sourceWeek
  const forbiddenKeys = new Set(
    (props.forbiddenWeeks ?? []).map((w) =>
      dayjs.utc(w.startOfWeek).format('YYYY-MM-DD'),
    ),
  )
  // Chaîne plutôt que Set : une dépendance stable d'un rendu à l'autre.
  const forbiddenJoined = [...forbiddenKeys].join()
  useEffect(() => {
    if (!open) {
      return
    }
    if (props.editMode) {
      setTarget((source as number) + 1)
    } else {
      // Première semaine ni passée ni interdite après la source.
      let next = (source as Dayjs).add(1, 'week')
      const current = dayjs.utc().isoWeekday(1).startOf('day')
      next = next.isBefore(current) ? current : next
      const skip = forbiddenJoined.split(',')
      while (skip.includes(next.format('YYYY-MM-DD'))) {
        next = next.add(1, 'week')
      }
      setTarget(next)
    }
  }, [open, props.editMode, source, forbiddenJoined])

  const calendar: CalendarContext = {
    cycle: props.planningCycle,
    forbidden: forbiddenKeys,
  }
  const weekOf = (value: Dayjs | number): Week =>
    props.editMode
      ? templateWeek(value as number)
      : calendarWeek(value as Dayjs, calendar)
  const sameWeek = (a: Dayjs | number | null, b: Dayjs | number) =>
    a !== null && (typeof a === 'number' ? a === b : a.isSame(b as Dayjs))
  const shift = (offset: number): Dayjs | number =>
    props.editMode
      ? props.sourceWeek + offset
      : props.sourceWeek.add(offset, 'week')

  const from = weekOf(source)
  const to = target === null ? null : weekOf(target)

  const confirm = () => {
    if (target === null) {
      return
    }
    if (props.editMode) {
      props.onConfirm(target as number)
    } else {
      props.onConfirm(target as Dayjs)
    }
  }

  return (
    <Popup modal open={open} onOpenChange={setOpen}>
      <PopupContent className="w-[520px] rounded-xl">
        <div className="flex items-center gap-3.5 border-b border-border px-5 py-[18px] pr-14">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dbe6fd]">
            <Icon size={18} className="text-primary" />
          </span>
          <div className="flex flex-col gap-0.5">
            <Dialog.Title className="m-0 text-lg font-bold text-foreground">
              {verb} {slots(count)}
            </Dialog.Title>
            <span className="text-[13px] text-text-light">
              Ils gardent leur jour et leur horaire.
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-[18px]">
          <div className="grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)] items-center gap-2">
            <div className="flex flex-col gap-1 rounded-lg bg-muted px-3 py-2.5">
              <span className="text-xs text-text-light">De</span>
              <span className="text-sm font-semibold text-foreground">
                {from.long}
              </span>
            </div>
            <ArrowRight
              size={18}
              className="justify-self-center text-[#94a3b8]"
            />
            <div className="flex flex-col gap-1 rounded-lg border-[1.5px] border-primary bg-blue-50 px-3 py-2.5 text-primary-dark">
              <span className="text-xs">Vers</span>
              <span className="text-sm font-semibold">{to?.long ?? '—'}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_OFFSETS.map((offset) => {
              const week = shift(offset)
              const active = sameWeek(target, week)
              return (
                <button
                  key={offset}
                  type="button"
                  disabled={weekOf(week).past}
                  onClick={() => setTarget(week)}
                  className={cn(
                    'h-[30px] cursor-pointer rounded-full border px-3 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-40',
                    active
                      ? 'border-primary bg-blue-50 text-primary-dark'
                      : 'border-border text-text-dark hover:bg-muted',
                  )}
                >
                  {quickLabel(offset)}
                </button>
              )
            })}
          </div>

          {props.editMode ? (
            <TemplateWeekList
              weekCount={Math.max(props.weekCount, props.sourceWeek + 4)}
              source={props.sourceWeek}
              target={target as number | null}
              onPick={setTarget}
            />
          ) : (
            <WeekCalendar
              source={props.sourceWeek}
              target={target as Dayjs | null}
              calendar={calendar}
              onPick={setTarget}
            />
          )}

          {to && (
            <p className="m-0 text-[13px] leading-normal text-text-dark">
              {summary(mode, count, from, to)}
            </p>
          )}
        </div>

        <PopupFooter className="px-5 py-3.5">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={confirm} disabled={!to}>
            <Icon className="h-4 w-4" />
            {verb}
            {to ? ` en ${to.short}` : ''}
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}

const ROW =
  'grid h-10 w-full grid-cols-[44px_repeat(7,minmax(0,1fr))_64px] items-center rounded-lg border-none p-0 text-sm'

function rowState(isSource: boolean, isTarget: boolean, past?: boolean) {
  if (isTarget) {
    return 'bg-primary font-semibold text-white'
  }
  if (isSource) {
    return 'cursor-default bg-muted'
  }
  if (past) {
    return 'cursor-default text-[#cbd5e1]'
  }
  return 'cursor-pointer bg-transparent hover:shadow-[inset_0_0_0_1.5px_#93c5fd]'
}

function RowTag({
  isSource,
  isTarget,
  forbidden,
}: {
  isSource: boolean
  isTarget: boolean
  forbidden?: boolean
}) {
  const tag = isTarget
    ? { label: 'Cible', className: 'bg-white/20 text-white' }
    : isSource
      ? { label: 'Source', className: 'bg-border text-text-dark' }
      : forbidden
        ? { label: 'Interdite', className: 'bg-red-50 text-red-700' }
        : null
  return (
    <span className="mr-2 justify-self-end">
      {tag && (
        <span
          className={cn(
            'rounded-lg px-[7px] py-0.5 text-[11px] font-semibold',
            tag.className,
          )}
        >
          {tag.label}
        </span>
      )}
    </span>
  )
}

function WeekCalendar({
  source,
  target,
  calendar,
  onPick,
}: {
  source: Dayjs
  target: Dayjs | null
  calendar: CalendarContext
  onPick: (monday: Dayjs) => void
}) {
  const [month, setMonth] = useState(() => (target ?? source).startOf('month'))
  // Un raccourci peut viser une semaine d'un autre mois : on l'y suit.
  useEffect(() => {
    if (target) {
      setMonth(target.isoWeekday(4).startOf('month'))
    }
  }, [target])

  const first = month.isoWeekday(1)
  const rows = month.endOf('month').isoWeekday(1).diff(first, 'week') + 1
  const mondays = Array.from({ length: rows }, (_, i) => first.add(i, 'week'))

  return (
    <div className="flex flex-col gap-1 rounded-[10px] border border-border px-3 pt-2.5 pb-3">
      <div className="flex items-center justify-between px-0.5 pb-1.5">
        <span className="text-[15px] font-semibold text-foreground capitalize">
          {month.format('MMMM YYYY')}
        </span>
        <span className="flex gap-1">
          <Button
            variant="icon"
            size="icon-md"
            aria-label="Mois précédent"
            onClick={() => setMonth(month.subtract(1, 'month'))}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="icon"
            size="icon-md"
            aria-label="Mois suivant"
            onClick={() => setMonth(month.add(1, 'month'))}
          >
            <ChevronRight size={16} />
          </Button>
        </span>
      </div>
      <div className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))_64px] pb-1 text-xs text-[#94a3b8]">
        <span />
        {WEEKDAYS.map(([key, label]) => (
          <span key={key} className="text-center">
            {label}
          </span>
        ))}
        <span />
      </div>
      {mondays.map((monday) => {
        const week = calendarWeek(monday, calendar)
        const isSource = monday.isSame(source, 'day')
        const isTarget = !!target && monday.isSame(target, 'day')
        return (
          <button
            key={week.key}
            type="button"
            disabled={isSource || week.past}
            aria-pressed={isTarget}
            aria-label={week.long}
            onClick={() => onPick(monday)}
            className={cn(ROW, rowState(isSource, isTarget, week.past))}
          >
            <span
              className={cn(
                'text-xs font-semibold',
                isTarget ? 'text-white' : 'text-[#94a3b8]',
              )}
            >
              {week.forbidden ? '—' : week.short}
            </span>
            {Array.from({ length: 7 }, (_, i) => {
              const day = monday.add(i, 'day')
              return (
                <span
                  key={day.format('D')}
                  className={cn(
                    'text-center',
                    !isTarget &&
                      day.month() !== month.month() &&
                      'text-[#cbd5e1]',
                    !isTarget &&
                      day.month() === month.month() &&
                      i > 4 &&
                      !week.past &&
                      'text-[#94a3b8]',
                    isTarget && i > 4 && 'text-[#bfdbfe]',
                  )}
                >
                  {day.format('D')}
                </span>
              )
            })}
            <RowTag
              isSource={isSource}
              isTarget={isTarget}
              forbidden={week.forbidden}
            />
          </button>
        )
      })}
    </div>
  )
}

function TemplateWeekList({
  weekCount,
  source,
  target,
  onPick,
}: {
  weekCount: number
  source: number
  target: number | null
  onPick: (week: number) => void
}) {
  return (
    <div className="flex max-h-[280px] flex-col gap-1 overflow-y-auto rounded-[10px] border border-border px-3 py-2.5">
      {Array.from({ length: weekCount }, (_, i) => i + 1).map((n) => {
        const isSource = n === source
        const isTarget = n === target
        return (
          <button
            key={n}
            type="button"
            disabled={isSource}
            aria-pressed={isTarget}
            onClick={() => onPick(n)}
            className={cn(
              'flex h-10 w-full items-center justify-between rounded-lg border-none pl-3 text-sm',
              rowState(isSource, isTarget),
            )}
          >
            Semaine {n}
            <RowTag isSource={isSource} isTarget={isTarget} />
          </button>
        )
      })}
    </div>
  )
}
