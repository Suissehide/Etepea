import FullCalendar, {
  type CalendarController,
  type DateSelectInfo,
  type EventDropInfo,
  type EventInput,
  type EventResizeDoneInfo,
  useCalendarController,
} from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/react/daygrid'
import interactionPlugin from '@fullcalendar/react/interaction'
import frLocale from '@fullcalendar/react/locales/fr'
import multiMonthPlugin from '@fullcalendar/react/multimonth'
import breezyTheme from '@fullcalendar/react/themes/breezy'
import { createFileRoute, redirect } from '@tanstack/react-router'
import dayjs from 'dayjs'
import {
  CalendarArrowUp,
  CalendarDays,
  ChevronUp,
  Copy,
  Ellipsis,
  GanttChart,
  Printer,
  RefreshCw,
  Repeat,
  Tags,
  Trash2,
  X,
} from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  BarreCalendrier,
  SEGMENT,
  SEGMENTS,
} from '@/components/custom/Calendar/barreCalendrier.tsx'
import Calendar, {
  type CalendarEvent,
} from '@/components/custom/Calendar/calendar.tsx'
import {
  BAR_BUTTON,
  MENU_ITEM,
  SelectAllShortcut,
  SelectionBar,
} from '@/components/custom/Calendar/selectionBar.tsx'
import LocationFilter, {
  NO_LOCATION_KEY,
} from '@/components/custom/planning/locationFilter.tsx'
import PathwayFilter, {
  NO_PATHWAY_KEY,
} from '@/components/custom/planning/pathwayFilter.tsx'
import PlanningExportModal from '@/components/custom/planning/pdf/planning-export-modal.tsx'
import AddSlotForm from '@/components/custom/popup/addSlotForm.tsx'
import {
  BulkThematicTypeForm,
  type ThematicTypeChanges,
} from '@/components/custom/popup/bulkThematicTypeForm.tsx'
import {
  BulkWeekForm,
  type BulkWeekMode,
} from '@/components/custom/popup/bulkWeekForm.tsx'
import { ConfirmDeleteForm } from '@/components/custom/popup/confirmDeleteForm.tsx'
import { CreateForbiddenWeekForm } from '@/components/custom/popup/createForbiddenWeekForm.tsx'
import { DeleteForbiddenWeekForm } from '@/components/custom/popup/deleteForbiddenWeekForm.tsx'
import { PlanningCycleForm } from '@/components/custom/popup/planningCycleForm.tsx'
import { RegeneratePathwaysForm } from '@/components/custom/popup/regeneratePathwaysForm.tsx'
import EventSheet from '@/components/custom/sheet/eventSheet.tsx'
import EventTemplateSheet from '@/components/custom/sheet/eventTemplateSheet.tsx'
import DashboardLayout from '@/components/dashboard.layout.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  PopoverAnchor,
  PopoverArrow,
  PopoverClose,
  PopoverContent,
  PopoverRoot,
} from '@/components/ui/popover.tsx'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'
import { TOAST_SEVERITY } from '@/constants/ui.constant.ts'
import { can } from '@/hooks/useCan.ts'
import { useToast } from '@/hooks/useToast.ts'
import { labelConflicts } from '@/libs/planningConflicts.ts'
import { getBookedPatientCount } from '@/libs/slotAvailability.ts'
import {
  buildCalendarEventsFromSlots,
  buildCalendarEventsFromSlotTemplates,
  buildPathwayEvents,
} from '@/libs/utils.ts'
import {
  useForbiddenWeekMutations,
  useForbiddenWeekQueries,
} from '@/queries/useForbiddenWeek.ts'
import { useLocationQueries } from '@/queries/useLocation.ts'
import { usePathwayMutations, usePathwayQueries } from '@/queries/usePathway.ts'
import { usePathwayTemplateQueries } from '@/queries/usePathwayTemplate.ts'
import {
  usePlanningCycleMutations,
  usePlanningCycleQueries,
} from '@/queries/usePlanningCycle.ts'
import {
  useSlotConflictsQuery,
  useSlotMutations,
  useSlotsInRangeQuery,
} from '@/queries/useSlot.ts'
import { useSlotTemplateMutations } from '@/queries/useSlotTemplate.ts'
import { usePathwayTemplateEditStore } from '@/store/usePathwayTemplateEditStore.ts'
import { usePlanningStore } from '@/store/usePlanningStore.ts'
import type {
  CreateSlotParamsWithTemplateData,
  Slot,
  SlotDateRange,
} from '@/types/slot.ts'
import type { SlotTemplate } from '@/types/slotTemplate.ts'
import { resolveTenantContext } from '@/utils/tenant-context.ts'
import { cycleWeekNumber } from '@/utils/weekCycle.ts'

export const Route = createFileRoute(
  '/_authenticated/e/$establishmentId/s/$serviceId/_settings/planning',
)({
  // Cet écran, lui, exige spécifiquement `planning:write` (il ne contient
  // que des actions d'écriture de planning : créneaux, modèles, parcours,
  // semaines interdites, cycle). Vu le nombre de contrôles concernés, on
  // garde l'écran entier plutôt que chaque bouton un par un.
  beforeLoad: ({ context, params }) => {
    const tenant = resolveTenantContext(context.authState.user, params)
    if (!can(tenant, 'planning:write')) {
      throw redirect({
        to: '/e/$establishmentId/s/$serviceId/dashboard',
        params,
      })
    }
  },
  component: Planning,
})

const buildTemplateDuplicateParams = (
  slotTemplate: SlotTemplate,
  offsetDays: SlotTemplate['offsetDays'],
  templateID: string,
) => ({
  startTime: slotTemplate.startTime,
  endTime: slotTemplate.endTime,
  offsetDays,
  thematicId: slotTemplate.thematicId,
  locationID: slotTemplate.locationID,
  description: slotTemplate.description,
  color: slotTemplate.color,
  isIndividual: slotTemplate.isIndividual,
  capacity: slotTemplate.capacity,
  soignantIDs: slotTemplate.soignants?.map((s) => s.id) ?? [],
  templateID,
})

// Lundi de la semaine affichée, à défaut celui de la semaine courante.
const mondayOfViewedWeek = () => {
  const { viewStart } = usePlanningStore.getState()
  return viewStart
    ? dayjs.utc(viewStart).isoWeekday(1)
    : dayjs.utc().isoWeekday(1)
}

// Mode semaines fixes : numéro de la semaine affichée, et nombre de semaines du modèle.
const templateWeekOf = (monday: dayjs.Dayjs, startDate: string) =>
  Math.max(
    1,
    Math.floor(monday.diff(dayjs.utc(startDate).isoWeekday(1), 'day') / 7) + 1,
  )
const templateWeekCount = (slotTemplates: SlotTemplate[] = []) =>
  Math.max(
    1,
    ...slotTemplates.map((t) => Math.floor((t.offsetDays ?? 0) / 7) + 1),
  )

type BulkAction = BulkWeekMode | 'thematicType' | 'delete'

type SelectedTemplate = { slotId?: string; template: SlotTemplate }

// Le modèle de chaque événement sélectionné, avec l'id du créneau quand c'en est un.
function selectionTemplates(
  eventIds: string[],
  slots: Slot[],
  slotTemplates: SlotTemplate[],
): SelectedTemplate[] {
  return eventIds.flatMap((eventId): SelectedTemplate[] => {
    const id = eventId.replace(/^.*?_/, '')
    const slot = eventId.startsWith('slot_')
      ? slots.find((s) => s.id === id)
      : undefined
    if (slot) {
      return [{ slotId: id, template: slot.slotTemplate }]
    }
    const template = slotTemplates.find((t) => t.id === id)
    return template ? [{ template }] : []
  })
}

function Planning() {
  // Plage connue seulement une fois le calendrier monté : la page s'affiche
  // d'abord, les créneaux suivent.
  const [visibleRange, setVisibleRange] = useState<SlotDateRange | null>(null)
  const handleRangeChange = useCallback((next: SlotDateRange) => {
    setVisibleRange((prev) =>
      prev && prev.from === next.from && prev.to === next.to ? prev : next,
    )
  }, [])
  const { slots, dataUpdatedAt } = useSlotsInRangeQuery(visibleRange)
  const conflicts = useSlotConflictsQuery(visibleRange, dataUpdatedAt)
  const conflictLabels = useMemo(
    () => labelConflicts(conflicts, slots ?? []),
    [conflicts, slots],
  )
  const { pathways } = usePathwayQueries()
  const { pathwayTemplates } = usePathwayTemplateQueries()
  const { createSlot, updateSlot, deleteSlot, archiveSlots } =
    useSlotMutations()
  const { instantiatePathway, deletePathway } = usePathwayMutations()
  const { toast } = useToast()
  const controleurAnnee = useCalendarController()
  const { createSlotTemplate, updateSlotTemplate, deleteSlotTemplate } =
    useSlotTemplateMutations()
  const { forbiddenWeeks } = useForbiddenWeekQueries()
  const { createForbiddenWeek, deleteForbiddenWeek } =
    useForbiddenWeekMutations()

  const [exportOpen, setExportOpen] = useState(false)
  const [cycleOpen, setCycleOpen] = useState(false)
  const { planningCycle } = usePlanningCycleQueries()
  const { savePlanningCycle, resetPlanningCycle } = usePlanningCycleMutations()
  const [regenerateOpen, setRegenerateOpen] = useState(false)

  const [createForbiddenWeekDate, setCreateForbiddenWeekDate] = useState<
    string | null
  >(null)
  const [deleteForbiddenWeekTarget, setDeleteForbiddenWeekTarget] = useState<{
    id: string
    startOfWeek: string
  } | null>(null)
  const editMode = usePathwayTemplateEditStore((state) => state.editMode)
  const startDate = usePathwayTemplateEditStore((state) => state.startDate)
  const currentPathwayTemplateId = usePathwayTemplateEditStore(
    (state) => state.currentPathwayTemplate?.id,
  )
  const currentPathwayTemplate = pathwayTemplates?.find(
    (template) => template.id === currentPathwayTemplateId,
  )

  const [view, setView] = useState<'calendar' | 'timeline'>('calendar')
  const [isForbiddenWeekMode, setIsForbiddenWeekMode] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PathwayDeleteTarget | null>(
    null,
  )
  const [hoveredPathway, setHoveredPathway] = useState<HoveredPathway | null>(
    null,
  )
  const [openEventId, setOpenEventId] = useState('')
  const [deleteConfirmEventId, setDeleteConfirmEventId] = useState<
    string | null
  >(null)
  const [openCreateSlotModal, setOpenCreateSlotModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<DateSelectInfo | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [eventTemplates, setEventTemplates] = useState<CalendarEvent[]>([])
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string>>(new Set())
  const [hiddenPathwayIds, setHiddenPathwayIds] = useState<Set<string>>(
    new Set(),
  )

  const handleTogglePathwayFilter = useCallback(
    (id: string, checked: boolean) => {
      setHiddenPathwayIds((prev) => {
        const next = new Set(prev)
        if (checked) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    },
    [],
  )

  const handleResetPathwayFilter = useCallback(() => {
    setHiddenPathwayIds(new Set())
  }, [])

  const handleHideAllPathways = useCallback(() => {
    setHiddenPathwayIds(
      new Set([
        NO_PATHWAY_KEY,
        ...(pathwayTemplates ?? []).map((template) => template.id),
      ]),
    )
  }, [pathwayTemplates])
  const { locations } = useLocationQueries()
  const [hiddenLocationIds, setHiddenLocationIds] = useState<Set<string>>(
    new Set(),
  )

  const handleToggleLocationFilter = useCallback(
    (id: string, checked: boolean) => {
      setHiddenLocationIds((prev) => {
        const next = new Set(prev)
        if (checked) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    },
    [],
  )

  const handleResetLocationFilter = useCallback(() => {
    setHiddenLocationIds(new Set())
  }, [])

  const handleHideAllLocations = useCallback(() => {
    setHiddenLocationIds(
      new Set([
        NO_LOCATION_KEY,
        ...(locations ?? []).map((location) => location.id),
      ]),
    )
  }, [locations])
  // Semaine source figée à l'ouverture : la popup en déduit sa cible par défaut.
  const [weekAction, setWeekAction] = useState<{
    open: boolean
    mode: BulkWeekMode
    source: dayjs.Dayjs
  }>(() => ({ open: false, mode: 'duplicate', source: mondayOfViewedWeek() }))
  const closeWeekAction = () =>
    setWeekAction((action) => ({ ...action, open: false }))
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [showThematicTypeModal, setShowThematicTypeModal] = useState(false)

  const handleToggleSelect = useCallback((eventId: string) => {
    setSelectedSlotIds((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }, [])

  // Dès qu'un créneau est coché, cliquer sur un créneau le coche au lieu de l'ouvrir.
  const isSelecting = selectedSlotIds.size > 0
  const handleClickSlot = useCallback(
    (eventId: string) => {
      if (!isSelecting) {
        setOpenEventId(eventId)
      } else if (/^(slot|template)_/.test(eventId)) {
        handleToggleSelect(eventId)
      }
    },
    [isSelecting, handleToggleSelect],
  )

  const handleSelectAll = useCallback((ids: string[]) => {
    setSelectedSlotIds((prev) => new Set([...prev, ...ids]))
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedSlotIds(new Set())
  }, [])

  const visibleSlots = useMemo(() => {
    if (!slots) {
      return []
    }
    return slots.filter(
      (slot) =>
        !slot.archivedAt &&
        !hiddenPathwayIds.has(slot.pathway?.template?.id ?? NO_PATHWAY_KEY) &&
        !hiddenLocationIds.has(
          slot.slotTemplate?.location?.id ??
            slot.slotTemplate?.locationID ??
            NO_LOCATION_KEY,
        ),
    )
  }, [slots, hiddenPathwayIds, hiddenLocationIds])

  useEffect(() => {
    setEvents(
      buildCalendarEventsFromSlots(
        visibleSlots,
        editMode ? ['editable'] : ['default'],
        conflictLabels,
      ),
    )
  }, [visibleSlots, editMode, conflictLabels])

  useEffect(() => {
    if (currentPathwayTemplate?.slotTemplates) {
      setEventTemplates(
        buildCalendarEventsFromSlotTemplates(
          currentPathwayTemplate?.slotTemplates,
          startDate,
        ),
      )
    }
  }, [currentPathwayTemplate, startDate])

  const handleInstantiatePathway = (
    pathwayTemplateID: string,
    startDate: string,
  ) => {
    instantiatePathway.mutate({
      pathwayTemplateID,
      startDate,
    })
  }

  const handleSelectSlot = (dateSelectArg: DateSelectInfo) => {
    setSelectedDate(dateSelectArg)
    setOpenCreateSlotModal(true)
  }

  const handleCreateSlot = (
    newSlot: CreateSlotParamsWithTemplateData,
    recurrenceWeeks?: number,
  ) => {
    const weeks = recurrenceWeeks ?? 1

    if (editMode) {
      const baseOffsetDays = dayjs
        .utc(newSlot.startDate)
        .diff(dayjs.utc(startDate), 'day')
      for (let w = 0; w < weeks; w++) {
        const offsetDays = baseOffsetDays + w * 7
        const slotTemplate = {
          startTime: newSlot.startDate,
          endTime: newSlot.endDate,
          offsetDays,
          thematicId: newSlot.slotTemplate.thematicId,
          locationID: newSlot.slotTemplate.locationID,
          description: newSlot.slotTemplate.description,
          color: newSlot.slotTemplate.color,
          isIndividual: newSlot.slotTemplate.isIndividual,
          capacity: newSlot.slotTemplate.capacity,
          soignantIDs: newSlot.slotTemplate.soignantIDs,
          templateID: currentPathwayTemplate?.id,
        }
        createSlotTemplate.mutate(slotTemplate, {
          onSuccess: () => {
            if (w === weeks - 1) {
              setOpenCreateSlotModal(false)
            }
          },
        })
      }
    } else {
      for (let w = 0; w < weeks; w++) {
        const weekStart = dayjs.utc(newSlot.startDate).add(w * 7, 'day')
        const weekEnd = dayjs.utc(newSlot.endDate).add(w * 7, 'day')
        const weekSlot: CreateSlotParamsWithTemplateData = {
          startDate: weekStart.toISOString(),
          endDate: weekEnd.toISOString(),
          slotTemplate: {
            ...newSlot.slotTemplate,
            startTime: weekStart.toISOString(),
            endTime: weekEnd.toISOString(),
          },
        }
        createSlot.mutate(weekSlot)
      }
      setOpenCreateSlotModal(false)
    }
  }

  const handleEditSlot = (
    eventDropArg: EventDropInfo | EventResizeDoneInfo,
  ) => {
    const {
      id,
      startStr: start,
      endStr: end,
      extendedProps,
    } = eventDropArg.event

    const slotId = id.replace(/^.*?_/, '')

    if (editMode) {
      const newOffsetDays = dayjs.utc(start).diff(dayjs.utc(startDate), 'day')

      updateSlotTemplate.mutate({
        id: slotId,
        offsetDays: newOffsetDays,
        startTime: start,
        endTime: end,
      })
    } else {
      updateSlot.mutate({
        id: slotId,
        startDate: start,
        endDate: end,
        slotTemplate: {
          id: extendedProps.templateID,
          startTime: start,
          endTime: end,
        },
      })
    }
  }

  /**
   * Un créneau où un patient est inscrit est archivé : le supprimer perdrait son
   * rendez-vous. Un rendez-vous sans patient (l'import historique en a laissé)
   * n'est pas une inscription : le créneau part pour de bon.
   */
  const archiveOrDeleteSlots = (ids: string[]) => {
    const toArchive = ids.filter((id) => {
      const slot = slots?.find((s) => s.id === id)
      return slot && getBookedPatientCount(slot) > 0
    })
    for (const id of ids) {
      if (!toArchive.includes(id)) {
        deleteSlot.mutate(id)
      }
    }
    if (toArchive.length === 0) {
      return
    }
    archiveSlots.mutate(
      { ids: toArchive, archived: true },
      {
        onSuccess: () =>
          toast({
            title: `${toArchive.length} créneau(x) conservé(s) au lieu d'être supprimé(s)`,
            message:
              'Ils portent des rendez-vous, qui restent visibles sur le Dashboard.',
            severity: TOAST_SEVERITY.SUCCESS,
            action: (
              <Button
                variant="none"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() =>
                  archiveSlots.mutate({ ids: toArchive, archived: false })
                }
              >
                Annuler
              </Button>
            ),
          }),
      },
    )
  }

  const handleDeleteEvent = (id: string) => {
    if (editMode) {
      deleteSlotTemplate.mutate(id)
      return
    }
    archiveOrDeleteSlots([id])
  }

  const handleDeleteHoverSlot = (eventId: string) => {
    setDeleteConfirmEventId(eventId)
  }

  const handleConfirmDeleteHoverSlot = () => {
    if (!deleteConfirmEventId) {
      return
    }
    const id = deleteConfirmEventId.replace(/^.*?_/, '')
    handleDeleteEvent(id)
    setDeleteConfirmEventId(null)
  }

  const buildSlotDuplicateParams = (
    slot: NonNullable<typeof slots>[number],
    newStartDate: string,
    newEndDate: string,
  ): CreateSlotParamsWithTemplateData => ({
    startDate: newStartDate,
    endDate: newEndDate,
    slotTemplate: {
      startTime: newStartDate,
      endTime: newEndDate,
      offsetDays: 0,
      thematicId: slot.slotTemplate.thematicId,
      locationID: slot.slotTemplate.locationID,
      description: slot.slotTemplate.description,
      color: slot.slotTemplate.color,
      isIndividual: slot.slotTemplate.isIndividual,
      capacity: slot.slotTemplate.capacity ?? 1,
      soignantIDs: slot.slotTemplate.soignants?.map((s) => s.id) ?? [],
    },
  })

  const computeSlotNewDates = (
    slot: { startDate: string; endDate: string },
    targetWeekStart: dayjs.Dayjs,
  ) => {
    const slotStart = dayjs.utc(slot.startDate)
    const slotWeekStart = slotStart.isoWeekday(1).startOf('day')
    const dayOffset = slotStart.diff(slotWeekStart, 'day')
    const timeOfDay = slotStart.format('HH:mm:ss')
    const duration = dayjs.utc(slot.endDate).diff(slotStart, 'minute')

    const newStart = targetWeekStart.add(dayOffset, 'day')
    const newStartFull = dayjs.utc(
      `${newStart.format('YYYY-MM-DD')}T${timeOfDay}`,
    )
    const newEnd = newStartFull.add(duration, 'minute')
    return { newStart: newStartFull, newEnd }
  }

  const selectedIdsWithPrefix = (prefix: string) =>
    [...selectedSlotIds]
      .filter((eventId) => eventId.startsWith(prefix))
      .map((eventId) => eventId.replace(prefix, ''))

  const finishBulkOperation = (
    action: 'duplicate' | 'move',
    destination: string,
  ) => {
    const label = action === 'duplicate' ? 'dupliqué' : 'déplacé'
    toast({
      title:
        action === 'duplicate'
          ? 'Duplication en cours'
          : 'Déplacement en cours',
      message: `${selectedSlotIds.size} créneau(x) ${label}(s) sur ${destination}`,
      severity: TOAST_SEVERITY.SUCCESS,
    })
    handleClearSelection()
  }

  const handleDuplicateSlot = (eventId: string) => {
    if (eventId.startsWith('slot_')) {
      const slotId = eventId.replace('slot_', '')
      const slot = slots?.find((s) => s.id === slotId)
      if (!slot) {
        return
      }
      createSlot.mutate(
        buildSlotDuplicateParams(slot, slot.startDate, slot.endDate),
      )
    } else if (eventId.startsWith('template_')) {
      const templateId = eventId.replace('template_', '')
      const slotTemplate = currentPathwayTemplate?.slotTemplates?.find(
        (t) => t.id === templateId,
      )
      if (!slotTemplate || !currentPathwayTemplate) {
        return
      }
      createSlotTemplate.mutate(
        buildTemplateDuplicateParams(
          slotTemplate,
          slotTemplate.offsetDays,
          currentPathwayTemplate.id,
        ),
      )
    }
  }

  const handleToggleLock = (eventId: string, locked: boolean) => {
    if (!eventId.startsWith('slot_')) {
      return
    }
    const slotId = eventId.replace('slot_', '')
    updateSlot.mutate({ id: slotId, locked })
  }

  const handleBulkSlotOperation = (
    targetDate: dayjs.Dayjs,
    action: 'duplicate' | 'move',
  ) => {
    const targetWeekStart = targetDate.isoWeekday(1).utc().startOf('day')

    for (const slotId of selectedIdsWithPrefix('slot_')) {
      const slot = slots?.find((s) => s.id === slotId)
      if (!slot) {
        continue
      }

      const { newStart, newEnd } = computeSlotNewDates(slot, targetWeekStart)

      if (action === 'duplicate') {
        createSlot.mutate(
          buildSlotDuplicateParams(
            slot,
            newStart.toISOString(),
            newEnd.toISOString(),
          ),
        )
      } else {
        updateSlot.mutate({
          id: slotId,
          startDate: newStart.toISOString(),
          endDate: newEnd.toISOString(),
          slotTemplate: {
            id: slot.slotTemplate.id,
            startTime: newStart.toISOString(),
            endTime: newEnd.toISOString(),
          },
        })
      }
    }

    finishBulkOperation(
      action,
      `la semaine du ${targetWeekStart.format('DD/MM/YYYY')}`,
    )
    closeWeekAction()
  }

  const handleBulkTemplateOperation = (
    targetWeekNum: number,
    action: 'duplicate' | 'move',
  ) => {
    if (!currentPathwayTemplate) {
      return
    }

    for (const templateId of selectedIdsWithPrefix('template_')) {
      const slotTemplate = currentPathwayTemplate.slotTemplates?.find(
        (t) => t.id === templateId,
      )
      if (!slotTemplate) {
        continue
      }

      const dayInWeek = (slotTemplate.offsetDays ?? 0) % 7
      const newOffsetDays = (targetWeekNum - 1) * 7 + dayInWeek

      if (action === 'duplicate') {
        createSlotTemplate.mutate(
          buildTemplateDuplicateParams(
            slotTemplate,
            newOffsetDays,
            currentPathwayTemplate.id,
          ),
        )
      } else {
        updateSlotTemplate.mutate({
          id: templateId,
          offsetDays: newOffsetDays,
          startTime: slotTemplate.startTime,
          endTime: slotTemplate.endTime,
        })
      }
    }

    finishBulkOperation(action, `la semaine ${targetWeekNum}`)
    closeWeekAction()
  }

  const handleBulkDelete = () => {
    const ids = selectedIdsWithPrefix(editMode ? 'template_' : 'slot_')

    if (editMode) {
      for (const id of ids) {
        deleteSlotTemplate.mutate(id)
      }
    } else {
      archiveOrDeleteSlots(ids)
    }
    setShowBulkDeleteModal(false)
    handleClearSelection()
  }

  const selectedTemplates = () =>
    selectionTemplates(
      [...selectedSlotIds],
      slots ?? [],
      currentPathwayTemplate?.slotTemplates ?? [],
    )

  const handleBulkThematicType = (changes: ThematicTypeChanges) => {
    for (const { slotId, template } of selectedTemplates()) {
      if (slotId) {
        updateSlot.mutate({
          id: slotId,
          slotTemplate: { id: template.id, ...changes },
        })
      } else {
        updateSlotTemplate.mutate({ id: template.id, ...changes })
      }
    }
    toast({
      title: 'Créneaux modifiés',
      message: `${selectedSlotIds.size} créneau(x) modifié(s)`,
      severity: TOAST_SEVERITY.SUCCESS,
    })
    handleClearSelection()
  }

  const bulkActions: Record<BulkAction, () => void> = {
    duplicate: () =>
      setWeekAction({
        open: true,
        mode: 'duplicate',
        source: mondayOfViewedWeek(),
      }),
    move: () =>
      setWeekAction({ open: true, mode: 'move', source: mondayOfViewedWeek() }),
    thematicType: () => setShowThematicTypeModal(true),
    delete: () => setShowBulkDeleteModal(true),
  }
  const handleBulkActionChange = (action: BulkAction) => bulkActions[action]()

  const handleForbiddenWeekCreate = (date: string) => {
    setCreateForbiddenWeekDate(date)
  }

  const handleForbiddenWeekDelete = (id: string) => {
    const week = forbiddenWeeks?.find((fw) => fw.id === id)
    if (week) {
      setDeleteForbiddenWeekTarget({
        id: week.id,
        startOfWeek: week.startOfWeek,
      })
    }
  }

  const mergedEvents = useMemo(() => {
    return editMode ? (eventTemplates ?? []) : events
  }, [events, eventTemplates, editMode])

  useEffect(() => {
    if (editMode) {
      setView('calendar')
    }
    handleClearSelection()
    // `handleClearSelection` est memoise avec une liste vide : sa reference ne change jamais,
    // l'ajouter ne fait donc pas re-jouer cet effet.
  }, [editMode, handleClearSelection])

  const pathwayEvents = useMemo<CalendarEvent[]>(() => {
    if (!pathways) {
      return []
    }
    if (hiddenPathwayIds.size === 0) {
      return buildPathwayEvents(pathways)
    }
    return buildPathwayEvents(
      pathways.filter(
        (pathway) =>
          !hiddenPathwayIds.has(
            pathway.template?.id ?? pathway.pathwayTemplateID ?? NO_PATHWAY_KEY,
          ),
      ),
    )
  }, [pathways, hiddenPathwayIds])

  const forbiddenWeekBackgroundEvents = useMemo(() => {
    return (forbiddenWeeks ?? []).map((fw) => ({
      id: `forbidden_${fw.id}`,
      start: dayjs.utc(fw.startOfWeek).format('YYYY-MM-DD'),
      end: dayjs.utc(fw.startOfWeek).add(7, 'day').format('YYYY-MM-DD'),
      display: 'background' as const,
      color: 'rgba(239, 68, 68, 0.20)',
    }))
  }, [forbiddenWeeks])

  // FullCalendar compare ses options par identité : une fonction recréée à
  // chaque rendu ferait rater le cache de dateEnv et reconstruirait toute la
  // grille annuelle à chaque rendu. On mémoïse donc la fonction elle-même,
  // pas seulement son résultat.
  const weekNumberCalculation = useMemo<'ISO' | ((date: Date) => number)>(
    () =>
      planningCycle
        ? (date: Date) => cycleWeekNumber(dayjs.utc(date), planningCycle) ?? 0
        : 'ISO',
    [planningCycle],
  )

  const handleTimelineDateClick = (info: { dateStr: string }) => {
    if (!isForbiddenWeekMode) {
      return
    }
    const clickedDate = dayjs.utc(info.dateStr)
    const matchingForbiddenWeek = (forbiddenWeeks ?? []).find((fw) => {
      const start = dayjs.utc(fw.startOfWeek)
      return (
        (clickedDate.isSame(start) || clickedDate.isAfter(start)) &&
        clickedDate.isBefore(start.add(7, 'day'))
      )
    })
    if (matchingForbiddenWeek) {
      handleForbiddenWeekDelete(matchingForbiddenWeek.id)
    } else {
      handleForbiddenWeekCreate(info.dateStr)
    }
  }

  const forbiddenWeekList = forbiddenWeeks ?? []
  const templateList = pathwayTemplates ?? []
  const pathwayFilter = (
    <PathwayFilter
      templates={templateList}
      hiddenIds={hiddenPathwayIds}
      onToggle={handleTogglePathwayFilter}
      onReset={handleResetPathwayFilter}
      onHideAll={handleHideAllPathways}
    />
  )
  // En édition de modèle, la grille n'affiche ni semaines interdites ni cycle.
  const calendarModeProps = editMode
    ? {
        forbiddenWeeks: [],
        weekAnchorDate: startDate,
        planningCycle: undefined,
        barre: 'minimale' as const,
      }
    : {
        forbiddenWeeks: forbiddenWeekList,
        weekAnchorDate: undefined,
        planningCycle,
        barre: 'planning' as const,
        filtresBarre: (
          <>
            {pathwayFilter}
            <LocationFilter
              locations={locations ?? []}
              hiddenIds={hiddenLocationIds}
              onToggle={handleToggleLocationFilter}
              onReset={handleResetLocationFilter}
              onHideAll={handleHideAllLocations}
            />
          </>
        ),
      }

  const isSlot = openEventId.startsWith('slot_')
  const isTemplate = openEventId.startsWith('template_')
  const slotId = openEventId.replace(/^.*?_/, '')

  return (
    <DashboardLayout
      components={['pathway']}
      quickActions={[
        <Button
          key="forbidden-week-mode"
          variant="gradient"
          className={`w-full transition duration-200
            ${isForbiddenWeekMode ? 'border border-border-dark' : ''}`}
          onClick={() => {
            if (view !== 'timeline') {
              setView('timeline')
            }
            setIsForbiddenWeekMode((prev) => !prev)
          }}
        >
          Planifier semaines interdites
        </Button>,
      ]}
    >
      <div className="relative flex-1 bg-background rounded-lg flex flex-col w-full">
        <div className="flex items-center gap-4 px-7 pt-[22px] pb-3.5">
          <h1 className="h-9 flex items-center text-text-dark text-xl font-semibold">
            Planning
          </h1>

          <SelectAllShortcut
            events={mergedEvents}
            disabled={view !== 'calendar'}
            onSelectAll={handleSelectAll}
          />
          {!editMode && (
            <>
              <ToggleGroup
                className={SEGMENTS}
                value={view}
                onValueChange={(v: string) => {
                  if (v) {
                    setView(v as 'calendar' | 'timeline')
                    if (v !== 'timeline') {
                      setIsForbiddenWeekMode(false)
                    }
                  }
                }}
              >
                <ToggleGroupItem value="calendar" className={SEGMENT}>
                  <CalendarDays className="h-4 w-4" />
                  Calendrier
                </ToggleGroupItem>
                <ToggleGroupItem value="timeline" className={SEGMENT}>
                  <GanttChart className="h-4 w-4" />
                  Timeline
                </ToggleGroupItem>
              </ToggleGroup>

              <span className="flex-1" />

              <Button
                variant="outline"
                className="h-[38px] rounded-lg px-3.5"
                onClick={() => setExportOpen(true)}
              >
                <Printer size={16} />
                Exporter
              </Button>

              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Plus d'actions"
                    title="Plus d'actions"
                    className="size-[38px] rounded-lg data-[state=open]:bg-muted"
                  >
                    <Ellipsis size={18} />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  {/* Les actions secondaires vont ici ; Exporter reste à part. */}
                  <DropdownMenu.Content
                    className="z-50 w-[310px] rounded-[10px] border border-border bg-primary-foreground p-1 shadow-[0_16px_40px_rgba(4,24,43,.18)]"
                    align="end"
                    sideOffset={6}
                    collisionPadding={8}
                  >
                    <DropdownMenu.Item
                      onSelect={() => setCycleOpen(true)}
                      className={MORE_ITEM}
                    >
                      <Repeat size={16} className="mt-0.5 shrink-0" />
                      <span className="flex flex-col gap-0.5">
                        Configurer le cycle de semaines
                        <span className="text-xs leading-snug text-text-light">
                          S1, S2… au lieu des numéros de l'année
                        </span>
                      </span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={() => setRegenerateOpen(true)}
                      className={MORE_ITEM}
                    >
                      <RefreshCw size={16} className="mt-0.5 shrink-0" />
                      <span className="flex flex-col gap-0.5">
                        Mettre à jour les parcours instanciés
                        <span className="text-xs leading-snug text-text-light">
                          Applique les changements des modèles aux parcours déjà
                          créés
                        </span>
                      </span>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </>
          )}
        </div>

        {selectedSlotIds.size > 0 && (
          <SelectionBar
            count={selectedSlotIds.size}
            onDelete={bulkActions.delete}
            onClear={handleClearSelection}
          >
            <button
              type="button"
              className={BAR_BUTTON}
              onClick={() => handleBulkActionChange('duplicate')}
            >
              <Copy size={16} />
              Dupliquer…
            </button>
            <button
              type="button"
              className={BAR_BUTTON}
              onClick={() => handleBulkActionChange('move')}
            >
              <CalendarArrowUp size={16} />
              Déplacer…
            </button>
            {/* Toute nouvelle action va dans « Plus », les destructrices en dernier sous un séparateur. */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className={`${BAR_BUTTON} data-[state=open]:bg-white/15`}
                >
                  Plus
                  <ChevronUp size={14} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  side="top"
                  align="start"
                  sideOffset={8}
                  collisionPadding={8}
                  className="z-50 w-[260px] rounded-[10px] border border-border bg-primary-foreground p-1 shadow-[0_16px_40px_rgba(4,24,43,.22)]"
                >
                  <DropdownMenu.Item
                    className={MENU_ITEM}
                    onSelect={() => handleBulkActionChange('thematicType')}
                  >
                    <Tags size={16} />
                    Modifier thématique et type
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="mx-1 my-1 h-px bg-border" />
                  <DropdownMenu.Item
                    className={`${MENU_ITEM} text-red-700`}
                    onSelect={() => handleBulkActionChange('delete')}
                  >
                    <Trash2 size={16} />
                    Supprimer la sélection
                    <span className="ml-auto text-xs text-[#94a3b8]">
                      Suppr
                    </span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </SelectionBar>
        )}

        <div className="flex flex-col h-full">
          <div className="flex-1 min-h-0 overflow-hidden">
            {view === 'calendar' ? (
              <Calendar
                events={mergedEvents}
                overlap={false}
                handleSelectEvent={handleSelectSlot}
                handleEditEvent={handleEditSlot}
                handleDropEvent={handleInstantiatePathway}
                handleClickEvent={handleClickSlot}
                handleOpenEvent={setOpenEventId}
                editMode={editMode}
                editable={true}
                onDuplicate={handleDuplicateSlot}
                onDelete={handleDeleteHoverSlot}
                onToggleLock={handleToggleLock}
                selectedSlotIds={selectedSlotIds}
                onToggleSelect={handleToggleSelect}
                onRangeChange={handleRangeChange}
                showSecondaryTags={false}
                {...calendarModeProps}
              />
            ) : (
              <div className="flex h-full flex-col">
                <PlanningTimeline
                  controller={controleurAnnee}
                  filtres={pathwayFilter}
                  isForbiddenWeekMode={isForbiddenWeekMode}
                  weekNumberCalculation={weekNumberCalculation}
                  events={[...pathwayEvents, ...forbiddenWeekBackgroundEvents]}
                  onDateClick={handleTimelineDateClick}
                  onInstantiatePathway={handleInstantiatePathway}
                  onHoverPathway={setHoveredPathway}
                  onPathwayClick={setDeleteTarget}
                />
              </div>
            )}
          </div>
        </div>

        <PathwayTooltip pathway={hoveredPathway} />

        <PathwayDeletePopover
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={(id) => deletePathway.mutate(id)}
        />

        <ConfirmDeleteForm
          open={!!deleteConfirmEventId}
          setOpen={(open) => {
            if (!open) {
              setDeleteConfirmEventId(null)
            }
          }}
          onConfirm={handleConfirmDeleteHoverSlot}
          loading={deleteSlot.isPending || deleteSlotTemplate.isPending}
          title="Supprimer le créneau"
          description="Voulez-vous vraiment supprimer ce créneau ? S'il porte des rendez-vous, il sera conservé plutôt que supprimé."
        />

        <BulkThematicTypeForm
          open={showThematicTypeModal}
          setOpen={(open) => {
            setShowThematicTypeModal(open)
          }}
          soignantIdsPerSlot={selectedTemplates().map(({ template }) =>
            template.soignants.map((soignant) => soignant.id),
          )}
          onConfirm={handleBulkThematicType}
        />

        <ConfirmDeleteForm
          open={showBulkDeleteModal}
          setOpen={(open) => {
            setShowBulkDeleteModal(open)
          }}
          onConfirm={handleBulkDelete}
          title="Supprimer la sélection"
          description={`Voulez-vous vraiment supprimer ${selectedSlotIds.size} créneau(x) ? Ceux qui portent des rendez-vous seront conservés plutôt que supprimés.`}
        />

        <AddSlotForm
          open={openCreateSlotModal}
          setOpen={setOpenCreateSlotModal}
          startDate={selectedDate?.startStr}
          endDate={selectedDate?.endStr}
          color={currentPathwayTemplate?.color}
          handleCreateSlot={handleCreateSlot}
        />

        <EventSheet
          open={isSlot && !editMode}
          setOpen={setOpenEventId}
          eventID={slotId}
          handleDeleteEvent={handleDeleteEvent}
        />

        <EventTemplateSheet
          open={isTemplate && editMode}
          setOpen={setOpenEventId}
          eventTemplateID={slotId}
          handleDeleteEvent={handleDeleteEvent}
        />

        <CreateForbiddenWeekForm
          open={!!createForbiddenWeekDate}
          setOpen={(open) => {
            if (!open) {
              setCreateForbiddenWeekDate(null)
            }
          }}
          date={createForbiddenWeekDate}
          onConfirm={(date) => {
            createForbiddenWeek.mutate(date, {
              onSuccess: () => setCreateForbiddenWeekDate(null),
            })
          }}
          loading={createForbiddenWeek.isPending}
        />

        <DeleteForbiddenWeekForm
          open={!!deleteForbiddenWeekTarget}
          setOpen={(open) => {
            if (!open) {
              setDeleteForbiddenWeekTarget(null)
            }
          }}
          startOfWeek={deleteForbiddenWeekTarget?.startOfWeek ?? null}
          onConfirm={() => {
            if (deleteForbiddenWeekTarget) {
              deleteForbiddenWeek.mutate(deleteForbiddenWeekTarget.id, {
                onSuccess: () => setDeleteForbiddenWeekTarget(null),
              })
            }
          }}
          loading={deleteForbiddenWeek.isPending}
        />

        {editMode ? (
          <BulkWeekForm
            open={weekAction.open}
            setOpen={(open) => !open && closeWeekAction()}
            mode={weekAction.mode}
            count={selectedSlotIds.size}
            editMode
            sourceWeek={templateWeekOf(weekAction.source, startDate)}
            weekCount={templateWeekCount(currentPathwayTemplate?.slotTemplates)}
            onConfirm={(week) =>
              handleBulkTemplateOperation(week, weekAction.mode)
            }
          />
        ) : (
          <BulkWeekForm
            open={weekAction.open}
            setOpen={(open) => !open && closeWeekAction()}
            mode={weekAction.mode}
            count={selectedSlotIds.size}
            sourceWeek={weekAction.source}
            planningCycle={planningCycle}
            forbiddenWeeks={forbiddenWeekList}
            onConfirm={(weekDate) =>
              handleBulkSlotOperation(weekDate, weekAction.mode)
            }
          />
        )}

        <RegeneratePathwaysForm
          open={regenerateOpen}
          setOpen={setRegenerateOpen}
          templates={templateList}
        />

        <PlanningCycleForm
          open={cycleOpen}
          setOpen={setCycleOpen}
          cycle={planningCycle}
          onSave={(cycle) =>
            savePlanningCycle.mutate(cycle, {
              onSuccess: () => setCycleOpen(false),
            })
          }
          onReset={() =>
            resetPlanningCycle.mutate(undefined, {
              onSuccess: () => setCycleOpen(false),
            })
          }
          isPending={
            savePlanningCycle.isPending || resetPlanningCycle.isPending
          }
        />

        {exportOpen && (
          <PlanningExportModal
            initialDate={usePlanningStore.getState().viewStart}
            initialExcludedPathwayIds={hiddenPathwayIds}
            onClose={() => setExportOpen(false)}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

type HoveredPathway = {
  title: string
  start: string
  end: string
  x: number
  y: number
}

type PathwayDeleteTarget = {
  id: string
  title: string
  anchor: { getBoundingClientRect: () => DOMRect }
}

const MORE_ITEM =
  'flex cursor-pointer gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground outline-none select-none data-highlighted:bg-[#f8fafc]'

function PlanningTimeline({
  controller,
  filtres,
  isForbiddenWeekMode,
  weekNumberCalculation,
  events,
  onDateClick,
  onInstantiatePathway,
  onHoverPathway,
  onPathwayClick,
}: {
  controller: CalendarController
  filtres: ReactNode
  isForbiddenWeekMode: boolean
  weekNumberCalculation: 'ISO' | ((date: Date) => number)
  events: EventInput[]
  onDateClick: (info: { dateStr: string }) => void
  onInstantiatePathway: (pathwayTemplateID: string, startDate: string) => void
  onHoverPathway: (pathway: HoveredPathway | null) => void
  onPathwayClick: (target: PathwayDeleteTarget) => void
}) {
  const lastDropTimeRef = useRef<number>(0)
  return (
    <div className="flex h-full flex-col">
      <BarreCalendrier
        controller={controller}
        vues={[
          { type: 'multiMonthYear', libelle: 'Grille' },
          { type: 'dayGridYear', libelle: 'Liste' },
        ]}
        disposition="planning"
        filtres={filtres}
      />
      <FullCalendar
        controller={controller}
        plugins={[
          breezyTheme,
          dayGridPlugin,
          multiMonthPlugin,
          interactionPlugin,
        ]}
        initialView="multiMonthYear"
        locale={frLocale}
        timeZone="UTC"
        weekends={true}
        headerToolbar={false}
        // Pas de cadre autour de la grille, la carte de l'écran l'entoure déjà.
        viewClass="rounded-none border-0"
        // Le thème ne fait que teinter les événements : parcours et semaines interdites
        // gardent leur couleur, pleine.
        backgroundEventClass="bg-[var(--fc-event-color)] opacity-100"
        rowEventClass="bg-[var(--fc-event-color)]"
        rowEventTitleClass="text-[var(--fc-event-contrast-color)] opacity-100"
        // Planifier une semaine interdite : la semaine survolée s'annonce en rouge.
        dayRowClass={
          isForbiddenWeekMode ? 'cursor-pointer hover:bg-red-500/20' : undefined
        }
        singleMonthMinWidth={600}
        weekNumbers={true}
        weekNumberFormat={{ week: 'numeric' }}
        // 0 = semaine interdite, hors cycle : pas de numéro.
        inlineWeekNumberContent={(arg) => (arg.num ? arg.text : '')}
        // FullCalendar transmet ici dateEnv.toDate(marker), pas le
        // marker interne : le Date obtenu porte ses champs dans le
        // fuseau de dateEnv. Le dayjs.utc(date) ci-dessous ne donne
        // le bon résultat que parce que cette instance a
        // timeZone="UTC" — avec 'local' (le défaut FullCalendar),
        // toute la grille annuelle se décalerait d'une semaine en
        // Europe/Paris.
        weekNumberCalculation={weekNumberCalculation}
        dayMaxEvents={false}
        dayMaxEventRows={false}
        height="100%"
        events={events}
        editable={false}
        selectable={false}
        droppable={true}
        dateClick={onDateClick}
        drop={(info) => {
          const now = Date.now()
          if (now - lastDropTimeRef.current < 500) {
            return
          }
          lastDropTimeRef.current = now
          const pathwayId = info.draggedEl.getAttribute('data-pathway-id')
          const weekStart = dayjs.utc(info.date).isoWeekday(1).startOf('day')
          if (pathwayId) {
            onInstantiatePathway(pathwayId, weekStart.toISOString())
          }
        }}
        eventDidMount={(info) => {
          if (info.event.extendedProps.type === 'pathway') {
            info.el.setAttribute('data-pathway-id', info.event.id)
            info.el.style.cursor = 'pointer'
          }
        }}
        eventMouseEnter={(info) => {
          if (
            info.event.extendedProps.type === 'pathway' &&
            info.event.start &&
            info.event.end
          ) {
            const rect = info.el.getBoundingClientRect()
            onHoverPathway({
              title: info.event.title,
              start: dayjs.utc(info.event.start).format('DD/MM/YYYY'),
              end: dayjs
                .utc(info.event.end)
                .subtract(1, 'day')
                .format('DD/MM/YYYY'),
              x: rect.left + rect.width / 2,
              y: rect.top,
            })
            const segments = document.querySelectorAll<HTMLElement>(
              `[data-pathway-id="${info.event.id}"]`,
            )
            segments.forEach((el) => {
              el.style.filter =
                'brightness(1.15) drop-shadow(0 2px 8px rgba(0,0,0,0.25))'
              el.style.zIndex = '10'
              el.style.transition = 'filter 0.15s ease'
            })
          }
        }}
        eventMouseLeave={(info) => {
          onHoverPathway(null)
          const segments = document.querySelectorAll<HTMLElement>(
            `[data-pathway-id="${info.event.id}"]`,
          )
          segments.forEach((el) => {
            el.style.filter = ''
            el.style.zIndex = ''
          })
        }}
        eventClick={(info) => {
          if (isForbiddenWeekMode) {
            return
          }
          if (info.event.id.startsWith('forbidden_')) {
            return
          }
          const x = info.jsEvent.clientX
          const rect = info.el.getBoundingClientRect()
          const y = rect.top + rect.height / 2
          onPathwayClick({
            id: info.event.id,
            title: info.event.title,
            anchor: {
              getBoundingClientRect: () => new DOMRect(x, y, 0, 0),
            },
          })
        }}
      />
    </div>
  )
}

function PathwayTooltip({ pathway }: { pathway: HoveredPathway | null }) {
  if (!pathway) {
    return null
  }
  return (
    <div
      className="pointer-events-none fixed z-[200] max-w-xs rounded-md border border-border bg-popover px-3 py-2 text-xs text-text-dark shadow-md"
      style={{
        left: pathway.x,
        top: pathway.y,
        transform: 'translate(-50%, -100%) translateY(-8px)',
      }}
    >
      <p className="mb-1 font-semibold">{pathway.title}</p>
      <p>
        {pathway.start} – {pathway.end}
      </p>
    </div>
  )
}

function PathwayDeletePopover({
  target,
  onClose,
  onConfirm,
}: {
  target: PathwayDeleteTarget | null
  onClose: () => void
  onConfirm: (id: string) => void
}) {
  return (
    <PopoverRoot
      open={!!target}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      {target && <PopoverAnchor virtualRef={{ current: target.anchor }} />}
      <PopoverContent
        side="top"
        align="center"
        sideOffset={10}
        className="w-56 p-0 shadow-lg"
      >
        <PopoverArrow
          width={14}
          height={7}
          style={{
            fill: 'var(--popover)',
            stroke: 'var(--border)',
            strokeWidth: 1,
          }}
        />

        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-light">
                Supprimer le parcours
              </p>
              <p className="mt-1 text-sm font-medium text-text-dark leading-snug line-clamp-2">
                {target?.title}
              </p>
            </div>
            <PopoverClose className="mt-0.5 shrink-0 rounded p-0.5 text-text-light hover:text-text hover:bg-muted transition-colors cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </PopoverClose>
          </div>
        </div>

        <div className="mx-4 border-t border-border" />

        <div className="flex gap-2 p-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="flex-1 h-8 text-xs gap-1.5"
            onClick={() => {
              if (target) {
                onConfirm(target.id)
                onClose()
              }
            }}
          >
            <Trash2 className="h-3 w-3" />
            Supprimer
          </Button>
        </div>
      </PopoverContent>
    </PopoverRoot>
  )
}
