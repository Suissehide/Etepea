import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'
import dayjs, { type Dayjs } from 'dayjs'
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  FileDown,
  Minus,
  Plus,
  Search,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { cn } from '../../../../libs/utils.ts'
import { useForbiddenWeekQueries } from '../../../../queries/useForbiddenWeek.ts'
import { usePathwayTemplateQueries } from '../../../../queries/usePathwayTemplate.ts'
import { usePlanningCycleQueries } from '../../../../queries/usePlanningCycle.ts'
import { useSlotsInRangeQuery } from '../../../../queries/useSlot.ts'
import { Button } from '../../../ui/button.tsx'
import {
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from '../../../ui/popover.tsx'
import { NO_PATHWAY_COLOR, NO_PATHWAY_KEY } from '../pathwayFilter.tsx'
import { buildPlanningWeeks, weekLabelOf } from './planning-pdf.utils.ts'
import PlanningWeeksPDF from './planning-weeks.pdf.tsx'

const MIN_WEEK_COUNT = 1
const MAX_WEEK_COUNT = 12
const DEFAULT_WEEK_COUNT = 4
const WEEKDAYS = [
  ['lun', 'L'],
  ['mar', 'M'],
  ['mer', 'M'],
  ['jeu', 'J'],
  ['ven', 'V'],
  ['sam', 'S'],
  ['dim', 'D'],
]
const CALENDAR_COLUMNS = 'grid-cols-[36px_repeat(7,minmax(0,1fr))_64px]'

interface PlanningExportModalProps {
  /** Date affichée dans le planning, utilisée comme semaine de départ. */
  initialDate?: string
  /** Parcours masqués dans le planning, repris comme exclusions de départ. */
  initialExcludedPathwayIds?: Set<string>
  onClose: () => void
}

export default function PlanningExportModal({
  initialDate,
  initialExcludedPathwayIds,
  onClose,
}: PlanningExportModalProps) {
  const [weekStart, setWeekStart] = useState<Dayjs>(() =>
    dayjs
      .utc(initialDate || undefined)
      .isoWeekday(1)
      .startOf('day'),
  )
  const [weekCount, setWeekCount] = useState(DEFAULT_WEEK_COUNT)
  const [month, setMonth] = useState<Dayjs>(() => weekStart.startOf('month'))
  const [page, setPage] = useState(0)

  // On raisonne en parcours *exclus* plutôt que sélectionnés : les modèles
  // arrivent de façon asynchrone.
  const [excludedPathwayIds, setExcludedPathwayIds] = useState<Set<string>>(
    () => new Set(initialExcludedPathwayIds),
  )

  const { pathwayTemplates } = usePathwayTemplateQueries()
  const { planningCycle } = usePlanningCycleQueries()
  const { forbiddenWeeks } = useForbiddenWeekQueries()

  const range = useMemo(
    () => ({
      from: weekStart.format('YYYY-MM-DD'),
      to: weekStart.add(weekCount * 7, 'day').format('YYYY-MM-DD'),
    }),
    [weekStart, weekCount],
  )
  const { slots, isFetching } = useSlotsInRangeQuery(range)

  const handlePickWeek = useCallback((monday: Dayjs) => {
    setWeekStart(monday)
    setPage(0)
  }, [])

  const handleTogglePathway = useCallback((id: string) => {
    setExcludedPathwayIds((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelectAllPathways = useCallback(() => {
    setExcludedPathwayIds(new Set())
  }, [])

  const handleClearPathways = useCallback(() => {
    setExcludedPathwayIds(
      new Set([
        NO_PATHWAY_KEY,
        ...(pathwayTemplates ?? []).map((template) => template.id),
      ]),
    )
  }, [pathwayTemplates])

  const pathwayItems = useMemo(
    () => [
      { id: NO_PATHWAY_KEY, name: 'Hors parcours', color: NO_PATHWAY_COLOR },
      ...(pathwayTemplates ?? []),
    ],
    [pathwayTemplates],
  )
  const includedPathways = pathwayItems.filter(
    (item) => !excludedPathwayIds.has(item.id),
  )
  const allIncluded = includedPathways.length === pathwayItems.length
  const noneIncluded = includedPathways.length === 0

  const selectedSlots = useMemo(
    () =>
      (slots ?? []).filter(
        (slot) =>
          // Le PDF montre le planning : les créneaux supprimés n'y sont plus.
          !slot.archivedAt &&
          !excludedPathwayIds.has(slot.pathway?.template?.id ?? NO_PATHWAY_KEY),
      ),
    [slots, excludedPathwayIds],
  )

  const forbiddenWeekStarts = useMemo(
    () => (forbiddenWeeks ?? []).map((week) => week.startOfWeek),
    [forbiddenWeeks],
  )

  const weeks = useMemo(
    () =>
      buildPlanningWeeks(
        selectedSlots,
        weekStart,
        weekCount,
        forbiddenWeekStarts,
        planningCycle,
      ),
    [selectedSlots, weekStart, weekCount, forbiddenWeekStarts, planningCycle],
  )

  const pdfDocument = useMemo(() => <PlanningWeeksPDF weeks={weeks} />, [weeks])

  const shownPage = Math.min(page, weekCount - 1)
  const previewDocument = useMemo(
    () => <PlanningWeeksPDF weeks={weeks.slice(shownPage, shownPage + 1)} />,
    [weeks, shownPage],
  )

  const fileName = `planning-${weekStart.format('YYYY-MM-DD')}-${weekCount}-semaines.pdf`

  const lastWeekStart = weekStart.add(weekCount - 1, 'week')
  const lastWeekEnd = weekStart.add(weekCount * 7 - 3, 'day')
  const slotCount = weeks.reduce(
    (total, week) => total + week.days.flat().length,
    0,
  )
  const closedWeekKeys = new Set(
    forbiddenWeekStarts.map((date) =>
      dayjs.utc(date).startOf('isoWeek').format('YYYY-MM-DD'),
    ),
  )

  const quickCounts = [
    { count: 1, label: '1 sem.' },
    { count: 2, label: '2 sem.' },
    { count: 4, label: '1 mois' },
    ...(planningCycle
      ? [
          {
            count: Math.min(planningCycle.weekCount, MAX_WEEK_COUNT),
            label: '1 cycle',
          },
        ]
      : []),
  ]

  const firstMonday = month.isoWeekday(1)
  const rowCount =
    month.endOf('month').isoWeekday(1).diff(firstMonday, 'week') + 1
  const mondays = Array.from({ length: rowCount }, (_, i) =>
    firstMonday.add(i, 'week'),
  )

  const pagesLabel = weekCount > 1 ? ` (${weekCount} pages)` : ''

  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl shadow-xl w-[90vw] h-[90vh] flex flex-col overflow-hidden">
        <div className="flex h-16 shrink-0 items-center gap-3.5 border-b border-border px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dbe6fd]">
            <FileDown size={18} className="text-primary" />
          </span>
          <div className="flex flex-1 flex-col gap-0.5">
            <h2 className="m-0 text-lg font-bold text-foreground">
              Exporter le planning
            </h2>
            <span className="text-[13px] text-text-light">
              PDF, une page paysage par semaine.
            </span>
          </div>
          <Button
            variant="outline"
            className="h-10 rounded-lg"
            onClick={onClose}
          >
            Annuler
          </Button>
          {noneIncluded ? (
            <Button className="h-10 rounded-lg" disabled>
              <Download className="h-4 w-4" />
              Télécharger{pagesLabel}
            </Button>
          ) : (
            <PDFDownloadLink document={pdfDocument} fileName={fileName}>
              {({ loading }) => (
                <Button
                  className="h-10 rounded-lg"
                  disabled={loading || isFetching}
                >
                  <Download className="h-4 w-4" />
                  {loading ? 'Génération…' : `Télécharger${pagesLabel}`}
                </Button>
              )}
            </PDFDownloadLink>
          )}
        </div>

        <div className="grid flex-1 min-h-0 grid-cols-[480px_minmax(0,1fr)]">
          <aside className="flex min-w-0 flex-col gap-4 overflow-y-auto border-r border-border px-5 py-[18px]">
            <div className="grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)] items-center gap-2">
              <div className="flex flex-col gap-1 rounded-lg border-[1.5px] border-primary bg-blue-50 px-3 py-2.5 text-primary-dark">
                <span className="text-xs">Du</span>
                <span className="text-sm font-semibold">
                  S{weekLabelOf(weekStart, planningCycle)} ·{' '}
                  {weekStart.format('dddd D MMM')}
                </span>
              </div>
              <ArrowRight
                size={18}
                className="justify-self-center text-[#94a3b8]"
              />
              <div className="flex flex-col gap-1 rounded-lg bg-muted px-3 py-2.5">
                <span className="text-xs text-text-light">Au</span>
                <span className="text-sm font-semibold text-foreground">
                  S{weekLabelOf(lastWeekStart, planningCycle)} ·{' '}
                  {lastWeekEnd.format('dddd D MMM')}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-text-dark">Durée</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex h-8 items-center rounded-full border border-border">
                  <button
                    type="button"
                    aria-label="Retirer une semaine"
                    disabled={weekCount <= MIN_WEEK_COUNT}
                    onClick={() =>
                      setWeekCount((n) => Math.max(MIN_WEEK_COUNT, n - 1))
                    }
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-text-dark hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="min-w-16 text-center text-[13px] font-semibold tabular-nums text-foreground">
                    {weekCount} sem.
                  </span>
                  <button
                    type="button"
                    aria-label="Ajouter une semaine"
                    disabled={weekCount >= MAX_WEEK_COUNT}
                    onClick={() =>
                      setWeekCount((n) => Math.min(MAX_WEEK_COUNT, n + 1))
                    }
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-text-dark hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {quickCounts.map(({ count, label }) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={count === weekCount}
                    onClick={() => setWeekCount(count)}
                    className={cn(
                      'h-[30px] cursor-pointer whitespace-nowrap rounded-full border px-[9px] text-[13px] font-medium',
                      count === weekCount
                        ? 'border-primary bg-blue-50 text-primary-dark'
                        : 'border-border text-text-dark hover:bg-muted',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
              <div
                className={cn(
                  'grid pb-1 text-xs text-[#94a3b8]',
                  CALENDAR_COLUMNS,
                )}
              >
                <span />
                {WEEKDAYS.map(([key, label]) => (
                  <span key={key} className="text-center">
                    {label}
                  </span>
                ))}
                <span className="pr-2 text-right">PDF</span>
              </div>
              {mondays.map((monday) => {
                const index = monday.diff(weekStart, 'week')
                return (
                  <ExportWeekRow
                    key={monday.format('YYYY-MM-DD')}
                    monday={monday}
                    month={month}
                    label={weekLabelOf(monday, planningCycle)}
                    pageIndex={index >= 0 && index < weekCount ? index : null}
                    isLast={index === weekCount - 1}
                    isShown={index === shownPage}
                    isClosed={closedWeekKeys.has(monday.format('YYYY-MM-DD'))}
                    onPick={() => handlePickWeek(monday)}
                  />
                )
              })}
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-text-dark">
                Parcours à inclure
              </span>
              <PathwayPicker
                items={pathwayItems}
                excludedIds={excludedPathwayIds}
                onToggle={handleTogglePathway}
                onSelectAll={handleSelectAllPathways}
                onClear={handleClearPathways}
              />
            </div>

            <p className="m-0 text-[13px] leading-normal text-text-dark">
              {noneIncluded
                ? 'Choisissez au moins un parcours.'
                : `Du ${weekStart.format('DD/MM')} au ${lastWeekEnd.format('DD/MM')} : ${weekCount} page${weekCount > 1 ? 's' : ''} paysage, ${slotCount} créneau${slotCount > 1 ? 'x' : ''}${allIncluded ? '' : `, ${includedPathways.length} parcours sur ${pathwayItems.length}`}.`}
            </p>
          </aside>

          <div className="flex min-w-0 flex-col bg-muted">
            <div className="flex h-12 shrink-0 items-center justify-center gap-2.5 border-b border-border bg-white">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg disabled:opacity-40"
                aria-label="Page précédente"
                disabled={shownPage === 0}
                onClick={() => setPage(shownPage - 1)}
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="min-w-[120px] text-center text-sm font-semibold tabular-nums text-foreground">
                Page {shownPage + 1} sur {weekCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg disabled:opacity-40"
                aria-label="Page suivante"
                disabled={shownPage >= weekCount - 1}
                onClick={() => setPage(shownPage + 1)}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center p-6 [container-type:size]">
              {/* Une seule semaine : la barre maison et le calendrier pilotent la page. */}
              <div className="aspect-[297/210] w-[min(100cqw,calc(100cqh*297/210))] bg-white shadow-[0_4px_18px_rgba(4,24,43,.12)]">
                <PDFViewer width="100%" height="100%" showToolbar={false}>
                  {previewDocument}
                </PDFViewer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function rowTone(isStart: boolean, inRange: boolean, isClosed: boolean) {
  if (isStart) {
    return 'bg-primary font-semibold text-white'
  }
  if (inRange) {
    return 'bg-[#dbeafe] font-semibold text-primary-dark'
  }
  return isClosed ? 'bg-red-50 text-[#94a3b8]' : 'bg-transparent'
}

// La plage exportée forme un seul bloc arrondi.
function rowCorners(isStart: boolean, inRange: boolean, isLast: boolean) {
  if (!inRange || (isStart && isLast)) {
    return 'rounded-lg'
  }
  if (isStart) {
    return 'rounded-t-lg'
  }
  return isLast ? 'rounded-b-lg' : ''
}

function dayTone(isStart: boolean, isWeekend: boolean, inMonth: boolean) {
  if (isStart) {
    return isWeekend ? 'text-[#bfdbfe]' : ''
  }
  if (!inMonth) {
    return 'text-[#cbd5e1]'
  }
  return isWeekend ? 'text-[#94a3b8]' : ''
}

function ExportWeekRow({
  monday,
  month,
  label,
  pageIndex,
  isLast,
  isShown,
  isClosed,
  onPick,
}: {
  monday: Dayjs
  month: Dayjs
  label: string
  pageIndex: number | null
  isLast: boolean
  isShown: boolean
  isClosed: boolean
  onPick: () => void
}) {
  const isStart = pageIndex === 0
  const inRange = pageIndex !== null
  return (
    <button
      type="button"
      aria-pressed={isStart}
      title={isClosed ? 'Semaine interdite' : 'Commencer l’export ici'}
      onClick={onPick}
      className={cn(
        'grid h-10 w-full cursor-pointer items-center border-none p-0 text-sm hover:shadow-[inset_0_0_0_1.5px_#93c5fd]',
        CALENDAR_COLUMNS,
        rowTone(isStart, inRange, isClosed),
        rowCorners(isStart, inRange, isLast),
        isShown &&
          !isStart &&
          'shadow-[inset_0_0_0_1.5px_var(--color-primary)] hover:shadow-[inset_0_0_0_1.5px_var(--color-primary)]',
      )}
    >
      <span
        className={cn(
          'text-[11px] font-semibold',
          !inRange && 'text-[#94a3b8]',
        )}
      >
        S{label}
      </span>
      {Array.from({ length: 7 }, (_, i) => {
        const day = monday.add(i, 'day')
        return (
          <span
            key={day.format('D')}
            className={cn(
              'text-center',
              dayTone(isStart, i > 4, day.month() === month.month()),
            )}
          >
            {day.format('D')}
          </span>
        )
      })}
      <span className="mr-2 justify-self-end whitespace-nowrap">
        {inRange && (
          <span
            className={cn(
              'rounded-lg px-[7px] py-0.5 text-[11px] font-bold',
              isStart ? 'bg-white/20 text-white' : 'bg-white text-primary-dark',
            )}
          >
            p. {pageIndex + 1}
          </span>
        )}
      </span>
    </button>
  )
}

function PathwayPicker({
  items,
  excludedIds,
  onToggle,
  onSelectAll,
  onClear,
}: {
  items: { id: string; name: string; color: string }[]
  excludedIds: Set<string>
  onToggle: (id: string) => void
  onSelectAll: () => void
  onClear: () => void
}) {
  const [query, setQuery] = useState('')
  const included = items.filter((item) => !excludedIds.has(item.id))
  const allIncluded = included.length === items.length
  const shown = items.filter((item) =>
    item.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <PopoverRoot onOpenChange={() => setQuery('')}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-white px-3 text-left text-sm text-foreground data-[state=open]:border-primary"
        >
          <span className="flex pl-1">
            {included.slice(0, 4).map((item) => (
              <span
                key={item.id}
                className="-ml-1 h-3 w-3 rounded-full border-2 border-white"
                style={{ backgroundColor: item.color }}
              />
            ))}
          </span>
          <span className="flex-1 truncate">
            {included.length === 0
              ? 'Aucun parcours'
              : allIncluded
                ? 'Tous les parcours'
                : `${included.length} parcours sur ${items.length}`}
          </span>
          <ChevronsUpDown size={16} className="text-text-light" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        className="flex w-[var(--radix-popover-trigger-width)] flex-col rounded-[10px] bg-white p-0 shadow-[0_16px_40px_rgba(4,24,43,.22)]"
      >
        <div className="flex items-center gap-2 border-b border-muted p-2">
          <Search size={16} className="ml-1 shrink-0 text-[#94a3b8]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un parcours"
            className="h-8 min-w-0 flex-1 border-none bg-transparent text-sm outline-none"
          />
        </div>
        <div className="flex justify-between px-3 pt-2 pb-1 text-xs text-text-light">
          <span>
            {included.length} sélectionné{included.length > 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={allIncluded ? onClear : onSelectAll}
            className="cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-primary hover:text-primary-dark"
          >
            {allIncluded ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
        </div>
        <div className="max-h-[260px] overflow-auto p-1">
          {shown.map((item) => {
            const checked = !excludedIds.has(item.id)
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={checked}
                onClick={() => onToggle(item.id)}
                className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-md border-none bg-transparent px-2 text-left text-sm text-foreground hover:bg-[#f8fafc]"
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border-[1.5px]',
                    checked
                      ? 'border-primary bg-primary'
                      : 'border-[#cbd5e1] bg-white',
                  )}
                >
                  {checked && (
                    <Check size={11} strokeWidth={3} className="text-white" />
                  )}
                </span>
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="flex-1 truncate">{item.name}</span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </PopoverRoot>
  )
}
