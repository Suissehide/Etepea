import type { DateSelectInfo } from '@fullcalendar/react'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import dayjs from 'dayjs'
import {
  CalendarRange,
  DoorOpen,
  Printer,
  Route as RouteIcon,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Calendar, {
  type CalendarEvent,
} from '@/components/custom/Calendar/calendar.tsx'
import { NO_PATHWAY_KEY } from '@/components/custom/planning/pathwayFilter.tsx'
import PlanningExportModal, {
  NO_SOIGNANT_KEY,
} from '@/components/custom/planning/pdf/planning-export-modal.tsx'
import AddAppointmentForm from '@/components/custom/popup/addAppointmentForm.tsx'
import AddPatientForm from '@/components/custom/popup/addPatientForm.tsx'
import AddPatientToSlotForm from '@/components/custom/popup/addPatientToSlotForm.tsx'
import AppointmentSheet from '@/components/custom/sheet/appointmentSheet.tsx'
import ToggleVerrouilles, {
  useAfficherVerrouilles,
} from '@/components/custom/toggleVerrouilles.tsx'
import DashboardLayout from '@/components/dashboard.layout.tsx'
import { Button } from '@/components/ui/button.tsx'
import { SLOT } from '@/constants/process.constant.ts'
import { useCan } from '@/hooks/useCan.ts'
import { labelConflicts } from '@/libs/planningConflicts.ts'
import {
  type FreeInterval,
  getFreeTranches,
  isSlotVisible,
} from '@/libs/slotAvailability.ts'
import { buildCalendarEventsFromSlots, containsKeyword } from '@/libs/utils.ts'
import { useAppointmentMutations } from '@/queries/useAppointment.ts'
import { useLocationQueries } from '@/queries/useLocation.ts'
import { usePathwayTemplateQueries } from '@/queries/usePathwayTemplate.ts'
import { usePlanningCycleQueries } from '@/queries/usePlanningCycle.ts'
import {
  useSlotConflictsQuery,
  useSlotsInRangeQuery,
} from '@/queries/useSlot.ts'
import { useThematicQueries } from '@/queries/useThematic.ts'
import { useAuthStore } from '@/store/useAuthStore.ts'
import { useDashboardFilterStore } from '@/store/useDashboardFilterStore.ts'
import { usePlanningStore } from '@/store/usePlanningStore.ts'
import { useSoignantStore } from '@/store/useSoignantStore.ts'
import type { CreateAppointmentParams } from '@/types/appointment.ts'
import type { Slot, SlotDateRange } from '@/types/slot.ts'
import type { Soignant } from '@/types/soignant.ts'

export const Route = createFileRoute(
  '/_authenticated/e/$establishmentId/s/$serviceId/dashboard',
)({
  component: Dashboard,
})

/** Au-delà, les noms sont résumés pour ne pas déborder sur le calendrier. */
const MAX_TITLE_LABELS = 3

function formatTitleLabels(labels: string[]) {
  if (labels.length <= MAX_TITLE_LABELS) {
    return labels.join(', ')
  }
  const shown = labels.slice(0, MAX_TITLE_LABELS).join(', ')
  return `${shown} +${labels.length - MAX_TITLE_LABELS}`
}

function filterSlotsBySoignants(slots: Slot[], soignantIDs: string[]) {
  if (soignantIDs.length === 0) {
    return []
  }
  return slots.filter((slot) =>
    slot.slotTemplate?.soignants?.some((s) => soignantIDs.includes(s.id)),
  )
}

function filterSlotsByPathwayTemplates(slots: Slot[], templateIDs: string[]) {
  if (templateIDs.length === 0) {
    return []
  }
  return slots.filter((slot) => {
    const templateID =
      slot.pathway?.template?.id ?? slot.pathway?.pathwayTemplateID
    return !!templateID && templateIDs.includes(templateID)
  })
}

function filterSlotsByLocations(slots: Slot[], locationIDs: string[]) {
  return slots.filter((slot) => {
    const locationID =
      slot.slotTemplate?.location?.id ?? slot.slotTemplate?.locationID
    return !!locationID && locationIDs.includes(locationID)
  })
}

const VIEW_STORAGE_KEY = 'dashboard/view'
const DASHBOARD_VIEWS = ['timeGridWeek', 'timeGridDay', 'listWeek']

function Dashboard() {
  const [initialView] = useState(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY)
    return stored && DASHBOARD_VIEWS.includes(stored) ? stored : 'timeGridWeek'
  })

  const queryClient = useQueryClient()
  const [openEventId, setOpenEventId] = useState('')
  const selectedIDs = useSoignantStore((state) => state.selectedSoignantIDs)
  const soignants = useSoignantStore((state) => state.soignants)
  const unselectSoignant = useSoignantStore((state) => state.unselectSoignant)
  const savedDate = usePlanningStore((state) => state.viewStart)
  const selectedSoignants = soignants.filter((s) => selectedIDs.includes(s.id))
  const toggleSoignant = useSoignantStore((state) => state.toggleSoignant)
  const { establishmentId, serviceId } = Route.useParams()
  const mySoignantId = useAuthStore(
    (state) =>
      state.user?.establishments
        .find((e) => e.id === establishmentId)
        ?.services.find((s) => s.id === serviceId)?.soignantId ?? null,
  )
  // MDS-37 : sans sélection, on ouvre sur le soignant du compte connecté — une fois par visite,
  // pour qu'effacer la sélection reste possible.
  const preselected = useRef(false)
  useEffect(() => {
    if (preselected.current || !mySoignantId) {
      return
    }
    preselected.current = true
    if (selectedIDs.length === 0) {
      toggleSoignant(mySoignantId)
    }
  }, [mySoignantId, selectedIDs.length, toggleSoignant])

  const mode = useDashboardFilterStore((state) => state.mode)
  const selectedPathwayTemplateIDs = useDashboardFilterStore(
    (state) => state.selectedPathwayTemplateIDs,
  )
  const unselectPathwayTemplates = useDashboardFilterStore(
    (state) => state.unselectPathwayTemplates,
  )
  const { pathwayTemplates } = usePathwayTemplateQueries()
  const selectedPathwayTemplates = (pathwayTemplates ?? []).filter((t) =>
    selectedPathwayTemplateIDs.includes(t.id),
  )
  const selectedLocationIDs = useDashboardFilterStore(
    (state) => state.selectedLocationIDs,
  )
  const unselectLocations = useDashboardFilterStore(
    (state) => state.unselectLocations,
  )
  const { locations } = useLocationQueries()
  const selectedLocations = (locations ?? []).filter((l) =>
    selectedLocationIDs.includes(l.id),
  )

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
  const { planningCycle } = usePlanningCycleQueries()
  const { thematics } = useThematicQueries()
  const { createAppointment } = useAppointmentMutations()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState({ startStr: '', endStr: '' })
  const [openCreateAppointmentModal, setOpenCreateAppointmentModal] =
    useState(false)
  const [selectedEvent, setSelectedEvent] = useState('')
  const [maxDate, setMaxDate] = useState('')
  const [type, setType] = useState('')
  const [slotSoignants, setSlotSoignants] = useState<Soignant[]>([])
  const calendarUnselectRef = useRef<(() => void) | null>(null)
  const afficherVerrouilles = useAfficherVerrouilles((state) => state.afficher)
  const [exportOpen, setExportOpen] = useState(false)
  const canExportPdf = useCan('pdf:export')
  // MDS-72 : sous Coordinateur, le Dashboard ne sert qu'à consulter.
  const peutAjouter = useAuthStore(
    (state) => state.context?.serviceRole === 'COORDINATEUR',
  )

  // L'export part de ce que montre le tableau de bord : la sélection de soignants
  // ou de parcours devient le filtre de départ (pas d'équivalent pour les salles).
  const exportExclusions = () => {
    if (mode === 'soignant' && selectedIDs.length > 0) {
      return {
        initialExcludedSoignantIds: new Set([
          NO_SOIGNANT_KEY,
          ...soignants
            .filter((s) => !selectedIDs.includes(s.id))
            .map((s) => s.id),
        ]),
      }
    }
    if (mode === 'pathway' && selectedPathwayTemplateIDs.length > 0) {
      return {
        initialExcludedPathwayIds: new Set([
          NO_PATHWAY_KEY,
          ...(pathwayTemplates ?? [])
            .filter((t) => !selectedPathwayTemplateIDs.includes(t.id))
            .map((t) => t.id),
        ]),
      }
    }
    return {}
  }

  useEffect(() => {
    if (slots) {
      // Un créneau supprimé ne reste affiché que s'il porte encore des inscriptions.
      const visible = slots.filter(
        (slot) =>
          isSlotVisible(slot) &&
          !slot.slotTemplate?.internal &&
          (afficherVerrouilles || !slot.locked),
      )
      const filtered = {
        soignant: () => filterSlotsBySoignants(visible, selectedIDs),
        pathway: () =>
          filterSlotsByPathwayTemplates(visible, selectedPathwayTemplateIDs),
        location: () => filterSlotsByLocations(visible, selectedLocationIDs),
      }[mode]()

      // Individuel : pré-découpé en tranches libres de la durée de sa thématique.
      const durations = new Map(thematics?.map((t) => [t.id, t.duration]))
      const slotEvents = buildCalendarEventsFromSlots(
        filtered,
        ['fillable'],
        conflictLabels,
      ).map((event, i) => {
        const template = filtered[i].slotTemplate
        const duration =
          template?.isIndividual && durations.get(template.thematicId ?? '')
        return duration
          ? {
              ...event,
              extendedProps: {
                ...event.extendedProps,
                tranches: getFreeTranches(filtered[i], duration),
              },
            }
          : event
      })

      setEvents(
        [...slotEvents].sort(
          (a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf(),
        ),
      )
    }
  }, [
    slots,
    selectedIDs,
    mode,
    selectedPathwayTemplateIDs,
    selectedLocationIDs,
    conflictLabels,
    afficherVerrouilles,
    thematics,
  ])

  const handleSelectAppointment = (dateSelectArg: DateSelectInfo) => {
    setSelectedDate({
      startStr: dateSelectArg.startStr,
      endStr: dateSelectArg.endStr,
    })
    setType('individual')
  }

  const handleAddAppointment = (eventID: string, range?: FreeInterval) => {
    const slotId = eventID.replace(/^.*?_/, '')
    setSelectedEvent(slotId)
    const event = getEventById(eventID)
    if (!event || eventID.startsWith('appointment_')) {
      return
    }
    if (
      containsKeyword(event.extendedProps?.states ?? [], ['multiple']) &&
      event.extendedProps?.appointments?.length
    ) {
      handleOpenEvent(`appointment_${event.extendedProps.appointments[0].id}`)
      return
    }
    if (
      !peutAjouter ||
      event.extendedProps?.locked ||
      event.extendedProps?.archived
    ) {
      return
    }

    const slot = slots?.find((s) => s.id === slotId)
    setSlotSoignants(slot?.slotTemplate?.soignants ?? [])

    setType('multiple')
    setMaxDate(event?.end ?? '')
    setSelectedDate({
      startStr: range?.start ?? event?.start ?? '',
      endStr: range?.end ?? event?.end ?? '',
    })
    setOpenCreateAppointmentModal(true)
  }

  const handleCreateAppointment = (newAppointment: CreateAppointmentParams) => {
    createAppointment.mutate(newAppointment, {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: [SLOT.GET_ALL] })
      },
    })
    setOpenCreateAppointmentModal(false)
  }

  const getEventById = (id: string) => {
    return events.find((event) => event.id === id)
  }

  const handleOpenEvent = (eventId: string) => {
    if (eventId.startsWith('appointment_')) {
      const aptId = eventId.replace(/^.*?_/, '')
      const slot = slots?.find((s) =>
        s.appointments?.some((a) => a.id === aptId),
      )
      setSlotSoignants(slot?.slotTemplate?.soignants ?? [])
    }
    setOpenEventId(eventId)
  }

  const isAppointment = openEventId.startsWith('appointment_')
  const appointmentId = openEventId.replace(/^.*?_/, '')

  const {
    labels: selectedLabels,
    emptyLabel,
    clearSelection,
    Icon,
  } = {
    soignant: {
      labels: selectedSoignants.map((s) => s.name),
      emptyLabel: 'Sélectionnez un soignant',
      clearSelection: unselectSoignant,
      Icon: CalendarRange,
    },
    pathway: {
      labels: selectedPathwayTemplates.map((t) => t.name),
      emptyLabel: 'Sélectionnez un parcours',
      clearSelection: unselectPathwayTemplates,
      Icon: RouteIcon,
    },
    location: {
      labels: selectedLocations.map((l) => l.name),
      emptyLabel: 'Sélectionnez une salle',
      clearSelection: unselectLocations,
      Icon: DoorOpen,
    },
  }[mode]

  return (
    <DashboardLayout
      components={['dashboardFilter']}
      quickActions={[
        <AddPatientForm key="add-patient" />,
        <AddPatientToSlotForm key="add-patient-to-slot" />,
      ]}
    >
      <div className="flex-1 bg-background rounded-lg flex flex-col w-full gap-4">
        <div className="flex flex-col h-full">
          <div className="px-6 mt-6 mb-4 min-h-9 flex gap-2 items-center">
            <div className="flex items-center justify-center bg-foreground p-2 rounded-full">
              <Icon className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-text-dark text-xl font-semibold">
              {selectedLabels.length > 0
                ? formatTitleLabels(selectedLabels)
                : emptyLabel}
            </h1>
            {selectedLabels.length > 0 && (
              <button
                type="button"
                onClick={() => clearSelection()}
                aria-label="Effacer la sélection"
                className="cursor-pointer text-text-dark/60 hover:text-text-dark transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <span className="flex-1" />
            {canExportPdf && (
              <Button
                variant="outline"
                className="h-[38px] rounded-lg px-3.5"
                onClick={() => setExportOpen(true)}
              >
                <Printer size={16} />
                Exporter
              </Button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <Calendar
              events={events}
              editable={false}
              overlap={false}
              showSecondaryTags={false}
              effectifSeul
              ajoutPossible={peutAjouter}
              initialDate={savedDate}
              initialView={initialView}
              planningCycle={planningCycle}
              classeBarre="px-6"
              filtresBarre={<ToggleVerrouilles />}
              onViewChange={(view) =>
                localStorage.setItem(VIEW_STORAGE_KEY, view)
              }
              onRangeChange={handleRangeChange}
              handleSelectEvent={
                peutAjouter ? handleSelectAppointment : undefined
              }
              handleClickEvent={handleAddAppointment}
              handleOpenEvent={handleOpenEvent}
              selectAllow={(selectInfo, eventId) => {
                const { start, end } = selectInfo
                const selectionStart = dayjs(start)
                const selectionEnd = dayjs(end)

                // Only allow selection within individual slots that are not locked
                const individualSlots = events.filter(
                  (e) =>
                    e.id === eventId &&
                    e.extendedProps?.type === 'slot' &&
                    !e.extendedProps?.locked &&
                    !e.extendedProps?.archived &&
                    containsKeyword(e.extendedProps?.states ?? [], [
                      'individual',
                    ]),
                )

                return individualSlots.some((slot) => {
                  const slotStart = dayjs(slot.start)
                  const slotEnd = dayjs(slot.end)

                  // Check if selection is within slot bounds
                  const isWithinSlot =
                    selectionStart.isSameOrAfter(slotStart) &&
                    selectionEnd.isSameOrBefore(slotEnd)

                  if (!isWithinSlot) {
                    return false
                  }

                  // Check if selection overlaps with existing appointments
                  const appointments = slot.extendedProps?.appointments ?? []
                  const overlapsAppointment = appointments.some(
                    (apt: { startDate: string; endDate: string }) => {
                      const aptStart = dayjs(apt.startDate)
                      const aptEnd = dayjs(apt.endDate)
                      return (
                        selectionStart.isBefore(aptEnd) &&
                        selectionEnd.isAfter(aptStart)
                      )
                    },
                  )

                  return !overlapsAppointment
                })
              }}
              unselectRef={calendarUnselectRef}
            />
          </div>
        </div>

        {openCreateAppointmentModal && (
          <AddAppointmentForm
            open={openCreateAppointmentModal}
            setOpen={(open) => {
              if (!open) {
                calendarUnselectRef.current?.()
              }
              setOpenCreateAppointmentModal(open)
            }}
            startDate={selectedDate.startStr}
            endDate={selectedDate.endStr}
            maxDate={maxDate}
            soignants={slotSoignants}
            slotID={selectedEvent}
            type={type}
            handleCreateAppointment={handleCreateAppointment}
            isPending={createAppointment.isPending}
          />
        )}

        <AppointmentSheet
          open={isAppointment}
          setOpen={setOpenEventId}
          eventID={isAppointment ? appointmentId : ''}
          soignants={slotSoignants}
        />

        {exportOpen && (
          <PlanningExportModal
            initialDate={visibleRange?.from ?? savedDate}
            {...exportExclusions()}
            onClose={() => setExportOpen(false)}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
