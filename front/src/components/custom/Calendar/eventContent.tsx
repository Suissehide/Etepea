import type { EventDisplayInfo } from '@fullcalendar/react'
import { clsx } from 'clsx'
import dayjs from 'dayjs'
import {
  Check,
  Copy,
  Lock,
  LockOpen,
  MessageSquareTextIcon,
  Plus,
  Trash2,
  Users,
} from 'lucide-react'

import { darkenHex } from '../../../libs/color.ts'
import { containsKeyword } from '../../../libs/utils.ts'
import type { Appointment } from '../../../types/appointment.ts'
import type { AppointmentPatient } from '../../../types/appointmentPatient.ts'
import { Button } from '../../ui/button.tsx'
import {
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '../../ui/tooltip.tsx'
import { ConflictBadge } from '../conflictBadge.tsx'

type Props = {
  setOpenEventId?: (eventId: string) => void
  eventContent: EventDisplayInfo
  editMode?: boolean
  onDuplicate?: (eventId: string) => void
  onDelete?: (eventId: string) => void
  onToggleLock?: (eventId: string, locked: boolean) => void
  selectedSlotIds?: Set<string>
  onToggleSelect?: (eventId: string) => void
  /** Tags secondaires du parcours, affichés sur le créneau. */
  showSecondaryTags?: boolean
  effectifSeul?: boolean
  ajoutPossible?: boolean
}

export const EventContent = ({
  eventContent,
  setOpenEventId,
  editMode,
  onDuplicate,
  onDelete,
  onToggleLock,
  selectedSlotIds,
  onToggleSelect,
  showSecondaryTags = true,
  effectifSeul = false,
  ajoutPossible = true,
}: Props) => {
  const { event, view } = eventContent
  const {
    states,
    appointments,
    thematic,
    location,
    type,
    locked,
    conflicts = [],
    capacity,
    isIndividual: isIndividualTemplate,
    secondaryTags = [],
  } = event.extendedProps
  const isTimeGridView = view.type.startsWith('timeGrid')
  const isRowLayout = !isTimeGridView

  const isIndividual = containsKeyword(states, ['individual'])
  const isMultiple = containsKeyword(states, ['multiple'])
  const isSelected = selectedSlotIds?.has(event.id) ?? false
  const isSelectionMode = selectedSlotIds && selectedSlotIds.size > 0

  const slotColor = event.color || '#2563eb'
  const appointmentColor = darkenHex(slotColor, 0.3)
  const durationMinutes = event.end
    ? dayjs(event.end).diff(dayjs(event.start), 'minute')
    : 0
  // Les trois lignes du libellé sont tronquées : le survol les rend en entier.
  const hoverTitle = [event.title, thematic, location]
    .filter(Boolean)
    .join('\n')

  const calculateAppointmentStyle = (appointment: Appointment) =>
    appointmentStyle(appointment, event, appointmentColor, isIndividual)

  const isEditable = containsKeyword(states, ['editable'])
  // Créneau sans rendez-vous : on peut le verrouiller, le dupliquer, le supprimer.
  const isBare = !containsKeyword(states, [
    'editable',
    'individual',
    'multiple',
  ])
  const isSelectable = ['slot', 'template', 'appointment'].includes(type ?? '')
  const openAppointment = (appointment: Appointment) =>
    setOpenEventId?.(`appointment_${appointment.id}`)

  return (
    <div
      {...(event.id ? { 'data-event-id': `${event.id}` } : {})}
      title={hoverTitle || undefined}
      className={clsx(
        'fc-event-hero relative group cursor-pointer h-full w-full flex text-left p-0.5 transition duration-200',
        isRowLayout ? 'flex-row' : 'flex-col',
        {
          'pointer-events-none': isEditable,
          'opacity-45 bg-gray-400 rounded-sm': editMode && type === 'slot',
          'slot-selected ring-2 ring-primary ring-offset-1 rounded-sm':
            isSelected,
        },
      )}
      style={slotStyle(event)}
    >
      {onToggleSelect && isSelectable && !isEditable && (
        <SelectToggle
          isSelected={isSelected}
          isSelectionMode={Boolean(isSelectionMode)}
          onToggle={() => onToggleSelect(event.id)}
        />
      )}

      <ConflictBadge
        labels={conflicts}
        className="absolute bottom-0.5 right-0.5 z-20"
      />

      {locked && type === 'slot' && (
        <LockedOverlay
          onUnlock={onToggleLock && (() => onToggleLock(event.id, false))}
        />
      )}

      <EditActions
        eventId={event.id}
        type={type}
        locked={locked}
        isBare={isBare}
        showCapacity={
          type === 'template' && !isIndividualTemplate && capacity != null
        }
        capacity={capacity}
        onToggleLock={onToggleLock}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />

      <EventLabel
        title={event.title}
        thematic={thematic}
        location={location}
        secondaryTags={showSecondaryTags ? secondaryTags : []}
        isRowLayout={isRowLayout}
        locationOnOwnLine={durationMinutes > 30}
      />

      <SlotAppointments
        appointments={appointments}
        isIndividual={isIndividual}
        isMultiple={isMultiple}
        locked={locked}
        isRowLayout={isRowLayout}
        appointmentColor={appointmentColor}
        capacity={capacity}
        effectifSeul={effectifSeul}
        ajoutPossible={ajoutPossible}
        styleFor={calculateAppointmentStyle}
        onOpen={openAppointment}
      />
    </div>
  )
}

/** Rendez-vous du créneau, ou bouton + sur un créneau multiple vide. */
function SlotAppointments({
  appointments,
  isIndividual,
  isMultiple,
  locked,
  isRowLayout,
  appointmentColor,
  capacity,
  effectifSeul,
  ajoutPossible,
  styleFor,
  onOpen,
}: Omit<AppointmentListProps, 'appointments'> & {
  appointments?: Appointment[]
  isIndividual: boolean
  isMultiple: boolean
  locked?: boolean
  appointmentColor: string
  capacity?: number | null
  effectifSeul: boolean
  ajoutPossible: boolean
}) {
  const hasAppointments = Boolean(appointments && appointments.length > 0)
  return (
    <>
      {isIndividual && hasAppointments && (
        <IndividualAppointments
          appointments={appointments ?? []}
          isRowLayout={isRowLayout}
          appointmentColor={appointmentColor}
          styleFor={styleFor}
          onOpen={onOpen}
        />
      )}

      {isMultiple && hasAppointments && !effectifSeul && (
        <MultipleAppointments
          appointments={appointments ?? []}
          isRowLayout={isRowLayout}
          capacity={capacity}
          styleFor={styleFor}
          onOpen={onOpen}
        />
      )}

      {isMultiple && effectifSeul && (
        <PlacesLibres
          inscrits={
            appointments?.flatMap((a) => a.appointmentPatients ?? []).length ??
            0
          }
          capacity={capacity}
          isRowLayout={isRowLayout}
        />
      )}

      {/* Bouton + pour slots multiple vides */}
      {isMultiple && !locked && !hasAppointments && ajoutPossible && (
        <div className="z-100 cursor-pointer absolute inset-0 flex justify-center items-center">
          <Button variant="transparent" className="w-full h-full">
            <div className="p-1 rounded-full bg-neutral-50 text-primary group-hover:bg-neutral-300 transition-colors duration-200">
              <Plus className="w-4 h-4" />
            </div>
          </Button>
        </div>
      )}
    </>
  )
}

function slotStyle(event: EventDisplayInfo['event']) {
  const isBackground = event.display === 'background'
  return {
    color: event.contrastColor || undefined,
    backgroundColor: isBackground ? undefined : event.color,
    borderRadius: isBackground ? undefined : '4px',
  }
}

/** Verrou, places, Dupliquer et Supprimer, affichés au survol du créneau. */
function EditActions({
  eventId,
  type,
  locked,
  isBare,
  showCapacity,
  capacity,
  onToggleLock,
  onDuplicate,
  onDelete,
}: Pick<Props, 'onToggleLock' | 'onDuplicate' | 'onDelete'> & {
  eventId: string
  type: string
  locked?: boolean
  isBare: boolean
  showCapacity: boolean
  capacity?: number | null
}) {
  return (
    <>
      {onToggleLock && !locked && isBare && type === 'slot' && (
        <HoverAction
          className="absolute top-0.5 left-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-auto w-auto p-0.5 rounded bg-black/20 hover:bg-black/40 text-white"
          onClick={() => onToggleLock(eventId, true)}
        >
          <LockOpen className="w-2.5 h-2.5" />
        </HoverAction>
      )}

      {/* Nombre de places, en mode édition de parcours. Masqué au survol pour
          laisser la place aux boutons Dupliquer / Supprimer. */}
      {showCapacity && (
        <span className="absolute top-0.5 right-0.5 z-10 flex items-center gap-0.5 rounded bg-black/40 px-1 text-[0.55rem] font-semibold leading-tight text-white pointer-events-none transition-opacity group-hover:opacity-0">
          <Users className="w-2 h-2" />
          {capacity}
        </span>
      )}

      {onDuplicate && isBare && (type === 'slot' || type === 'template') && (
        <HoverAction
          className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-auto w-auto p-0.5 rounded bg-black/20 hover:bg-black/40 text-white"
          onClick={() => onDuplicate(eventId)}
        >
          <Copy className="w-2.5 h-2.5" />
        </HoverAction>
      )}

      {onDelete && isBare && (type === 'slot' || type === 'template') && (
        <HoverAction
          className="absolute top-5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-auto w-auto p-0.5 rounded bg-black/20 hover:bg-red-500 text-white"
          onClick={() => onDelete(eventId)}
        >
          <Trash2 className="w-2.5 h-2.5" />
        </HoverAction>
      )}
    </>
  )
}

function appointmentStyle(
  appointment: Appointment,
  event: EventDisplayInfo['event'],
  appointmentColor: string,
  positioned: boolean,
) {
  if (!positioned) {
    return { backgroundColor: appointmentColor }
  }

  const slotStart = dayjs(event.start)
  const slotEnd = dayjs(event.end)
  const aptStart = dayjs(appointment.startDate)
  const aptEnd = dayjs(appointment.endDate)

  const slotDuration = slotEnd.diff(slotStart, 'minute')
  const aptDuration = aptEnd.diff(aptStart, 'minute')
  const offsetFromStart = aptStart.diff(slotStart, 'minute')

  const heightPercent = (aptDuration / slotDuration) * 100
  const topPercent = (offsetFromStart / slotDuration) * 100

  return {
    position: 'absolute' as const,
    top: `calc(${topPercent}% + 1px)`,
    height: `calc(${heightPercent}% - 2px)`,
    left: 0,
    right: 0,
    backgroundColor: appointmentColor,
  }
}

const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation()

function SelectToggle({
  isSelected,
  isSelectionMode,
  onToggle,
}: {
  isSelected: boolean
  isSelectionMode: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      data-event-action
      className={clsx(
        'absolute bottom-0.5 left-0.5 z-20 h-4 w-4 rounded border flex items-center justify-center transition-all cursor-pointer',
        isSelected
          ? 'bg-primary border-primary text-white'
          : 'border-white/60 bg-black/20 text-transparent hover:border-white hover:bg-black/30',
        isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
      )}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      onMouseDown={stopPropagation}
    >
      <Check className="w-3 h-3" strokeWidth={3} />
    </button>
  )
}

/** Hachures du créneau verrouillé, cadenas cliquable s'il peut être déverrouillé. */
function LockedOverlay({ onUnlock }: { onUnlock?: () => void }) {
  return (
    <>
      <div
        className="absolute inset-0 z-10 pointer-events-none rounded-sm"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.12) 4px, rgba(0,0,0,0.12) 6px)',
        }}
      />
      <button
        type="button"
        data-event-action
        className={clsx(
          'absolute top-0.5 left-0.5 z-10 p-0.5 rounded bg-black/40 text-white',
          onUnlock
            ? 'pointer-events-auto cursor-pointer hover:bg-black/60'
            : 'pointer-events-none',
        )}
        onClick={(e) => {
          if (!onUnlock) {
            return
          }
          e.stopPropagation()
          onUnlock()
        }}
        onMouseDown={onUnlock ? stopPropagation : undefined}
      >
        <Lock className="w-2.5 h-2.5" />
      </button>
    </>
  )
}

function HoverAction({
  className,
  onClick,
  children,
}: {
  className: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      data-event-action
      variant="none"
      className={className}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onMouseDown={stopPropagation}
    >
      {children}
    </Button>
  )
}

type AppointmentListProps = {
  appointments: Appointment[]
  isRowLayout: boolean
  styleFor: (appointment: Appointment) => React.CSSProperties
  onOpen: (appointment: Appointment) => void
}

function IndividualAppointments({
  appointments,
  isRowLayout,
  appointmentColor,
  styleFor,
  onOpen,
}: AppointmentListProps & { appointmentColor: string }) {
  return (
    <div
      className={clsx(
        isRowLayout
          ? 'flex-1 min-w-0 flex flex-row gap-0.5'
          : 'absolute inset-0',
      )}
    >
      {appointments.map((appointment) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onOpen(appointment)
          }}
          key={appointment.id}
          data-appointment-id={appointment.id}
          style={
            isRowLayout
              ? { backgroundColor: appointmentColor }
              : styleFor(appointment)
          }
          className={clsx(
            'fc-event-hero z-10 cursor-pointer flex justify-start p-0.5 text-white truncate px-1 border border-white/30 rounded hover:brightness-90 transition-all',
            isRowLayout ? 'flex-1 min-w-0' : 'overflow-hidden',
          )}
        >
          {appointment.appointmentPatients?.map(
            (appointmentPatient: AppointmentPatient) => (
              <PatientName
                key={appointmentPatient.patient.id}
                appointmentPatient={appointmentPatient}
              />
            ),
          )}
        </button>
      ))}
    </div>
  )
}

function MultipleAppointments({
  appointments,
  isRowLayout,
  capacity,
  styleFor,
  onOpen,
}: AppointmentListProps & { capacity?: number | null }) {
  return (
    <div
      className={clsx(
        'flex-1 min-h-0 gap-0.5 overflow-y-auto',
        isRowLayout ? 'flex flex-row min-w-0' : 'flex flex-col mt-0.5',
      )}
    >
      {appointments.map((appointment) => {
        const count = appointment.appointmentPatients?.length ?? 0
        return (
          <button
            type="button"
            key={appointment.id}
            data-appointment-id={appointment.id}
            onClick={(e) => {
              e.stopPropagation()
              onOpen(appointment)
            }}
            style={styleFor(appointment)}
            className={clsx(
              'fc-event-hero relative z-10 cursor-pointer flex-1 min-h-0 basis-0 flex justify-start p-0.5 text-white px-1 border border-white/30 rounded hover:brightness-90 transition-all',
              isRowLayout ? 'flex-row min-w-0' : 'flex-col mx-0.5',
            )}
          >
            <span className="absolute top-0 right-0 z-20 rounded-bl rounded-tr bg-black/40 px-1 text-[0.55rem] font-semibold leading-tight text-white pointer-events-none">
              {capacity == null ? count : `${count}/${capacity}`}
            </span>
            <div
              className={clsx(
                'flex flex-1 min-h-0 min-w-0 w-full',
                isRowLayout ? 'flex-row' : 'flex-col overflow-y-auto',
              )}
            >
              {appointment.appointmentPatients?.map(
                (appointmentPatient: AppointmentPatient, idx: number) => (
                  <div
                    key={appointmentPatient.patient.id}
                    className={clsx(
                      'flex-1',
                      idx > 0 &&
                        isRowLayout &&
                        'border-l border-white/30 pl-1 ml-1',
                      idx > 0 &&
                        !isRowLayout &&
                        'border-t border-white/30 pt-0.5 mt-0.5',
                    )}
                  >
                    <PatientName appointmentPatient={appointmentPatient} />
                  </div>
                ),
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

/** Places restantes du créneau collectif, en rouge tant qu'il en reste. */
function PlacesLibres({
  inscrits,
  capacity,
  isRowLayout,
}: {
  inscrits: number
  capacity?: number | null
  isRowLayout: boolean
}) {
  const libres = capacity == null ? null : capacity - inscrits
  return (
    <span
      className={clsx(
        'relative z-10 pointer-events-none whitespace-nowrap rounded px-1.5 text-[0.7rem] font-semibold leading-[18px]',
        isRowLayout ? 'ml-auto self-center' : 'mt-auto self-start',
        libres != null && libres > 0 && 'bg-destructive text-white',
      )}
    >
      {libres == null ? (
        `${inscrits} inscrit${inscrits > 1 ? 's' : ''}`
      ) : libres > 0 ? (
        `${libres} libre${libres > 1 ? 's' : ''}`
      ) : (
        <>
          <Check className="inline w-3 h-3 mr-0.5" />
          Complet
        </>
      )}
    </span>
  )
}

/** Soignants, thematique et salle du creneau, puis ses tags secondaires. */
function EventLabel({
  title,
  thematic,
  location,
  secondaryTags,
  isRowLayout,
  locationOnOwnLine,
}: {
  title: string
  thematic?: string
  location?: string
  secondaryTags: string[]
  isRowLayout: boolean
  locationOnOwnLine: boolean
}) {
  return (
    <span
      className={clsx(
        'relative z-10 p-0.5 pointer-events-none',
        isRowLayout ? 'w-48 shrink-0' : '',
      )}
    >
      <div className="text-[0.6rem] truncate">{title}</div>
      <div className="text-[0.6rem] font-semibold truncate">
        {thematic}
        {location && !locationOnOwnLine && (
          <span className="font-normal opacity-80">
            {thematic ? ' · ' : ''}
            {location}
          </span>
        )}
      </div>
      {location && locationOnOwnLine && (
        <div className="text-[0.6rem] opacity-80 truncate">{location}</div>
      )}
      {secondaryTags.length > 0 && (
        <div className="flex flex-wrap gap-0.5 mt-0.5">
          {secondaryTags.map((tag) => (
            <span
              key={tag}
              className="inline-block rounded bg-black/25 px-1 text-[0.5rem] font-medium leading-tight"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </span>
  )
}

function PatientName({
  appointmentPatient,
}: {
  appointmentPatient: AppointmentPatient
}) {
  const name = `${appointmentPatient.patient.lastName} ${appointmentPatient.patient.firstName}`

  if (!appointmentPatient.transmissionNotes) {
    return (
      <div className="flex-1 text-left text-[0.6rem] text-white truncate">
        {name}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <TooltipRoot>
        <TooltipTrigger asChild>
          <div className="flex-1 text-left text-[0.6rem] text-white truncate flex justify-between gap-0.5">
            <span className="truncate">{name}</span>
            <MessageSquareTextIcon className="w-2.5 h-2.5 shrink-0" />
          </div>
        </TooltipTrigger>
        <TooltipContent>{appointmentPatient.transmissionNotes}</TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  )
}
