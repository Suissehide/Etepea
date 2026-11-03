import dayjs, { type Dayjs } from 'dayjs'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Repeat,
  RotateCcw,
  Save,
} from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useEffect, useState } from 'react'

import { cn } from '../../../libs/utils.ts'
import { useForbiddenWeekQueries } from '../../../queries/useForbiddenWeek.ts'
import type { PlanningCycle } from '../../../types/planningCycle.ts'
import { cycleWeekNumber } from '../../../utils/weekCycle.ts'
import { Button } from '../../ui/button.tsx'
import { Popup, PopupContent, PopupFooter } from '../../ui/popup.tsx'

const MIN_WEEK_COUNT = 1
const MAX_WEEK_COUNT = 52
const DEFAULT_WEEK_COUNT = 6
const QUICK_COUNTS = [4, 6, 8, 12]
const WEEKDAYS = [
  ['lun', 'L'],
  ['mar', 'M'],
  ['mer', 'M'],
  ['jeu', 'J'],
  ['ven', 'V'],
  ['sam', 'S'],
  ['dim', 'D'],
]
const HATCHED =
  'bg-[repeating-linear-gradient(135deg,#f8fafc_0_6px,#eef2f6_6px_8px)]'

const mondayOf = (date: Dayjs) => date.isoWeekday(1).startOf('day')

interface PlanningCycleFormProps {
  open: boolean
  setOpen: (open: boolean) => void
  cycle: PlanningCycle | null | undefined
  onSave: (cycle: PlanningCycle) => void
  onReset: () => void
  isPending?: boolean
}

export function PlanningCycleForm({
  open,
  setOpen,
  cycle,
  onSave,
  onReset,
  isPending = false,
}: PlanningCycleFormProps) {
  const [weekStart, setWeekStart] = useState<Dayjs>(() => mondayOf(dayjs.utc()))
  const [weekCount, setWeekCount] = useState(DEFAULT_WEEK_COUNT)
  const [month, setMonth] = useState<Dayjs>(() => dayjs.utc().startOf('month'))
  const { forbiddenWeeks } = useForbiddenWeekQueries()

  // Chaque ouverture repart du cycle enregistré, sans la saisie abandonnée.
  useEffect(() => {
    if (!open) {
      return
    }
    const start = mondayOf(cycle ? dayjs.utc(cycle.startOfWeek) : dayjs.utc())
    setWeekStart(start)
    setMonth(start.startOf('month'))
    setWeekCount(cycle?.weekCount ?? DEFAULT_WEEK_COUNT)
  }, [open, cycle])

  const preview: PlanningCycle = {
    startOfWeek: weekStart.format('YYYY-MM-DD'),
    weekCount,
    forbiddenWeekStarts: (forbiddenWeeks ?? []).map((w) => w.startOfWeek),
  }
  const today = mondayOf(dayjs.utc())
  const currentWeek = cycleWeekNumber(today, preview)
  // Les semaines interdites repoussent le retour à S1.
  let nextReturn = today.add(1, 'week')
  while (cycleWeekNumber(nextReturn, preview) !== 1) {
    nextReturn = nextReturn.add(1, 'week')
  }

  const first = month.isoWeekday(1)
  const rows = month.endOf('month').isoWeekday(1).diff(first, 'week') + 1
  const mondays = Array.from({ length: rows }, (_, i) => first.add(i, 'week'))

  return (
    <Popup modal open={open} onOpenChange={setOpen}>
      <PopupContent className="w-[560px] rounded-xl">
        <div className="flex items-center gap-3.5 border-b border-border px-5 py-[18px] pr-14">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dbe6fd]">
            <Repeat size={18} className="text-primary" />
          </span>
          <div className="flex flex-col gap-0.5">
            <Dialog.Title className="m-0 text-lg font-bold text-foreground">
              Cycle de semaines
            </Dialog.Title>
            <span className="text-[13px] text-text-light">
              Le planning affiche S1, S2… au lieu du numéro de semaine de
              l’année.
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-[18px]">
          <div className="grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)] items-center gap-2">
            <div className="flex flex-col gap-1 rounded-lg border-[1.5px] border-primary bg-blue-50 px-3 py-2.5 text-primary-dark">
              <span className="text-xs">S1 commence</span>
              <span className="text-sm font-semibold">
                S{weekStart.isoWeek()} · {weekStart.format('dddd D MMM YYYY')}
              </span>
            </div>
            <ArrowRight
              size={18}
              className="justify-self-center text-[#94a3b8]"
            />
            <div className="flex flex-col gap-1 rounded-lg bg-muted px-3 py-2.5">
              <span className="text-xs text-text-light">
                Prochain retour à S1
              </span>
              <span className="text-sm font-semibold text-foreground">
                {nextReturn.format('D MMM YYYY')}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-sm font-medium text-text-dark">Longueur</span>
            <div className="flex h-8 items-center rounded-full border border-border">
              <button
                type="button"
                aria-label="Raccourcir le cycle"
                disabled={weekCount <= MIN_WEEK_COUNT}
                onClick={() =>
                  setWeekCount((n) => Math.max(MIN_WEEK_COUNT, n - 1))
                }
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-text-dark hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Minus size={14} />
              </button>
              <span className="min-w-[72px] text-center text-[13px] font-semibold tabular-nums text-foreground">
                {weekCount} sem.
              </span>
              <button
                type="button"
                aria-label="Allonger le cycle"
                disabled={weekCount >= MAX_WEEK_COUNT}
                onClick={() =>
                  setWeekCount((n) => Math.min(MAX_WEEK_COUNT, n + 1))
                }
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-text-dark hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Plus size={14} />
              </button>
            </div>
            {QUICK_COUNTS.map((count) => (
              <button
                key={count}
                type="button"
                aria-label={`${count} semaines`}
                aria-pressed={count === weekCount}
                onClick={() => setWeekCount(count)}
                className={cn(
                  'h-[30px] cursor-pointer rounded-full border px-2.5 text-[13px] font-medium',
                  count === weekCount
                    ? 'border-primary bg-blue-50 text-primary-dark'
                    : 'border-border text-text-dark hover:bg-muted',
                )}
              >
                {count}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1 rounded-[10px] border border-border px-3 pt-2.5 pb-3">
            <div className="flex items-center justify-between px-0.5 pb-1.5">
              <span className="text-[15px] font-semibold text-foreground capitalize">
                {month.format('MMMM YYYY')}
              </span>
              <span className="flex gap-1">
                <Button
                  variant="icon"
                  size="icon-md"
                  className="h-7 w-7 hover:bg-muted"
                  aria-label="Mois précédent"
                  onClick={() => setMonth(month.subtract(1, 'month'))}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="icon"
                  size="icon-md"
                  className="h-7 w-7 hover:bg-muted"
                  aria-label="Mois suivant"
                  onClick={() => setMonth(month.add(1, 'month'))}
                >
                  <ChevronRight size={16} />
                </Button>
              </span>
            </div>
            <div className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))_78px] pb-1 text-xs text-[#94a3b8]">
              <span />
              {WEEKDAYS.map(([key, label]) => (
                <span key={key} className="text-center">
                  {label}
                </span>
              ))}
              <span className="pr-2 text-right">Planning</span>
            </div>
            {mondays.map((monday) => (
              <CycleWeekRow
                key={monday.format('YYYY-MM-DD')}
                monday={monday}
                month={month}
                number={cycleWeekNumber(monday, preview)}
                isStart={monday.isSame(weekStart, 'day')}
                isToday={monday.isSame(today, 'day')}
                onPick={() => setWeekStart(monday)}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-text-light">
            <LegendItem swatch="bg-primary">Départ (S1)</LegendItem>
            <LegendItem swatch="border-[1.5px] border-primary">
              Cette semaine
            </LegendItem>
            <LegendItem swatch={cn('border border-border', HATCHED)}>
              Semaine interdite : non comptée
            </LegendItem>
          </div>

          <p className="m-0 text-[13px] leading-normal text-text-dark">
            Cycle de {weekCount} semaine{weekCount > 1 ? 's' : ''}. Cette
            semaine (lundi {today.format('D MMM')}){' '}
            {currentWeek === null ? 'est interdite' : `sera S${currentWeek}`} ;
            le cycle revient à S1 le {nextReturn.format('D MMM')} Les semaines
            interdites ne comptent pas et repoussent la suite.
          </p>
        </div>

        <PopupFooter className="px-5 py-3.5">
          {cycle && (
            <Button
              variant="icon"
              className="mr-auto h-10 rounded-lg px-4 text-text-light hover:bg-muted hover:text-foreground"
              title="Supprime le cycle : le planning reprend les numéros de semaine de l’année"
              onClick={onReset}
              disabled={isPending}
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </Button>
          )}
          <Button
            variant="outline"
            className="h-10 rounded-lg"
            onClick={() => setOpen(false)}
          >
            Annuler
          </Button>
          <Button
            className="h-10 rounded-lg"
            isLoading={isPending}
            onClick={() =>
              onSave({ startOfWeek: weekStart.format('YYYY-MM-DD'), weekCount })
            }
          >
            {!isPending && <Save className="h-4 w-4" />}
            Enregistrer
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}

function weekTag(number: number | null, isStart: boolean) {
  if (isStart) {
    return { label: 'S1 · départ', className: 'bg-white/20 text-white' }
  }
  if (number === null) {
    return {
      label: 'Interdite',
      className: 'text-[#94a3b8]',
      title: 'Semaine interdite : elle ne peut pas être S1',
    }
  }
  return {
    label: `S${number}`,
    className:
      number === 1 ? 'bg-border text-text-dark' : 'bg-muted text-text-dark',
    title: 'Faire commencer S1 ici',
    restart: number === 1,
  }
}

function CycleWeekRow({
  monday,
  month,
  number,
  isStart,
  isToday,
  onPick,
}: {
  monday: Dayjs
  month: Dayjs
  number: number | null
  isStart: boolean
  isToday: boolean
  onPick: () => void
}) {
  const forbidden = number === null
  const tag = weekTag(number, isStart)
  return (
    <button
      type="button"
      disabled={forbidden || isStart}
      aria-pressed={isStart}
      title={tag.title}
      onClick={onPick}
      className={cn(
        'grid h-10 w-full grid-cols-[40px_repeat(7,minmax(0,1fr))_78px] items-center rounded-lg border-none p-0 text-sm',
        isStart
          ? 'cursor-default bg-primary font-semibold text-white'
          : forbidden
            ? cn('cursor-not-allowed text-[#94a3b8]', HATCHED)
            : 'cursor-pointer bg-transparent hover:shadow-[inset_0_0_0_1.5px_#93c5fd]',
        isToday &&
          !isStart &&
          'font-semibold shadow-[inset_0_0_0_1.5px_var(--color-primary)] hover:shadow-[inset_0_0_0_1.5px_var(--color-primary)]',
      )}
    >
      <span
        className={cn(
          'text-[11px] font-semibold',
          isStart ? 'text-white' : 'text-[#94a3b8]',
        )}
      >
        S{monday.isoWeek()}
      </span>
      {Array.from({ length: 7 }, (_, i) => {
        const day = monday.add(i, 'day')
        return (
          <span
            key={day.format('D')}
            className={cn(
              'text-center',
              isStart
                ? i > 4 && 'text-[#bfdbfe]'
                : day.month() === month.month()
                  ? i > 4 && 'text-[#94a3b8]'
                  : 'text-[#cbd5e1]',
            )}
          >
            {day.format('D')}
          </span>
        )
      })}
      <span className="mr-2 justify-self-end">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-lg px-[7px] py-0.5 text-[11px] font-bold',
            tag.className,
          )}
        >
          {tag.label}
          {tag.restart && <RotateCcw size={10} />}
        </span>
      </span>
    </button>
  )
}

function LegendItem({
  swatch,
  children,
}: {
  swatch: string
  children: string
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-3 w-3 rounded-[3px]', swatch)} />
      {children}
    </span>
  )
}
