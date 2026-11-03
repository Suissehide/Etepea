import { useStore } from '@tanstack/react-form'
import dayjs from 'dayjs'
import { Check, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { APPOINTMENT_TYPE_OPTIONS } from '../../../constants/appointment.constant.ts'
import { useAppForm } from '../../../hooks/formConfig.tsx'
import {
  appointmentRange,
  getTrancheChoice,
  isRangeFree,
  MIN_APPOINTMENT_MINUTES,
} from '../../../libs/slotAvailability.ts'
import {
  generateDurationOptions,
  thematicLabel,
  thematicLabelByID,
} from '../../../libs/utils.ts'
import { usePatientQueries } from '../../../queries/usePatient.tsx'
import { useSlotByIDQuery, useSlotMutations } from '../../../queries/useSlot.ts'
import { useThematicQueries } from '../../../queries/useThematic.ts'
import type { CreateAppointmentParams } from '../../../types/appointment.ts'
import type { Slot } from '../../../types/slot.ts'
import type { Soignant } from '../../../types/soignant.ts'
import type { Thematic } from '../../../types/thematic.ts'
import { Button } from '../../ui/button.tsx'
import { FieldInfo } from '../../ui/fieldInfo.tsx'
import { FormField } from '../../ui/formField.tsx'
import { Input } from '../../ui/input.tsx'
import { Label } from '../../ui/label.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../../ui/popup.tsx'
import { Select, type SelectOption } from '../../ui/select.tsx'
import { AppointmentTimeFields } from '../appointmentDetailsFields.tsx'

interface AddAppointmentFormProps {
  open: boolean
  setOpen: (open: boolean) => void
  startDate: string
  endDate: string
  maxDate: string
  slotID: string
  soignants?: Soignant[]
  type: string
  handleCreateAppointment: (newAppointment: CreateAppointmentParams) => void
  isPending?: boolean
  defaultPatientIDs?: string[]
}

function AddAppointmentForm({
  open,
  setOpen,
  startDate,
  endDate,
  maxDate,
  slotID,
  soignants = [],
  type,
  handleCreateAppointment,
  isPending = false,
  defaultPatientIDs,
}: AddAppointmentFormProps) {
  // Figé : TanStack Form compare defaultValues à chaque rendu, un « maintenant » recalculé boucle.
  const [today] = useState(() => dayjs.utc())
  const { thematics } = useThematicQueries()
  const { patients } = usePatientQueries()
  const { slot } = useSlotByIDQuery(slotID)
  const { updateSlot } = useSlotMutations()
  // Thématique et type appartiennent au créneau : undefined tant qu'on n'y touche pas.
  const [slotThematicId, setSlotThematicId] = useState<string>()
  const [slotType, setSlotType] = useState<string>()
  const thematicId = slotThematicId ?? slot?.slotTemplate?.thematicId ?? ''
  const slotTypeValue = slotType ?? slot?.slotTemplate?.type ?? ''
  const patientOptions =
    patients
      ?.map((patient) => ({
        value: patient.id,
        label: `${patient.lastName} ${patient.firstName}`,
        sortKey: `${patient.lastName} ${patient.firstName}`,
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey, 'fr'))
      .map(({ value, label }) => ({ value, label })) ?? []

  const form = useAppForm({
    defaultValues: {
      startTime: startDate ? dayjs.utc(startDate) : today,
      duration:
        startDate && endDate
          ? dayjs.utc(endDate).diff(dayjs.utc(startDate), 'minute').toString()
          : '',
      thematicId: '',
      patientIDs: (defaultPatientIDs ?? []) as string[],
    },
    onSubmit: ({ value }) => {
      if (slot && (slotThematicId !== undefined || slotType !== undefined)) {
        updateSlot.mutate({
          id: slot.id,
          slotTemplate: {
            id: slot.slotTemplate.id,
            thematicId: thematicId || null,
            type: slotTypeValue || null,
          },
        })
      }
      const newAppointment: CreateAppointmentParams = {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        slotID,
        thematicId: value.thematicId,
        patientIDs: value.patientIDs,
      }
      handleCreateAppointment(newAppointment)
    },
  })

  useEffect(() => {
    if (open) {
      form.reset()
    }
  }, [open, form])

  const thematicOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>()
    for (const soignant of soignants) {
      for (const t of thematics?.filter((t) =>
        t.soignants.some((ss) => ss.id === soignant.id),
      ) ?? []) {
        map.set(t.id, { value: t.id, label: thematicLabel(t) })
      }
    }
    return [...map.values()].sort((a, b) =>
      a.label.localeCompare(b.label, 'fr'),
    )
  }, [soignants, thematics])

  const capacity = slot?.slotTemplate.capacity ?? 1

  // Individuel : débuts calés sur des tranches de la durée de la sous-thématique (à défaut, de la thématique).
  const subThematicID = useStore(form.store, (state) => state.values.thematicId)
  const startTime = useStore(form.store, (state) => state.values.startTime)
  const { tranche } = getTrancheChoice(
    slot,
    [
      thematics?.find((t) => t.id === subThematicID)?.duration,
      thematics?.find((t) => t.id === thematicId)?.duration,
    ],
    startTime,
  )
  // La tranche libre n'est qu'une proposition : dès qu'on touche à l'heure ou à la durée, on garde la saisie.
  const [manual, setManual] = useState(false)
  const duration = useStore(form.store, (state) => state.values.duration)
  const proposed = manual ? undefined : tranche
  const { start, end } = appointmentRange(proposed, startTime, duration)
  const minutes = end.diff(start, 'minute')
  const takeOver = () => {
    if (proposed) {
      form.setFieldValue('startTime', start)
      form.setFieldValue('duration', String(minutes))
    }
    setManual(true)
  }
  // Sur tout le créneau : une plage qui déborde est refusée à l'envoi, pas rendue impossible à saisir.
  const durationOptions = generateDurationOptions(
    slot?.startDate ?? startDate,
    slot?.endDate ?? maxDate,
  )

  return (
    <Popup modal={true} open={open} onOpenChange={setOpen}>
      <PopupContent>
        <PopupHeader>
          <PopupTitle>Nouveau rendez-vous</PopupTitle>
        </PopupHeader>

        <PopupBody>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await form.validate('submit')
              await form.handleSubmit()
            }}
            className="flex flex-col gap-2 max-w-md"
          >
            <form.Field
              name="startTime"
              validators={{
                onSubmit: () =>
                  slot?.slotTemplate?.isIndividual &&
                  !isRangeFree(slot, start, end)
                    ? 'Plage non disponible'
                    : undefined,
              }}
            >
              {(startTimeField) => (
                <form.Field name="duration">
                  {(durationField) => (
                    <AppointmentTimeFields
                      date={startDate}
                      startTime={start}
                      onStartTimeChange={(time) => {
                        takeOver()
                        startTimeField.handleChange(time)
                      }}
                      duration={String(minutes)}
                      onDurationChange={(value) => {
                        takeOver()
                        durationField.handleChange(value)
                      }}
                      durationOptions={durationOptions}
                      minTime={slot && dayjs.utc(slot.startDate)}
                      maxTime={
                        slot &&
                        dayjs
                          .utc(slot.endDate)
                          .subtract(MIN_APPOINTMENT_MINUTES, 'minute')
                      }
                      disabled={type === 'multiple'}
                      durationFieldId={durationField.name}
                      startTimeInfo={<FieldInfo field={startTimeField} />}
                      durationInfo={<FieldInfo field={durationField} />}
                    />
                  )}
                </form.Field>
              )}
            </form.Field>

            {type === 'multiple' && (
              <div className="text-sm text-text-light mb-0">
                Capacité maximale de ce créneau :{' '}
                <span className="text-text-darkComm">{capacity}</span>
              </div>
            )}

            <FormField>
              <Label>Soignants</Label>
              <Input
                value={
                  soignants.length > 0
                    ? soignants.map((s) => s.name).join(', ')
                    : 'Aucun soignant associé'
                }
                disabled
              />
            </FormField>

            <SlotThematicTypeFields
              slot={slot}
              thematics={thematics ?? []}
              thematicOptions={thematicOptions}
              thematicId={thematicId}
              type={slotTypeValue}
              onThematicChange={setSlotThematicId}
              onTypeChange={setSlotType}
            />

            <FormField>
              <Label>Salle</Label>
              <Input
                value={
                  slot?.slotTemplate?.location?.name ?? 'Aucune salle associée'
                }
                disabled
              />
            </FormField>

            <form.AppField name="thematicId">
              {(field) => (
                <field.Select
                  options={thematicOptions}
                  label="Sous-thématique"
                  disabled={thematicOptions.length === 0}
                  placeholder={
                    thematicOptions.length === 0
                      ? 'Aucune sous-thématique associée'
                      : ''
                  }
                />
              )}
            </form.AppField>

            <form.AppField
              name="patientIDs"
              validators={{
                onSubmit: ({ value }) => {
                  if (!value.length) {
                    return 'Au moins un patient est requis'
                  }
                  if (type === 'multiple' && value.length > capacity) {
                    return `Maximum ${capacity} patient${capacity > 1 ? 's' : ''} pour ce créneau`
                  }
                  return undefined
                },
              }}
            >
              {(field) => (
                <field.MultiSelect
                  label="Patients"
                  options={patientOptions}
                  placeholder={
                    type === 'individual'
                      ? 'Sélectionner un patient'
                      : 'Sélectionner un ou plusieurs patients'
                  }
                  maxSelected={type === 'individual' ? 1 : capacity}
                  disabled={!!defaultPatientIDs?.length}
                />
              )}
            </form.AppField>
          </form>
        </PopupBody>

        <PopupFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            <X className="w-4 h-4" />
            Annuler
          </Button>
          <Button
            variant="default"
            onClick={() => form.handleSubmit()}
            isLoading={isPending}
          >
            <Check className="w-4 h-4" />
            Ajouter
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}

export default AddAppointmentForm

// Thématique et type du créneau : les changer ici les change pour tout le créneau.
function SlotThematicTypeFields({
  slot,
  thematics,
  thematicOptions,
  thematicId,
  type,
  onThematicChange,
  onTypeChange,
}: {
  slot?: Slot
  thematics: Thematic[]
  thematicOptions: SelectOption[]
  thematicId: string
  type: string
  onThematicChange: (value: string) => void
  onTypeChange: (value: string) => void
}) {
  // La thématique actuelle reste proposée, même si aucun soignant du créneau ne la pratique.
  const currentId = slot?.slotTemplate?.thematicId
  const options =
    currentId && !thematicOptions.some((o) => o.value === currentId)
      ? [
          {
            value: currentId,
            label:
              thematicLabelByID(
                thematics,
                currentId,
                slot?.slotTemplate?.thematic,
              ) ?? '',
          },
          ...thematicOptions,
        ]
      : thematicOptions
  return (
    <>
      <FormField>
        <Label>Thématique</Label>
        <Select
          options={options}
          placeholder="Aucune thématique"
          value={thematicId}
          onValueChange={onThematicChange}
        />
      </FormField>

      <FormField>
        <Label>Type</Label>
        <Select
          options={APPOINTMENT_TYPE_OPTIONS}
          placeholder="Non renseigné"
          value={type}
          onValueChange={onTypeChange}
        />
      </FormField>
    </>
  )
}
