import type { DateSelectInfo } from '@fullcalendar/react'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { MailCheck, UserMinus } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'

import { AppointmentApi } from '../../../../api/appointment.api.ts'
import { APPOINTMENT, SLOT } from '../../../../constants/process.constant.ts'
import { TOAST_SEVERITY } from '../../../../constants/ui.constant.ts'
import { useToast } from '../../../../hooks/useToast.ts'
import { getContrastTextColor } from '../../../../libs/color.ts'
import { buildCalendarEventsFromSlots } from '../../../../libs/utils.ts'
import { useAppointmentMutations } from '../../../../queries/useAppointment.ts'
import { usePathwayTemplateQueries } from '../../../../queries/usePathwayTemplate.ts'
import {
  usePatientSlotsQuery,
  useSlotsInRangeQuery,
} from '../../../../queries/useSlot.ts'
import { usePlanningStore } from '../../../../store/usePlanningStore.ts'
import type { CreateAppointmentParams } from '../../../../types/appointment.ts'
import type { Patient } from '../../../../types/patient.ts'
import type { Slot, SlotDateRange } from '../../../../types/slot.ts'
import type { Soignant } from '../../../../types/soignant.ts'
import { Select } from '../../../ui/select.tsx'
import type { CalendarEvent } from '../../Calendar/calendar.tsx'
import Calendar from '../../Calendar/calendar.tsx'
import {
  BAR_BUTTON,
  SelectAllButton,
  SelectionBar,
} from '../../Calendar/selectionBar.tsx'
import AddAppointmentForm from '../../popup/addAppointmentForm.tsx'
import { ConfirmDeleteForm } from '../../popup/confirmDeleteForm.tsx'
import AppointmentSheet from '../../sheet/appointmentSheet.tsx'

interface PlanningPatientProps {
  patient?: Patient
}

export default function PlanningPatient({ patient }: PlanningPatientProps) {
  const savedDate = usePlanningStore((state) => state.viewStart)

  const { pathwayTemplates } = usePathwayTemplateQueries()
  // Un tag par entree, avec TOUTES les couleurs des modeles qui le portent : ce sont celles que
  // le calendrier donnera aux creneaux du tag choisi.
  const allTags = useMemo(() => {
    const couleursParTag = new Map<string, string[]>()
    for (const template of pathwayTemplates ?? []) {
      const couleurs = couleursParTag.get(template.mainTag) ?? []
      if (template.color && !couleurs.includes(template.color)) {
        couleurs.push(template.color)
      }
      couleursParTag.set(template.mainTag, couleurs)
    }
    return [...couleursParTag]
      .map(([tag, colors]) => ({ tag, colors }))
      .sort((a, b) => a.tag.localeCompare(b.tag))
  }, [pathwayTemplates])

  const [selectedTag, setSelectedTag] = useState('')
  const [visibleRange, setVisibleRange] = useState<SlotDateRange | null>(null)
  const handleRangeChange = useCallback((next: SlotDateRange) => {
    setVisibleRange((prev) =>
      prev && prev.from === next.from && prev.to === next.to ? prev : next,
    )
  }, [])

  // Les rendez-vous du patient, plus les créneaux de la période affichée quand
  // un tag est choisi (pour l'inscrire) : jamais tout l'historique du service.
  const { slots: patientSlots } = usePatientSlotsQuery(patient?.id)
  const { slots: rangeSlots } = useSlotsInRangeQuery(
    selectedTag ? visibleRange : null,
  )
  const slots = useMemo(() => {
    if (!patientSlots) {
      return undefined
    }
    const byId = new Map(patientSlots.map((slot) => [slot.id, slot]))
    for (const slot of selectedTag ? (rangeSlots ?? []) : []) {
      byId.set(slot.id, slot)
    }
    return [...byId.values()]
  }, [patientSlots, rangeSlots, selectedTag])
  const [openCreateAppointmentModal, setOpenCreateAppointmentModal] =
    useState(false)
  const [openAppointmentId, setOpenAppointmentId] = useState('')
  const [selectedSlotID, setSelectedSlotID] = useState('')
  const [selectedSlotStart, setSelectedSlotStart] = useState('')
  const [selectedSlotEnd, setSelectedSlotEnd] = useState('')
  const [selectedSlotSoignants, setSelectedSlotSoignants] = useState<
    Soignant[]
  >([])
  const [selectedSlotType, setSelectedSlotType] = useState('')
  const [selectedSlotMaxDate, setSelectedSlotMaxDate] = useState('')
  const calendarUnselectRef = useRef<(() => void) | null>(null)

  const queryClient = useQueryClient()
  const { createAppointment } = useAppointmentMutations()

  const appointmentEvents: CalendarEvent[] = useMemo(() => {
    if (!slots || !patient) {
      return []
    }

    return slots
      .filter((slot) =>
        slot.appointments?.some((appointment) =>
          appointment.appointmentPatients?.some(
            (ap) => ap.patient.id === patient.id,
          ),
        ),
      )
      .map((slot) => {
        const apt = slot.appointments?.find((a) =>
          a.appointmentPatients?.some((ap) => ap.patient.id === patient.id),
        )
        const thematic =
          apt?.thematic || slot.slotTemplate?.thematic || 'Rendez-vous'
        const color = slot.slotTemplate?.color ?? '#2563eb'
        const soignantsLabel = slot.slotTemplate?.soignants?.length
          ? slot.slotTemplate.soignants.map((s) => s.name).join(', ')
          : ''
        return {
          id: `apt_${apt?.id}`,
          title: soignantsLabel || thematic,
          start: apt?.startDate ?? slot.startDate,
          end: apt?.endDate ?? slot.endDate,
          color,
          contrastColor: getContrastTextColor(color),
          extendedProps: {
            type: 'appointment',
            thematic: soignantsLabel ? thematic : undefined,
          },
        }
      })
  }, [slots, patient])

  const nextAppointmentDate = useMemo(() => {
    if (!slots || !patient) {
      return undefined
    }
    const now = dayjs.utc()
    const nextApt = slots
      .flatMap((s) => s.appointments ?? [])
      .filter(
        (apt) =>
          apt.appointmentPatients?.some((ap) => ap.patient.id === patient.id) &&
          dayjs.utc(apt.startDate).isAfter(now),
      )
      .sort((a, b) => dayjs.utc(a.startDate).diff(dayjs.utc(b.startDate)))[0]
    return nextApt?.startDate
  }, [slots, patient])

  const { availableEvents, enrolledSlotIds, patientAppointmentBySlotId } =
    useMemo(() => {
      if (!slots || !patient) {
        return {
          availableEvents: [] as CalendarEvent[],
          enrolledSlotIds: new Set<string>(),
          patientAppointmentBySlotId: new Map<string, string>(),
        }
      }

      const enrolledSet = new Set<string>()
      const appointmentMap = new Map<string, string>()

      slots.forEach((slot) => {
        const apt = slot.appointments?.find((a) =>
          a.appointmentPatients?.some((ap) => ap.patient.id === patient.id),
        )
        if (apt) {
          enrolledSet.add(slot.id)
          appointmentMap.set(slot.id, apt.id)
        }
      })

      const filteredSlots =
        selectedTag === '__all__'
          ? slots
          : slots.filter(
              (slot) => slot.pathway?.template?.mainTag === selectedTag,
            )

      const baseEvents = buildCalendarEventsFromSlots(filteredSlots, [
        'fillable',
      ])
      const events = baseEvents.map((event) => {
        const slotId = event.id.replace('slot_', '')
        if (enrolledSet.has(slotId)) {
          const color = event.color ?? '#2563eb'
          return {
            ...event,
            backgroundColor: color,
            borderColor: color,
          }
        }
        return event
      })

      return {
        availableEvents: events,
        enrolledSlotIds: enrolledSet,
        patientAppointmentBySlotId: appointmentMap,
      }
    }, [slots, patient, selectedTag])

  const calendarEvents = useMemo(() => {
    if (!selectedTag) {
      return appointmentEvents
    }
    const availableSlotIds = new Set(
      availableEvents.map((e) => e.id.replace('slot_', '')),
    )
    const appointmentsOutsideTag = appointmentEvents.filter((apt) => {
      const aptId = apt.id.replace('apt_', '')
      const slot = slots?.find((s) =>
        s.appointments?.some((a) => a.id === aptId),
      )
      return !slot || !availableSlotIds.has(slot.id)
    })
    return [...availableEvents, ...appointmentsOutsideTag]
  }, [selectedTag, availableEvents, appointmentEvents, slots])

  // Sélection des rendez-vous du patient, hors mode inscription (tag choisi).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmUnenroll, setConfirmUnenroll] = useState(false)
  const [bulkPending, setBulkPending] = useState(false)
  const { toast } = useToast()
  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])
  const toggleSelect = useCallback((eventId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (!next.delete(eventId)) {
        next.add(eventId)
      }
      return next
    })
  }, [])
  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => new Set([...prev, ...ids]))
  }, [])
  const visibleAppointmentEvents = useMemo(
    () =>
      visibleRange
        ? appointmentEvents.filter(
            (event) =>
              event.start >= visibleRange.from && event.start < visibleRange.to,
          )
        : [],
    [appointmentEvents, visibleRange],
  )

  // Chaque rendez-vous sélectionné, avec la ligne du patient et celles des autres.
  const selectedAppointments = () =>
    [...selectedIds].flatMap((eventId) => {
      const appointmentId = eventId.replace('apt_', '')
      const appointment = slots
        ?.flatMap((slot) => slot.appointments ?? [])
        .find((a) => a.id === appointmentId)
      const own = appointment?.appointmentPatients?.find(
        (ap) => ap.patient.id === patient?.id,
      )
      return appointment && own ? [{ appointment, own }] : []
    })

  const runBulk = async (
    action: (
      item: ReturnType<typeof selectedAppointments>[number],
    ) => Promise<unknown>,
    successTitle: string,
  ) => {
    setBulkPending(true)
    const results = await Promise.allSettled(selectedAppointments().map(action))
    setBulkPending(false)
    await queryClient.invalidateQueries({ queryKey: [SLOT.GET_ALL] })
    await queryClient.invalidateQueries({ queryKey: [APPOINTMENT.GET_ALL] })
    const failed = results.filter((r) => r.status === 'rejected').length
    toast(
      failed
        ? {
            title: `${failed} rendez-vous n'ont pas pu être modifiés`,
            severity: TOAST_SEVERITY.ERROR,
          }
        : { title: successTitle, severity: TOAST_SEVERITY.SUCCESS },
    )
    clearSelection()
  }

  const handleConvocationSent = () =>
    runBulk(
      ({ appointment, own }) =>
        AppointmentApi.setConvocationSent({
          appointmentID: appointment.id,
          appointmentPatientID: own.id ?? '',
          convocationSent: true,
        }),
      'Convocations marquées envoyées',
    )

  // Les autres patients restent inscrits ; sans eux, le back supprime le rendez-vous.
  const handleUnenroll = async () => {
    await runBulk(
      ({ appointment, own }) =>
        AppointmentApi.update({
          id: appointment.id,
          appointmentPatients: appointment.appointmentPatients
            .filter((ap) => ap.id !== own.id)
            .map((ap) => ({ id: ap.id, patientID: ap.patient.id })),
        }),
      'Patient désinscrit',
    )
    setConfirmUnenroll(false)
  }

  const handleClickCalendarEvent = (eventId: string) => {
    if (selectedIds.size > 0) {
      if (eventId.startsWith('apt_')) {
        toggleSelect(eventId)
      }
      return
    }
    if (eventId.startsWith('apt_')) {
      handleClickAppointmentEvent(eventId)
    } else {
      handleClickSlot(eventId)
    }
  }

  const handleSelectPatientSlot = (dateSelectArg: DateSelectInfo) => {
    setSelectedSlotStart(dateSelectArg.startStr)
    setSelectedSlotEnd(dateSelectArg.endStr)
    setSelectedSlotType('individual')
  }

  const handleClickAppointmentEvent = (eventId: string) => {
    const appointmentId = eventId.replace('apt_', '')
    const slot = slots?.find((s) =>
      s.appointments?.some((a) => a.id === appointmentId),
    )
    if (slot) {
      setSelectedSlotSoignants(slot.slotTemplate?.soignants ?? [])
      setOpenAppointmentId(appointmentId)
    }
  }

  const handleOpenEvent = (eventId: string) => {
    const appointmentId = eventId.replace('appointment_', '')
    const slot = slots?.find((s) =>
      s.appointments?.some((a) => a.id === appointmentId),
    )
    if (slot) {
      setSelectedSlotSoignants(slot.slotTemplate?.soignants ?? [])
      setOpenAppointmentId(appointmentId)
    }
  }

  const openSlotAppointment = (slot: Slot, appointmentId: string) => {
    setSelectedSlotSoignants(slot.slotTemplate?.soignants ?? [])
    setOpenAppointmentId(appointmentId)
  }

  const openCreateAppointment = (slot: Slot) => {
    const isIndividual = slot.slotTemplate.isIndividual
    setSelectedSlotID(slot.id)
    setSelectedSlotSoignants(slot.slotTemplate?.soignants ?? [])
    setSelectedSlotMaxDate(slot.endDate)
    setSelectedSlotType(isIndividual ? 'individual' : 'multiple')
    if (!isIndividual) {
      setSelectedSlotStart(slot.startDate)
      setSelectedSlotEnd(slot.endDate)
    }
    setOpenCreateAppointmentModal(true)
  }

  const handleClickSlot = (eventId: string) => {
    const slotId = eventId.replace('slot_', '')
    const slot = slots?.find((s) => s.id === slotId)
    if (!slot) {
      return
    }

    const isIndividual = slot.slotTemplate.isIndividual

    // Sur un créneau collectif, le patient inscrit rouvre son rendez-vous.
    // Sur un créneau individuel, ses rendez-vous existants sont déjà
    // cliquables un par un : un clic sur le créneau en crée un nouveau.
    if (!isIndividual && enrolledSlotIds.has(slotId)) {
      const appointmentId = patientAppointmentBySlotId.get(slotId)
      if (appointmentId) {
        openSlotAppointment(slot, appointmentId)
      }
      return
    }
    if (slot.locked) {
      return
    }
    if (!isIndividual && slot.appointments && slot.appointments.length > 0) {
      openSlotAppointment(slot, slot.appointments[0].id)
      return
    }
    openCreateAppointment(slot)
  }

  const handleCreateAppointment = (newAppointment: CreateAppointmentParams) => {
    createAppointment.mutate(newAppointment, {
      onSuccess: async () => {
        setOpenCreateAppointmentModal(false)
        await queryClient.invalidateQueries({ queryKey: [SLOT.GET_ALL] })
      },
    })
  }

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col mt-4">
      <div className="flex-1 min-h-0 overflow-hidden">
        {slots && (
          <Calendar
            key={selectedTag}
            events={calendarEvents}
            editable={false}
            overlap={false}
            initialDate={nextAppointmentDate ?? savedDate}
            handleClickEvent={handleClickCalendarEvent}
            handleOpenEvent={handleOpenEvent}
            handleSelectEvent={
              selectedTag ? handleSelectPatientSlot : undefined
            }
            selectAllow={
              selectedTag
                ? (selectInfo, eventId) => {
                    const selStart = dayjs.utc(selectInfo.start)
                    const selEnd = dayjs.utc(selectInfo.end)
                    return (slots ?? []).some(
                      (slot) =>
                        `slot_${slot.id}` === eventId &&
                        slot.slotTemplate.isIndividual &&
                        !slot.locked &&
                        selStart.isSameOrAfter(dayjs.utc(slot.startDate)) &&
                        selEnd.isSameOrBefore(dayjs.utc(slot.endDate)),
                    )
                  }
                : undefined
            }
            selectedSlotIds={selectedTag ? undefined : selectedIds}
            onToggleSelect={selectedTag ? undefined : toggleSelect}
            unselectRef={calendarUnselectRef}
            onRangeChange={handleRangeChange}
            saveDates={false}
            showSecondaryTags={false}
            barre="navigation"
            classeBarre="px-0"
            filtresBarre={
              <>
                <SelectAllButton
                  events={visibleAppointmentEvents}
                  hidden={!!selectedTag}
                  selectedIds={selectedIds}
                  onSelectAll={selectAll}
                  onClear={clearSelection}
                />
                <div className="w-64">
                  <Select
                    searchable
                    value={selectedTag}
                    onValueChange={(tag) => {
                      clearSelection()
                      setSelectedTag(tag)
                    }}
                    placeholder="Afficher les créneaux par tag"
                    options={[
                      {
                        value: '__all__',
                        label: 'Tout afficher',
                        group: 'all',
                      },
                      ...allTags.map(({ tag, colors }) => ({
                        value: tag,
                        label: tag,
                        color: colors,
                        group: 'tags',
                      })),
                    ]}
                  />
                </div>
              </>
            }
          />
        )}
      </div>

      {selectedIds.size > 0 && (
        <SelectionBar
          count={selectedIds.size}
          onDelete={() => setConfirmUnenroll(true)}
          onClear={clearSelection}
        >
          <button
            type="button"
            className={BAR_BUTTON}
            disabled={bulkPending}
            onClick={handleConvocationSent}
          >
            <MailCheck size={16} />
            Convocation envoyée
          </button>
          <button
            type="button"
            className={BAR_BUTTON}
            onClick={() => setConfirmUnenroll(true)}
          >
            <UserMinus size={16} />
            Désinscrire
          </button>
        </SelectionBar>
      )}

      <ConfirmDeleteForm
        open={confirmUnenroll}
        setOpen={setConfirmUnenroll}
        onConfirm={handleUnenroll}
        loading={bulkPending}
        title="Désinscrire le patient"
        description={`Désinscrire ${patient?.firstName ?? ''} ${patient?.lastName ?? ''} de ${selectedIds.size} rendez-vous ? Les autres patients restent inscrits ; un rendez-vous sans patient est supprimé.`}
        confirmLabel="Désinscrire"
        confirmLoadingLabel="Désinscription..."
      />

      {openCreateAppointmentModal && (
        <AddAppointmentForm
          open={openCreateAppointmentModal}
          setOpen={(open) => {
            if (!open) {
              calendarUnselectRef.current?.()
            }
            setOpenCreateAppointmentModal(open)
          }}
          startDate={selectedSlotStart}
          endDate={selectedSlotEnd}
          maxDate={selectedSlotMaxDate}
          slotID={selectedSlotID}
          soignants={selectedSlotSoignants}
          type={selectedSlotType}
          handleCreateAppointment={handleCreateAppointment}
          defaultPatientIDs={patient ? [patient.id] : []}
        />
      )}

      <AppointmentSheet
        open={!!openAppointmentId}
        setOpen={setOpenAppointmentId}
        eventID={openAppointmentId}
        soignants={selectedSlotSoignants}
      />
    </div>
  )
}
