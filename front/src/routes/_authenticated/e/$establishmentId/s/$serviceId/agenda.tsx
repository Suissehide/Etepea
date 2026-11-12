import { createFileRoute } from '@tanstack/react-router'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { getDayAppointmentColumns } from '@/columns/dayAppointment.column.tsx'
import {
  BarreCalendrier,
  type ControleurBarre,
} from '@/components/custom/Calendar/barreCalendrier.tsx'
import CalendarDatePickerButton from '@/components/custom/Calendar/calendarDatePickerButton.tsx'
import AddAppointmentForm from '@/components/custom/popup/addAppointmentForm.tsx'
import AddPatientForm from '@/components/custom/popup/addPatientForm.tsx'
import AddPatientToAppointmentForm from '@/components/custom/popup/addPatientToAppointmentForm.tsx'
import AddPatientToSlotForm from '@/components/custom/popup/addPatientToSlotForm.tsx'
import { ConfirmDeleteForm } from '@/components/custom/popup/confirmDeleteForm.tsx'
import AppointmentSheet from '@/components/custom/sheet/appointmentSheet.tsx'
import ToggleVerrouilles, {
  useAfficherVerrouilles,
} from '@/components/custom/toggleVerrouilles.tsx'
import WeekDayStrip from '@/components/custom/weekDayStrip.tsx'
import DashboardLayout from '@/components/dashboard.layout.tsx'
import { Etiquette } from '@/components/table/etiquette.tsx'
import ReactTable from '@/components/table/reactTable.tsx'
import { styleSoignant } from '@/libs/color.ts'
import { labelConflicts } from '@/libs/planningConflicts.ts'
import { getFreeIntervals } from '@/libs/slotAvailability.ts'
import {
  buildDaySlotRows,
  type DaySlotRow,
  groupDaySlotRowsBySoignant,
} from '@/libs/utils.ts'
import { useAppointmentMutations } from '@/queries/useAppointment.ts'
import { usePlanningCycleQueries } from '@/queries/usePlanningCycle.ts'
import {
  useSlotConflictsQuery,
  useSlotsInRangeQuery,
} from '@/queries/useSlot.ts'
import { useSoignantQueries } from '@/queries/useSoignant.ts'
import { useSoignantStore } from '@/store/useSoignantStore.ts'
import type { Slot } from '@/types/slot.ts'
import { libelleSemaineDu, plageSemaine } from '@/utils/weekCycle.ts'

export const Route = createFileRoute(
  '/_authenticated/e/$establishmentId/s/$serviceId/agenda',
)({
  // `date` (YYYY-MM-DD) : lien « Voir l'agenda »/« Ouvrir le RDV » du panneau de notifications.
  validateSearch: (search: Record<string, unknown>): { date?: string } => ({
    date: typeof search.date === 'string' ? search.date : undefined,
  }),
  component: Agenda,
})

const SELECTED_DAY_STORAGE_KEY = 'agenda/selected-day'

// Popup « Nouveau rendez-vous » du Planning : sur l'intervalle libre choisi, le
// premier intervalle libre d'un créneau individuel, ou le créneau collectif entier.
const getBookingInterval = (row: DaySlotRow, slot: Slot) => {
  if (row.kind === 'free') {
    return { start: row.startDate, end: row.endDate }
  }
  return row.isIndividual
    ? getFreeIntervals(slot)[0]
    : { start: slot.startDate, end: slot.endDate }
}

const getNewAppointmentProps = (row: DaySlotRow | null, slot?: Slot) => {
  if (!row || !slot || (row.appointmentId && !row.isIndividual)) {
    return null
  }
  const interval = getBookingInterval(row, slot)
  if (!interval) {
    return null
  }
  return {
    slotID: slot.id,
    startDate: interval.start,
    endDate: interval.end,
    maxDate: interval.end,
    soignants: row.soignants,
    type: row.isIndividual ? 'individual' : 'multiple',
  }
}

function Agenda() {
  const { date } = Route.useSearch()
  const [selectedDay, setSelectedDay] = useState(() => {
    const fromSearch = date ? dayjs.utc(date) : null
    if (fromSearch?.isValid()) {
      return fromSearch.startOf('day')
    }
    const stored = localStorage.getItem(SELECTED_DAY_STORAGE_KEY)
    const parsed = stored ? dayjs.utc(stored) : null

    return parsed?.isValid()
      ? parsed.startOf('day')
      : dayjs.utc().startOf('day')
  })
  const [openedRow, setOpenedRow] = useState<DaySlotRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DaySlotRow | null>(null)
  const [addPatientTargetId, setAddPatientTargetId] = useState<string | null>(
    null,
  )

  const handleDayChange = useCallback((day: Dayjs) => {
    setSelectedDay(day)
    localStorage.setItem(SELECTED_DAY_STORAGE_KEY, day.format('YYYY-MM-DD'))
  }, [])

  // Une notification peut changer `date` sur un agenda deja monte : on suit le nouveau parametre.
  useEffect(() => {
    if (!date) {
      return
    }
    const parsed = dayjs.utc(date)
    if (parsed.isValid()) {
      handleDayChange(parsed.startOf('day'))
    }
  }, [date, handleDayChange])

  const today = dayjs.utc().startOf('day')
  const { planningCycle } = usePlanningCycleQueries()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  // La barre des autres calendriers. Les flèches avancent d'une semaine (même jour de la
  // semaine) : la bande des jours, sous la barre, sert à changer de jour.
  const controleur: ControleurBarre = {
    prev: () => handleDayChange(selectedDay.subtract(1, 'week')),
    next: () => handleDayChange(selectedDay.add(1, 'week')),
    today: () => handleDayChange(today),
    view: {
      type: 'timeGridDay',
      title: `${libelleSemaineDu(selectedDay, planningCycle)} · ${plageSemaine(selectedDay)}`,
    },
    getButtonState: () => ({
      prev: { text: '', hint: 'Semaine précédente', isDisabled: false },
      next: { text: '', hint: 'Semaine suivante', isDisabled: false },
      today: {
        text: "Aujourd'hui",
        hint: "Aujourd'hui",
        isDisabled: selectedDay.isSame(today, 'day'),
      },
    }),
  }

  // `to` exclusive : le lendemain, sinon la journée serait amputée.
  const dayRange = useMemo(
    () => ({
      from: selectedDay.utc().format('YYYY-MM-DD'),
      to: selectedDay.utc().add(1, 'day').format('YYYY-MM-DD'),
    }),
    [selectedDay],
  )
  const { slots, isPending, dataUpdatedAt } = useSlotsInRangeQuery(dayRange)
  const conflicts = useSlotConflictsQuery(dayRange, dataUpdatedAt)
  const conflictLabels = useMemo(
    () => labelConflicts(conflicts, slots ?? []),
    [conflicts, slots],
  )
  const { createAppointment, deleteAppointment, updateAppointment } =
    useAppointmentMutations()
  const selectedSoignantIDs = useSoignantStore(
    (state) => state.selectedSoignantIDs,
  )
  const soignants = useSoignantStore((state) => state.soignants)
  const { allSoignants } = useSoignantQueries()
  const soignantIDs = useMemo(() => soignants.map((s) => s.id), [soignants])

  const afficherVerrouilles = useAfficherVerrouilles((state) => state.afficher)
  const rows = useMemo(
    () =>
      buildDaySlotRows(
        slots?.filter(
          (slot) =>
            !slot.slotTemplate?.internal &&
            (afficherVerrouilles || !slot.locked),
        ),
        selectedDay,
      ),
    [slots, selectedDay, afficherVerrouilles],
  )

  const groups = useMemo(
    () =>
      groupDaySlotRowsBySoignant(rows, selectedSoignantIDs, allSoignants ?? []),
    [rows, selectedSoignantIDs, allSoignants],
  )

  const addPatientTarget =
    rows
      .flatMap((row) => [row, ...(row.subRows ?? [])])
      .find((row) => row.id === addPatientTargetId) ?? null
  const addPatientSlot = slots?.find(
    (slot) => slot.id === addPatientTarget?.slotId,
  )
  // Collectif : le « + » ouvre directement ses patients, le rendez-vous se crée à la validation.
  const editPatients =
    !!addPatientTarget &&
    !addPatientTarget.isIndividual &&
    (!!addPatientTarget.appointmentId || addPatientTarget.patients.length === 0)
  const newAppointment = editPatients
    ? null
    : getNewAppointmentProps(addPatientTarget, addPatientSlot)

  const columns = useMemo(
    () =>
      getDayAppointmentColumns({
        onOpen: (row) => setOpenedRow(row),
        onDelete: (row) => setDeleteTarget(row),
        onAddPatient: (row) => setAddPatientTargetId(row.id),
        soignantIDs,
        conflictLabels,
      }),
    [soignantIDs, conflictLabels],
  )

  return (
    <DashboardLayout
      components={['soignant']}
      quickActions={[
        <AddPatientForm key="add-patient" />,
        <AddPatientToSlotForm
          key="add-patient-to-slot"
          onBooked={handleDayChange}
        />,
      ]}
    >
      <div className="flex-1 min-h-0 bg-background p-6 rounded-lg flex flex-col w-full gap-4">
        <BarreCalendrier
          controller={controleur}
          onChoisirDate={setAnchorEl}
          className="px-0 pb-0 flex-wrap"
          filtres={<ToggleVerrouilles />}
        />
        <div className="-mx-6 border-y border-border bg-surface-douce px-6 py-2.5">
          <WeekDayStrip value={selectedDay} onChange={handleDayChange} />
        </div>
        <CalendarDatePickerButton
          anchorEl={anchorEl}
          setAnchorEl={setAnchorEl}
          value={anchorEl ? selectedDay : undefined}
          cycle={planningCycle}
          semainesInterdites={planningCycle?.forbiddenWeekStarts ?? []}
          onChange={(date) => {
            if (date) {
              handleDayChange(dayjs.utc(date.format('YYYY-MM-DD')))
            }
            setAnchorEl(null)
          }}
        />

        <h2 className="text-base font-semibold text-text-dark first-letter:uppercase">
          {selectedDay.format('dddd D MMMM')}
        </h2>

        {isPending || groups.length === 0 ? (
          <ReactTable<DaySlotRow>
            data={[]}
            columns={columns}
            filterId="day-appointment"
            isLoading={isPending}
            fixedLayout
            emptyState="Aucun créneau ce jour-là"
          />
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-6">
            {groups.map(({ soignant, rows: soignantRows }) => (
              <section
                key={soignant?.id ?? 'sans-soignant'}
                className="shrink-0 flex flex-col gap-2"
              >
                <h2>
                  {soignant ? (
                    <Etiquette style={styleSoignant(soignant.id, soignantIDs)}>
                      {soignant.name}
                    </Etiquette>
                  ) : (
                    <Etiquette ton="neutre">Sans soignant</Etiquette>
                  )}
                </h2>
                <ReactTable<DaySlotRow>
                  data={soignantRows}
                  columns={columns}
                  getSubRows={(row) => row.subRows}
                  filterId="day-appointment"
                  onRowClick={(row) => row.appointmentId && setOpenedRow(row)}
                  autoRowHeight
                  fixedLayout
                />
              </section>
            ))}
          </div>
        )}

        <AppointmentSheet
          open={!!openedRow?.appointmentId}
          setOpen={() => setOpenedRow(null)}
          eventID={openedRow?.appointmentId ?? ''}
          soignants={openedRow?.soignants}
        />

        {editPatients && addPatientTarget && (
          <AddPatientToAppointmentForm
            open
            setOpen={(open) => {
              if (!open) {
                setAddPatientTargetId(null)
              }
            }}
            row={addPatientTarget}
            isPending={
              updateAppointment.isPending || createAppointment.isPending
            }
            onConfirm={(params) => {
              if (addPatientTarget.appointmentId) {
                updateAppointment.mutate(params)
              } else if (addPatientSlot) {
                createAppointment.mutate({
                  startDate: addPatientSlot.startDate,
                  endDate: addPatientSlot.endDate,
                  slotID: addPatientSlot.id,
                  thematicId: '',
                  patientIDs: params.appointmentPatients.map(
                    (p) => p.patientID,
                  ),
                })
              }
              setAddPatientTargetId(null)
            }}
            onRequestDelete={() => {
              if (addPatientTarget.appointmentId) {
                setDeleteTarget(addPatientTarget)
              }
              setAddPatientTargetId(null)
            }}
          />
        )}

        {newAppointment && (
          <AddAppointmentForm
            open
            setOpen={(open) => {
              if (!open) {
                setAddPatientTargetId(null)
              }
            }}
            {...newAppointment}
            handleCreateAppointment={(params) => {
              createAppointment.mutate(params)
              setAddPatientTargetId(null)
            }}
            isPending={createAppointment.isPending}
          />
        )}

        <ConfirmDeleteForm
          open={!!deleteTarget}
          setOpen={(open) => {
            if (!open) {
              setDeleteTarget(null)
            }
          }}
          onConfirm={() => {
            if (deleteTarget?.appointmentId) {
              deleteAppointment.mutate(deleteTarget.appointmentId)
            }
            setDeleteTarget(null)
          }}
          loading={deleteAppointment.isPending}
          title="Supprimer le rendez-vous"
          description="Voulez-vous vraiment supprimer ce rendez-vous ? Cette action est irréversible."
        />
      </div>
    </DashboardLayout>
  )
}
