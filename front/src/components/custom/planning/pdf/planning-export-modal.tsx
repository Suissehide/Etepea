import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'
import dayjs, { type Dayjs } from 'dayjs'
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  Download,
  FileDown,
  type LucideIcon,
  Minus,
  Plus,
  Route as RouteIcon,
  Search,
  Users,
} from 'lucide-react'
import { Dialog } from 'radix-ui'
import { Fragment, useCallback, useMemo, useState } from 'react'

import { cn } from '../../../../libs/utils.ts'
import { useForbiddenWeekQueries } from '../../../../queries/useForbiddenWeek.ts'
import { usePathwayTemplateQueries } from '../../../../queries/usePathwayTemplate.ts'
import { usePlanningCycleQueries } from '../../../../queries/usePlanningCycle.ts'
import { useSlotsInRangeQuery } from '../../../../queries/useSlot.ts'
import { useSoignantQueries } from '../../../../queries/useSoignant.ts'
import type { Slot } from '../../../../types/slot.ts'
import { Button } from '../../../ui/button.tsx'
import {
  PopoverAnchor,
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from '../../../ui/popover.tsx'
import { NO_PATHWAY_COLOR, NO_PATHWAY_KEY } from '../pathwayFilter.tsx'
import ExportCustomPeriod, {
  type PeriodBound,
} from './export-custom-period.tsx'
import {
  type ExportPeriod,
  MAX_WEEK_COUNT,
  periodOfMonths,
} from './export-period.ts'
import { buildPlanningWeeks, weekLabelOf } from './planning-pdf.utils.ts'
import PlanningWeeksPDF from './planning-weeks.pdf.tsx'

const MIN_WEEK_COUNT = 1
const DEFAULT_WEEK_COUNT = 4
/** Au-delà, la génération du PDF se fait sentir : on prévient. */
const SLOW_EXPORT_WEEKS = 12
export const NO_SOIGNANT_KEY = '__no_soignant__'
const NO_SOIGNANT_COLOR = '#94a3b8'
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

type PeriodMode = 'weeks' | 'semester' | 'year'
const MONTHS_OF: Record<Exclude<PeriodMode, 'weeks'>, number> = {
  semester: 6,
  year: 12,
}

type FilterItem = { id: string; name: string; color: string; group?: string }

interface PlanningExportModalProps {
  /** Date affichée dans le planning, utilisée comme semaine de départ. */
  initialDate?: string
  /** Parcours masqués dans le planning, repris comme exclusions de départ. */
  initialExcludedPathwayIds?: Set<string>
  /** Soignants à écarter au départ (ceux non cochés sur le tableau de bord). */
  initialExcludedSoignantIds?: Set<string>
  onClose: () => void
}

const toggleIn = (prev: Set<string>, id: string) => {
  const next = new Set(prev)
  if (!next.delete(id)) {
    next.add(id)
  }
  return next
}

// Un créneau sort s'il est dans un parcours retenu ET a au moins un soignant
// retenu (« Sans soignant » pour ceux qui n'en ont pas).
export const isSlotExported = (
  slot: Slot,
  excludedPathwayIds: Set<string>,
  excludedSoignantIds: Set<string>,
) => {
  if (slot.archivedAt) {
    return false
  }
  if (excludedPathwayIds.has(slot.pathway?.template?.id ?? NO_PATHWAY_KEY)) {
    return false
  }
  const soignants = slot.slotTemplate?.soignants ?? []
  return soignants.length === 0
    ? !excludedSoignantIds.has(NO_SOIGNANT_KEY)
    : soignants.some((soignant) => !excludedSoignantIds.has(soignant.id))
}

export default function PlanningExportModal({
  initialDate,
  initialExcludedPathwayIds,
  initialExcludedSoignantIds,
  onClose,
}: PlanningExportModalProps) {
  const [weekStart, setWeekStart] = useState<Dayjs>(() =>
    dayjs
      .utc(initialDate || undefined)
      .isoWeekday(1)
      .startOf('day'),
  )
  const [weekCount, setWeekCount] = useState(DEFAULT_WEEK_COUNT)
  const [mode, setMode] = useState<PeriodMode>('weeks')
  // Semestre / année : premier mois exporté, et année affichée dans la grille.
  const [firstMonth, setFirstMonth] = useState<Dayjs>(() =>
    weekStart.add(6, 'day').startOf('month'),
  )
  const [gridYear, setGridYear] = useState(() => firstMonth.year())
  const [month, setMonth] = useState<Dayjs>(() => weekStart.startOf('month'))
  const [page, setPage] = useState(0)
  const [customFocus, setCustomFocus] = useState<PeriodBound | null>(null)

  // On raisonne en exclusions plutôt qu'en sélections : parcours et soignants
  // arrivent de façon asynchrone.
  const [excludedPathwayIds, setExcludedPathwayIds] = useState<Set<string>>(
    () => new Set(initialExcludedPathwayIds),
  )
  const [excludedSoignantIds, setExcludedSoignantIds] = useState<Set<string>>(
    () => new Set(initialExcludedSoignantIds),
  )

  const { pathwayTemplates } = usePathwayTemplateQueries()
  const { soignants } = useSoignantQueries()
  const { planningCycle } = usePlanningCycleQueries()
  const { forbiddenWeeks } = useForbiddenWeekQueries()

  const period: ExportPeriod = useMemo(
    () =>
      mode === 'weeks'
        ? { weekStart, weekCount }
        : periodOfMonths(firstMonth, MONTHS_OF[mode]),
    [mode, weekStart, weekCount, firstMonth],
  )
  const lastWeekStart = period.weekStart.add(period.weekCount - 1, 'week')
  const lastWeekEnd = lastWeekStart.add(4, 'day')

  const range = useMemo(
    () => ({
      from: period.weekStart.format('YYYY-MM-DD'),
      to: period.weekStart
        .add(period.weekCount * 7, 'day')
        .format('YYYY-MM-DD'),
    }),
    [period],
  )
  const { slots, isFetching } = useSlotsInRangeQuery(range)

  const handlePickWeek = useCallback((monday: Dayjs) => {
    setWeekStart(monday)
    setPage(0)
  }, [])

  // Repasser en semaines garde le début de la plage affichée.
  const switchToWeeks = (count: number) => {
    setMode('weeks')
    setWeekStart(period.weekStart)
    setMonth(period.weekStart.startOf('month'))
    setWeekCount(count)
    setPage(0)
  }

  const switchToMonths = (next: Exclude<PeriodMode, 'weeks'>) => {
    if (mode === 'weeks') {
      // Le dimanche de la semaine de départ désigne son mois sans ambiguïté.
      const first = period.weekStart.add(6, 'day').startOf('month')
      setFirstMonth(first)
      setGridYear(first.year())
    }
    setMode(next)
    setPage(0)
  }

  const applyCustom = (custom: ExportPeriod) => {
    setMode('weeks')
    setWeekStart(custom.weekStart)
    setWeekCount(custom.weekCount)
    setMonth(custom.weekStart.startOf('month'))
    setPage(0)
    setCustomFocus(null)
  }

  // Même ordre et mêmes groupes que le filtre « Parcours » du planning.
  const pathwayItems = useMemo<FilterItem[]>(() => {
    const templates = pathwayTemplates ?? []
    const inGroup = (individual: boolean, group: string) =>
      templates
        .filter((template) => !!template.firstAppointmentOnly === individual)
        .map(({ id, name, color }) => ({ id, name, color, group }))
    return [
      { id: NO_PATHWAY_KEY, name: 'Hors parcours', color: NO_PATHWAY_COLOR },
      ...inGroup(true, 'Individuels'),
      ...inGroup(false, 'Multiples'),
    ]
  }, [pathwayTemplates])

  const soignantItems = useMemo<FilterItem[]>(
    () => [
      ...[...(soignants ?? [])]
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        .map(({ id, name, color }) => ({
          id,
          name,
          color: color ?? NO_SOIGNANT_COLOR,
        })),
      { id: NO_SOIGNANT_KEY, name: 'Sans soignant', color: NO_SOIGNANT_COLOR },
    ],
    [soignants],
  )

  const countIncluded = (items: FilterItem[], excluded: Set<string>) =>
    items.filter((item) => !excluded.has(item.id))
  const includedPathways = countIncluded(pathwayItems, excludedPathwayIds)
  const includedSoignants = countIncluded(soignantItems, excludedSoignantIds)
  const noneIncluded =
    includedPathways.length === 0 || includedSoignants.length === 0

  const selectedSlots = useMemo(
    () =>
      (slots ?? []).filter((slot) =>
        isSlotExported(slot, excludedPathwayIds, excludedSoignantIds),
      ),
    [slots, excludedPathwayIds, excludedSoignantIds],
  )

  const forbiddenWeekStarts = useMemo(
    () => (forbiddenWeeks ?? []).map((week) => week.startOfWeek),
    [forbiddenWeeks],
  )

  const weeks = useMemo(
    () =>
      buildPlanningWeeks(
        selectedSlots,
        period.weekStart,
        period.weekCount,
        forbiddenWeekStarts,
        planningCycle,
      ),
    [selectedSlots, period, forbiddenWeekStarts, planningCycle],
  )

  // Rappelé en tête de chaque page : un planning filtré ne doit pas passer pour complet.
  const filterNote = soignantNote(includedSoignants, soignantItems.length)

  const pdfDocument = useMemo(
    () => <PlanningWeeksPDF weeks={weeks} filterNote={filterNote} />,
    [weeks, filterNote],
  )

  const shownPage = Math.min(page, period.weekCount - 1)
  const previewDocument = useMemo(
    () => (
      <PlanningWeeksPDF
        weeks={weeks.slice(shownPage, shownPage + 1)}
        filterNote={filterNote}
      />
    ),
    [weeks, shownPage, filterNote],
  )

  const fileName = `planning-${period.weekStart.format('YYYY-MM-DD')}-${period.weekCount}-semaines.pdf`

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
    { key: '1', count: 1, label: '1 sem.' },
    { key: '4', count: 4, label: '1 mois' },
    ...(planningCycle
      ? [
          {
            key: 'cycle',
            count: Math.min(planningCycle.weekCount, MAX_WEEK_COUNT),
            label: '1 cycle',
          },
        ]
      : []),
  ]
  const activePreset =
    mode === 'weeks'
      ? (quickCounts.find(({ count }) => count === weekCount)?.key ?? 'custom')
      : mode
  const presets: { key: string; label: string; onPick: () => void }[] = [
    ...quickCounts.map(({ key, count, label }) => ({
      key,
      label,
      onPick: () => switchToWeeks(count),
    })),
    {
      key: 'semester',
      label: 'Semestre',
      onPick: () => switchToMonths('semester'),
    },
    { key: 'year', label: 'Année', onPick: () => switchToMonths('year') },
    {
      key: 'custom',
      label: 'Personnalisé',
      onPick: () => setCustomFocus('from'),
    },
  ]

  const firstMonday = month.isoWeekday(1)
  const rowCount =
    month.endOf('month').isoWeekday(1).diff(firstMonday, 'week') + 1
  const mondays = Array.from({ length: rowCount }, (_, i) =>
    firstMonday.add(i, 'week'),
  )

  const pagesLabel = period.weekCount > 1 ? ` (${period.weekCount} pages)` : ''
  const filterSummary = [
    includedPathways.length < pathwayItems.length
      ? `${includedPathways.length} parcours sur ${pathwayItems.length}`
      : '',
    filterNote ?? '',
  ].filter(Boolean)

  const boundBox = (bound: PeriodBound) =>
    (customFocus ?? 'from') === bound
      ? 'border-primary bg-blue-50 text-primary-dark'
      : 'border-transparent bg-muted text-foreground'

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-150 bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-150 flex h-[90vh] w-[90vw] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-background shadow-xl"
        >
          <div className="flex h-16 shrink-0 items-center gap-3.5 border-b border-border px-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dbe6fd]">
              <FileDown size={18} className="text-primary" />
            </span>
            <div className="flex flex-1 flex-col gap-0.5">
              <Dialog.Title className="m-0 text-lg font-bold text-foreground">
                Exporter le planning
              </Dialog.Title>
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
              <PopoverRoot
                open={customFocus !== null}
                onOpenChange={(open) => !open && setCustomFocus(null)}
              >
                <PopoverAnchor asChild>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)] items-center gap-2">
                      <button
                        type="button"
                        title="Choisir la première semaine"
                        onClick={() => setCustomFocus('from')}
                        className={cn(
                          'flex cursor-pointer flex-col items-start gap-1 rounded-lg border-[1.5px] px-3 py-2.5 text-left',
                          boundBox('from'),
                        )}
                      >
                        <span className="text-xs">Du</span>
                        <span className="text-sm font-semibold">
                          S{weekLabelOf(period.weekStart, planningCycle)} ·{' '}
                          {period.weekStart.format('dddd D MMM YYYY')}
                        </span>
                      </button>
                      <ArrowRight
                        size={18}
                        className="justify-self-center text-[#94a3b8]"
                      />
                      <button
                        type="button"
                        title="Choisir la dernière semaine"
                        onClick={() => setCustomFocus('to')}
                        className={cn(
                          'flex cursor-pointer flex-col items-start gap-1 rounded-lg border-[1.5px] px-3 py-2.5 text-left',
                          boundBox('to'),
                        )}
                      >
                        <span className="text-xs">Au</span>
                        <span className="text-sm font-semibold">
                          S{weekLabelOf(lastWeekStart, planningCycle)} ·{' '}
                          {lastWeekEnd.format('dddd D MMM YYYY')}
                        </span>
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex h-8 items-center justify-between">
                        <span className="text-sm font-medium text-text-dark">
                          Période
                        </span>
                        {mode === 'weeks' && (
                          <div className="flex h-8 items-center rounded-full border border-border">
                            <button
                              type="button"
                              aria-label="Retirer une semaine"
                              disabled={weekCount <= MIN_WEEK_COUNT}
                              onClick={() =>
                                setWeekCount((n) =>
                                  Math.max(MIN_WEEK_COUNT, n - 1),
                                )
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
                                setWeekCount((n) =>
                                  Math.min(MAX_WEEK_COUNT, n + 1),
                                )
                              }
                              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-text-dark hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-0.5 rounded-lg bg-muted p-[3px]">
                        {presets.map(({ key, label, onPick }) => (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={activePreset === key}
                            onClick={onPick}
                            className={cn(
                              'h-[30px] flex-auto cursor-pointer whitespace-nowrap rounded-md px-1 text-[13px]',
                              activePreset === key
                                ? 'bg-white font-semibold text-foreground shadow-sm'
                                : 'font-medium text-text-light hover:text-text-dark',
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </PopoverAnchor>
                <PopoverContent
                  side="bottom"
                  align="start"
                  sideOffset={8}
                  className="rounded-lg bg-white p-0 shadow-[0_8px_24px_rgba(4,24,43,.2)]"
                >
                  {customFocus && (
                    <ExportCustomPeriod
                      initialFrom={period.weekStart}
                      initialTo={lastWeekEnd}
                      initialFocus={customFocus}
                      onApply={applyCustom}
                      onCancel={() => setCustomFocus(null)}
                    />
                  )}
                </PopoverContent>
              </PopoverRoot>

              {mode === 'weeks' ? (
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
                        pageIndex={
                          index >= 0 && index < weekCount ? index : null
                        }
                        isLast={index === weekCount - 1}
                        isShown={index === shownPage}
                        isClosed={closedWeekKeys.has(
                          monday.format('YYYY-MM-DD'),
                        )}
                        onPick={() => handlePickWeek(monday)}
                      />
                    )
                  })}
                </div>
              ) : (
                <MonthGrid
                  year={gridYear}
                  firstMonth={firstMonth}
                  months={MONTHS_OF[mode]}
                  period={period}
                  onYearChange={setGridYear}
                  onPick={(first) => {
                    setFirstMonth(first)
                    setPage(0)
                  }}
                />
              )}

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-text-dark">
                  Filtres
                </span>
                <FilterPicker
                  icon={RouteIcon}
                  label="Parcours"
                  allLabel="Tous les parcours"
                  noneLabel="Aucun parcours"
                  searchPlaceholder="Rechercher un parcours"
                  items={pathwayItems}
                  excludedIds={excludedPathwayIds}
                  onToggle={(id) =>
                    setExcludedPathwayIds((prev) => toggleIn(prev, id))
                  }
                  onSelectAll={() => setExcludedPathwayIds(new Set())}
                  onClear={() =>
                    setExcludedPathwayIds(
                      new Set(pathwayItems.map((item) => item.id)),
                    )
                  }
                />
                <FilterPicker
                  icon={Users}
                  label="Soignants"
                  allLabel="Tous les soignants"
                  noneLabel="Aucun soignant"
                  searchPlaceholder="Rechercher un soignant"
                  items={soignantItems}
                  excludedIds={excludedSoignantIds}
                  onToggle={(id) =>
                    setExcludedSoignantIds((prev) => toggleIn(prev, id))
                  }
                  onSelectAll={() => setExcludedSoignantIds(new Set())}
                  onClear={() =>
                    setExcludedSoignantIds(
                      new Set(soignantItems.map((item) => item.id)),
                    )
                  }
                />
                <span className="text-xs leading-normal text-text-light">
                  Un créneau est exporté s’il appartient à un parcours coché{' '}
                  <b className="text-text-dark">et</b> a au moins un soignant
                  coché.
                </span>
              </div>

              <ExportSummary
                period={period}
                slotCount={slotCount}
                notes={filterSummary}
                empty={noneIncluded}
              />
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
                  Page {shownPage + 1} sur {period.weekCount}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg disabled:opacity-40"
                  aria-label="Page suivante"
                  disabled={shownPage >= period.weekCount - 1}
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** « Soignants : … » quand le filtre écarte au moins un soignant, sans les écarter tous. */
function soignantNote(included: FilterItem[], total: number) {
  if (included.length === 0 || included.length === total) {
    return undefined
  }
  return `Soignants : ${included.map((item) => item.name).join(', ')}`
}

function ExportSummary({
  period,
  slotCount,
  notes,
  empty,
}: {
  period: ExportPeriod
  slotCount: number
  notes: string[]
  empty: boolean
}) {
  if (empty) {
    return (
      <p className="m-0 text-[13px] leading-normal text-text-dark">
        Choisissez au moins un parcours et un soignant.
      </p>
    )
  }
  const { weekStart, weekCount } = period
  const lastDay = weekStart.add(weekCount - 1, 'week').add(4, 'day')
  const pages = `${weekCount} page${weekCount > 1 ? 's' : ''} paysage`
  const slotsLabel = `${slotCount} créneau${slotCount > 1 ? 'x' : ''}`
  const filters = notes.map((note) => ` · ${note}`).join('')
  return (
    <div className="flex flex-col gap-1.5">
      <p className="m-0 text-[13px] leading-normal text-text-dark">
        Du {weekStart.format('DD/MM/YYYY')} au {lastDay.format('DD/MM/YYYY')} :{' '}
        {pages}, {slotsLabel}
        {filters}.
      </p>
      {weekCount > SLOW_EXPORT_WEEKS && (
        <p className="m-0 flex items-center gap-2 rounded-lg bg-a-saisir-fond px-2.5 py-2 text-xs leading-snug text-a-saisir-texte">
          <Clock size={14} className="shrink-0" />
          {weekCount} pages : la génération du PDF peut prendre quelques
          secondes.
        </p>
      )}
    </div>
  )
}

/** Semestre / année : on clique le premier mois, la plage se surligne. */
function MonthGrid({
  year,
  firstMonth,
  months,
  period,
  onYearChange,
  onPick,
}: {
  year: number
  firstMonth: Dayjs
  months: number
  period: ExportPeriod
  onYearChange: (year: number) => void
  onPick: (first: Dayjs) => void
}) {
  const startIndex = firstMonth.year() * 12 + firstMonth.month()
  const lastWeekEnd = period.weekStart
    .add(period.weekCount - 1, 'week')
    .add(6, 'day')
  return (
    <div className="flex flex-col gap-2.5 rounded-[10px] border border-border px-3 pt-2.5 pb-3">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[15px] font-semibold text-foreground">
          {year}
        </span>
        <span className="flex gap-1">
          <Button
            variant="icon"
            size="icon-md"
            className="h-7 w-7 hover:bg-muted"
            aria-label="Année précédente"
            onClick={() => onYearChange(year - 1)}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="icon"
            size="icon-md"
            className="h-7 w-7 hover:bg-muted"
            aria-label="Année suivante"
            onClick={() => onYearChange(year + 1)}
          >
            <ChevronRight size={16} />
          </Button>
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: 12 }, (_, m) => {
          const first = dayjs.utc(`${year}-01-01`).add(m, 'month')
          const index = year * 12 + m
          const isStart = index === startIndex
          const inRange = index >= startIndex && index < startIndex + months
          const weekCount =
            first
              .endOf('month')
              .isoWeekday(1)
              .diff(first.isoWeekday(1), 'week') + 1
          return (
            <button
              key={first.format('YYYY-MM')}
              type="button"
              aria-pressed={isStart}
              onClick={() => onPick(first)}
              className={cn(
                'flex h-[52px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg hover:shadow-[inset_0_0_0_1.5px_#93c5fd]',
                isStart
                  ? 'bg-primary text-white'
                  : inRange
                    ? 'bg-[#dbeafe] text-primary-dark'
                    : 'bg-surface-douce text-foreground',
              )}
            >
              <span className="text-sm font-semibold capitalize">
                {first.format('MMM').replace('.', '')}
              </span>
              <span
                className={cn(
                  'text-[11px]',
                  isStart ? 'text-[#dbeafe]' : !inRange && 'text-text-light',
                )}
              >
                {weekCount} sem.
              </span>
            </button>
          )
        })}
      </div>
      <span className="text-xs leading-normal text-text-light">
        Cliquez le premier mois. {months} mois en semaines entières : du lundi{' '}
        {period.weekStart.format('D MMM YYYY')} au dimanche{' '}
        {lastWeekEnd.format('D MMM YYYY')}.
      </span>
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

function FilterPicker({
  icon: Icon,
  label,
  allLabel,
  noneLabel,
  searchPlaceholder,
  items,
  excludedIds,
  onToggle,
  onSelectAll,
  onClear,
}: {
  icon: LucideIcon
  label: string
  allLabel: string
  noneLabel: string
  searchPlaceholder: string
  items: FilterItem[]
  excludedIds: Set<string>
  onToggle: (id: string) => void
  onSelectAll: () => void
  onClear: () => void
}) {
  const [query, setQuery] = useState('')
  const included = items.filter((item) => !excludedIds.has(item.id))
  const allIncluded = included.length === items.length
  // Deux noms se lisent mieux qu'un compte ; au-delà, on compte.
  const summary =
    included.length === 0
      ? noneLabel
      : allIncluded
        ? allLabel
        : included.length <= 2
          ? included.map((item) => item.name).join(', ')
          : `${included.length} sur ${items.length}`
  const shown = items.filter((item) =>
    item.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <PopoverRoot onOpenChange={() => setQuery('')}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label} : ${summary}`}
          className={cn(
            'flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg border px-3 text-left text-sm text-foreground data-[state=open]:border-primary',
            allIncluded
              ? 'border-border bg-white'
              : 'border-primary-light bg-blue-50',
          )}
        >
          <Icon size={16} className="shrink-0 text-text-light" />
          <span className="w-[76px] shrink-0 text-text-light">{label}</span>
          <span className="flex pl-1">
            {included.slice(0, 4).map((item) => (
              <span
                key={item.id}
                className="-ml-1 h-3 w-3 rounded-full border-2 border-white"
                style={{ backgroundColor: item.color }}
              />
            ))}
          </span>
          <span className="flex-1 truncate font-medium">{summary}</span>
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
            placeholder={searchPlaceholder}
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
          {shown.map((item, index) => {
            const checked = !excludedIds.has(item.id)
            const startsGroup =
              item.group && item.group !== shown[index - 1]?.group
            return (
              <Fragment key={item.id}>
                {startsGroup && (
                  <>
                    {index > 0 && <div className="my-1 h-px bg-border" />}
                    <div className="px-2 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text-light">
                      {item.group}
                    </div>
                  </>
                )}
                <button
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
              </Fragment>
            )
          })}
        </div>
      </PopoverContent>
    </PopoverRoot>
  )
}
