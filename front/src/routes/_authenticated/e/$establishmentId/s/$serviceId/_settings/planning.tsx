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
  CalendarDays,
  CalendarRange,
  CheckSquare,
  GanttChart,
  Printer,
  RefreshCw,
  Settings2,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BarreCalendrier } from '@/components/custom/Calendar/barreCalendrier.tsx'
import Calendar, {
  type CalendarEvent,
} from '@/components/custom/Calendar/calendar.tsx'
import { CHAMPS_DE_SAISIE } from '@/components/custom/pdf-design/editor/raccourcis.ts'
import LocationFilter, {
  NO_LOCATION_KEY,
} from '@/components/custom/planning/locationFilter.tsx'
import PathwayFilter, {
  NO_PATHWAY_KEY,
} from '@/components/custom/planning/pathwayFilter.tsx'
import PlanningExportModal from '@/components/custom/planning/pdf/planning-export-modal.tsx'
import AddSlotForm from '@/components/custom/popup/addSlotForm.tsx'
import { BulkDuplicateForm } from '@/components/custom/popup/bulkDuplicateForm.tsx'
import { BulkMoveForm } from '@/components/custom/popup/bulkMoveForm.tsx'
import {
  BulkThematicTypeForm,
  type ThematicTypeChanges,
} from '@/components/custom/popup/bulkThematicTypeForm.tsx'
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
import { Select } from '@/components/ui/select.tsx'
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
  const [bulkAction, setBulkAction] = useState('')
  const [duplicateWeekDate, setDuplicateWeekDate] =
    useState<dayjs.Dayjs | null>(null)
  const [duplicateTargetWeek, setDuplicateTargetWeek] = useState(1)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [moveWeekDate, setMoveWeekDate] = useState<dayjs.Dayjs | null>(null)
  const [moveTargetWeek, setMoveTargetWeek] = useState(1)
  const [showMoveModal, setShowMoveModal] = useState(false)
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
    setBulkAction('')
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
    if (action === 'duplicate') {
      setShowDuplicateModal(false)
      setDuplicateWeekDate(null)
    } else {
      setShowMoveModal(false)
      setMoveWeekDate(null)
    }
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
    if (action === 'duplicate') {
      setShowDuplicateModal(false)
      setDuplicateTargetWeek(1)
    } else {
      setShowMoveModal(false)
      setMoveTargetWeek(1)
    }
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

  const openDuplicateModal = () => {
    if (editMode) {
      setDuplicateTargetWeek(1)
    } else {
      setDuplicateWeekDate(mondayOfViewedWeek())
    }
    setShowDuplicateModal(true)
  }

  const openMoveModal = () => {
    if (editMode) {
      setMoveTargetWeek(1)
    } else {
      setMoveWeekDate(mondayOfViewedWeek())
    }
    setShowMoveModal(true)
  }

  const handleBulkActionChange = (v: string) => {
    setBulkAction(v)
    if (v === 'duplicate') {
      openDuplicateModal()
    } else if (v === 'move') {
      openMoveModal()
    } else if (v === 'thematicType') {
      setShowThematicTypeModal(true)
    } else if (v === 'delete') {
      setShowBulkDeleteModal(true)
    }
  }

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
        barre: 'complete' as const,
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
      <div className="relative flex-1 bg-background rounded-lg flex flex-col w-full gap-4">
        <div className="px-6 pt-6 flex items-center justify-between">
          <h1 className="h-9 flex items-center text-text-dark text-xl font-semibold">
            Planning
          </h1>

          <div className="flex justify-end items-center gap-2">
            <SelectAllButton
              events={mergedEvents}
              hidden={view !== 'calendar'}
              selectedIds={selectedSlotIds}
              onSelectAll={handleSelectAll}
              onClear={handleClearSelection}
            />
            {!editMode && (
              <>
                <PathwayFilter
                  templates={templateList}
                  hiddenIds={hiddenPathwayIds}
                  onToggle={handleTogglePathwayFilter}
                  onReset={handleResetPathwayFilter}
                  onHideAll={handleHideAllPathways}
                />

                <LocationFilter
                  locations={locations ?? []}
                  hiddenIds={hiddenLocationIds}
                  onToggle={handleToggleLocationFilter}
                  onReset={handleResetLocationFilter}
                  onHideAll={handleHideAllLocations}
                />

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <Button
                      variant="outline"
                      className="font-normal rounded-lg"
                    >
                      <Settings2 size={16} />
                      Actions
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="min-w-[280px] bg-primary-foreground rounded shadow-md border border-border p-2 z-50"
                      align="end"
                      sideOffset={5}
                      collisionPadding={8}
                    >
                      <DropdownMenu.Item
                        onSelect={() => setRegenerateOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer outline-none hover:bg-primary/20 text-sm select-none"
                      >
                        <RefreshCw size={16} />
                        Mettre à jour les parcours instanciés
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onSelect={() => setExportOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer outline-none hover:bg-primary/20 text-sm select-none"
                      >
                        <Printer size={16} />
                        Exporter le planning (PDF)
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onSelect={() => setCycleOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer outline-none hover:bg-primary/20 text-sm select-none"
                      >
                        <CalendarRange size={16} />
                        Configurer le cycle de semaines
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>

                <ToggleGroup
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
                  <ToggleGroupItem value="calendar">
                    <CalendarDays className="h-4 w-4" />
                    Calendrier
                  </ToggleGroupItem>
                  <ToggleGroupItem value="timeline">
                    <GanttChart className="h-4 w-4" />
                    Timeline
                  </ToggleGroupItem>
                </ToggleGroup>
              </>
            )}
          </div>
        </div>

        {selectedSlotIds.size > 0 && (
          <SelectionBar
            count={selectedSlotIds.size}
            bulkAction={bulkAction}
            onActionChange={handleBulkActionChange}
            onClear={handleClearSelection}
          />
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
            if (!open) {
              setBulkAction('')
            }
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
            if (!open) {
              setBulkAction('')
            }
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
          <>
            <BulkDuplicateForm
              open={showDuplicateModal}
              setOpen={(open) => {
                setShowDuplicateModal(open)
                if (!open) {
                  setBulkAction('')
                  setDuplicateTargetWeek(1)
                }
              }}
              editMode
              count={selectedSlotIds.size}
              targetWeekNumber={duplicateTargetWeek}
              onTargetWeekNumberChange={setDuplicateTargetWeek}
              onConfirm={() =>
                handleBulkTemplateOperation(duplicateTargetWeek, 'duplicate')
              }
            />
            <BulkMoveForm
              open={showMoveModal}
              setOpen={(open) => {
                setShowMoveModal(open)
                if (!open) {
                  setBulkAction('')
                  setMoveTargetWeek(1)
                }
              }}
              editMode
              count={selectedSlotIds.size}
              targetWeekNumber={moveTargetWeek}
              onTargetWeekNumberChange={setMoveTargetWeek}
              onConfirm={() =>
                handleBulkTemplateOperation(moveTargetWeek, 'move')
              }
            />
          </>
        ) : (
          <>
            <BulkDuplicateForm
              open={showDuplicateModal}
              setOpen={(open) => {
                setShowDuplicateModal(open)
                if (!open) {
                  setBulkAction('')
                  setDuplicateWeekDate(null)
                }
              }}
              count={selectedSlotIds.size}
              weekDate={duplicateWeekDate}
              onWeekChange={setDuplicateWeekDate}
              planningCycle={planningCycle}
              forbiddenWeeks={forbiddenWeekList}
              onConfirm={() => {
                if (duplicateWeekDate) {
                  handleBulkSlotOperation(duplicateWeekDate, 'duplicate')
                }
              }}
            />
            <BulkMoveForm
              open={showMoveModal}
              setOpen={(open) => {
                setShowMoveModal(open)
                if (!open) {
                  setBulkAction('')
                  setMoveWeekDate(null)
                }
              }}
              count={selectedSlotIds.size}
              weekDate={moveWeekDate}
              onWeekChange={setMoveWeekDate}
              planningCycle={planningCycle}
              forbiddenWeeks={forbiddenWeekList}
              onConfirm={() => {
                if (moveWeekDate) {
                  handleBulkSlotOperation(moveWeekDate, 'move')
                }
              }}
            />
          </>
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

function SelectAllButton({
  events,
  hidden,
  selectedIds,
  onSelectAll,
  onClear,
}: {
  events: CalendarEvent[]
  hidden: boolean
  selectedIds: Set<string>
  onSelectAll: (ids: string[]) => void
  onClear: () => void
}) {
  const disabled = hidden || events.length === 0
  const selectAll = useCallback(
    () => onSelectAll(events.map((event) => event.id)),
    [events, onSelectAll],
  )

  useEffect(() => {
    if (disabled) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      // Dans un champ ou une modale, Cmd+A garde son sens habituel.
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== 'a' ||
        CHAMPS_DE_SAISIE.includes(target.tagName) ||
        target.isContentEditable ||
        target.closest('[role="dialog"]')
      ) {
        return
      }
      event.preventDefault()
      selectAll()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [disabled, selectAll])

  if (disabled) {
    return null
  }
  const allSelected = events.every((event) => selectedIds.has(event.id))
  return (
    <Button
      variant="outline"
      className="font-normal rounded-lg"
      title="Cmd+A"
      onClick={allSelected ? onClear : selectAll}
    >
      {allSelected ? <Square size={16} /> : <CheckSquare size={16} />}
      {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
    </Button>
  )
}

function SelectionBar({
  count,
  bulkAction,
  onActionChange,
  onClear,
}: {
  count: number
  bulkAction: string
  onActionChange: (action: string) => void
  onClear: () => void
}) {
  return (
    <div className="absolute bottom-6 left-1/2 z-30 flex w-max -translate-x-1/2 items-center gap-3 rounded-lg border border-border-sidebar bg-foreground px-4 py-2 shadow-lg">
      <CheckSquare className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium text-text">
        {count} créneau
        {count > 1 ? 'x' : ''} sélectionné
        {count > 1 ? 's' : ''}
      </span>

      <div className="w-72">
        <Select
          options={[
            { value: 'duplicate', label: 'Dupliquer sur une semaine' },
            { value: 'move', label: 'Déplacer sur une semaine' },
            { value: 'thematicType', label: 'Modifier thématique et type' },
            { value: 'delete', label: 'Supprimer la sélection' },
          ]}
          placeholder="Action..."
          value={bulkAction}
          onValueChange={onActionChange}
          clearable={false}
        />
      </div>

      <Button
        variant="gradient"
        size="sm"
        className="ml-auto"
        onClick={onClear}
      >
        <X className="h-4 w-4" />
        Désélectionner
      </Button>
    </div>
  )
}

function PlanningTimeline({
  controller,
  isForbiddenWeekMode,
  weekNumberCalculation,
  events,
  onDateClick,
  onInstantiatePathway,
  onHoverPathway,
  onPathwayClick,
}: {
  controller: CalendarController
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
