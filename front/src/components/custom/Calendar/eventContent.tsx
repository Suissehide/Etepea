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

import {
  darkenHex,
  hexToRGBA,
  readableTint,
  tintOnWhite,
} from '../../../libs/color.ts'
import type {
  FreeInterval,
  SlotTranche,
} from '../../../libs/slotAvailability.ts'
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
  onPickTranche?: (eventId: string, range: FreeInterval) => void
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
  onPickTranche,
}: Props) => {
  const { event, view } = eventContent
  const {
    states,
    appointments,
    thematic,
    location,
    type,
    locked,
    archived,
    tranches = [],
    conflicts = [],
    capacity,
    isIndividual: isIndividualTemplate,
  } = event.extendedProps
  const isTimeGridView = view.type.startsWith('timeGrid')
  const isRowLayout = !isTimeGridView

  const isIndividual = containsKeyword(states, ['individual'])
  const isMultiple = containsKeyword(states, ['multiple'])
  const isSelected = selectedSlotIds?.has(event.id) ?? false
  const isSelectionMode = selectedSlotIds && selectedSlotIds.size > 0

  const slotColor = event.color || '#2563eb'
  // Dashboard : l'individuel est clair, seuls ses rendez-vous sont pleins.
  const clair = effectifSeul && isIndividual && isTimeGridView
  const appointmentColor = couleurRendezVous(slotColor, clair)
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
      style={styleHero(event, clair, effectifSeul)}
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

      <Libelle
        clair={clair}
        event={event}
        slotColor={slotColor}
        tranches={tranches}
        onPick={
          ajoutPossible && !locked && !archived ? onPickTranche : undefined
        }
        showSecondaryTags={showSecondaryTags}
        isRowLayout={isRowLayout}
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
        clair={clair}
        textColor={event.contrastColor}
        slotStart={event.start}
        archived={archived}
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
  clair,
  textColor,
  slotStart,
  archived,
}: Omit<AppointmentListProps, 'appointments'> & {
  clair: boolean
  archived?: boolean
  textColor?: string
  slotStart: EventDisplayInfo['event']['start']
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
  const inscrits =
    appointments?.flatMap((a) => a.appointmentPatients ?? []).length ?? 0
  // Sans le détail des inscrits, le clic n'ajoute que sur un collectif vide.
  const placesRestantes = effectifSeul
    ? capacity == null || inscrits < capacity
    : !hasAppointments
  return (
    <>
      {isIndividual && hasAppointments && (
        <IndividualAppointments
          appointments={appointments ?? []}
          isRowLayout={isRowLayout}
          appointmentColor={appointmentColor}
          styleFor={styleFor}
          onOpen={onOpen}
          heure={clair}
          textColor={clair ? textColor : undefined}
          slotStart={slotStart}
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
          inscrits={inscrits}
          capacity={capacity}
          isRowLayout={isRowLayout}
          supprime={archived}
        />
      )}

      {isMultiple &&
        !locked &&
        !archived &&
        ajoutPossible &&
        placesRestantes && <AjoutAuSurvol />}
    </>
  )
}

const couleurRendezVous = (slotColor: string, clair: boolean) =>
  clair ? slotColor : darkenHex(slotColor, 0.3)

// Dashboard : un créneau supprimé, gardé pour ses rendez-vous, est hachuré.
function styleHero(
  event: EventDisplayInfo['event'],
  clair: boolean,
  effectifSeul: boolean,
) {
  const slotColor = event.color || '#2563eb'
  const hachure = clair ? hexToRGBA(slotColor, 0.35) : 'rgba(255,255,255,0.35)'
  const hachures =
    effectifSeul && event.extendedProps.archived
      ? { backgroundImage: hachuresDe(hachure) }
      : {}
  if (!clair) {
    return { ...slotStyle(event), ...hachures }
  }
  return {
    backgroundColor: tintOnWhite(slotColor, 0.15),
    color: readableTint(slotColor, 0.15),
    boxShadow: `inset 0 0 0 1px ${hexToRGBA(slotColor, 0.6)}`,
    padding: 0,
    ...hachures,
  }
}

const hachuresDe = (couleur: string) =>
  `repeating-linear-gradient(135deg, transparent 0 5px, ${couleur} 5px 6px)`

/** « + Ajouter » au survol, comme sur les tranches des individuels. */
function AjoutAuSurvol() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-end rounded-sm p-1 transition-colors group-hover:bg-black/5">
      <span className="flex items-center gap-0.5 rounded bg-background px-1 text-[0.6rem] font-semibold leading-4 text-foreground shadow-sm opacity-0 transition-opacity group-hover:opacity-100">
        <Plus className="h-3 w-3" />
        Ajouter
      </span>
    </div>
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
  appointment: Pick<Appointment, 'startDate' | 'endDate'>,
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
  heure,
  textColor,
  slotStart,
}: AppointmentListProps & {
  appointmentColor: string
  heure?: boolean
  textColor?: string
  slotStart?: EventDisplayInfo['event']['start']
}) {
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
          style={{
            ...(isRowLayout
              ? { backgroundColor: appointmentColor }
              : styleFor(appointment)),
            color: textColor,
          }}
          className={clsx(
            'fc-event-hero z-10 cursor-pointer flex justify-start p-0.5 text-white truncate px-1 border border-white/30 rounded hover:brightness-90 transition-all',
            isRowLayout ? 'flex-1 min-w-0' : 'overflow-hidden',
            heure &&
              sousEnTete(appointment.startDate, slotStart) &&
              'pt-[18px]',
          )}
        >
          {heure && (
            <span className="mr-1 shrink-0 text-[0.6rem] font-semibold tabular-nums opacity-80">
              {dayjs.utc(appointment.startDate).format('HH:mm')}
            </span>
          )}
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
  supprime,
}: {
  inscrits: number
  capacity?: number | null
  isRowLayout: boolean
  /** Créneau supprimé gardé pour ses rendez-vous : plus aucune place à prendre. */
  supprime?: boolean
}) {
  const libres = supprime || capacity == null ? null : capacity - inscrits
  return (
    <span
      className={clsx(
        'relative z-10 pointer-events-none whitespace-nowrap rounded-sm px-1 text-[0.6rem] font-semibold leading-[14px] text-white',
        isRowLayout ? 'ml-auto self-center' : 'mt-auto self-start',
        libres != null && libres > 0 ? 'bg-destructive' : 'bg-black/40',
      )}
    >
      {libellePlaces(supprime, libres, inscrits)}
    </span>
  )
}

function libellePlaces(
  supprime: boolean | undefined,
  libres: number | null,
  inscrits: number,
) {
  if (supprime) {
    return (
      <>
        <Trash2 className="inline w-2.5 h-2.5 mr-0.5" />
        Supprimé
      </>
    )
  }
  if (libres == null) {
    return `${inscrits} inscrit${inscrits > 1 ? 's' : ''}`
  }
  if (libres > 0) {
    return `${libres} libre${libres > 1 ? 's' : ''}`
  }
  return (
    <>
      <Check className="inline w-2.5 h-2.5 mr-0.5" />
      Complet
    </>
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

/** La plage commence avec le créneau : son haut passe sous l'en-tête. */
const sousEnTete = (
  start: string,
  slotStart?: EventDisplayInfo['event']['start'],
) => !!slotStart && dayjs.utc(start).valueOf() === dayjs(slotStart).valueOf()

/** Thématique et salle sur une ligne, avec les tranches libres comme sur un collectif. */
function EnTeteIndividuel({
  thematic,
  location,
  slotColor,
  tranches,
  supprime,
}: {
  thematic?: string
  location?: string
  slotColor: string
  tranches: SlotTranche[]
  supprime?: boolean
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-[18px] items-center gap-1 px-1 text-[0.6rem]"
      style={{
        backgroundColor: tintOnWhite(slotColor, 0.4),
        color: readableTint(slotColor, 0.4),
      }}
    >
      <span className="min-w-0 truncate">
        <span className="font-semibold">{thematic}</span>
        {location && <span className="opacity-80"> {location}</span>}
      </span>
      {(supprime || tranches.length > 0) && (
        <PlacesLibres
          inscrits={tranches.filter((t) => t.taken).length}
          capacity={tranches.length}
          isRowLayout
          supprime={supprime}
        />
      )}
    </div>
  )
}

/** Libellé habituel, ou en-tête et tranches de l'individuel clair du Dashboard. */
function Libelle({
  clair,
  event,
  slotColor,
  tranches,
  onPick,
  showSecondaryTags,
  isRowLayout,
}: {
  clair: boolean
  event: EventDisplayInfo['event']
  slotColor: string
  tranches: SlotTranche[]
  onPick?: (eventId: string, tranche: FreeInterval) => void
  showSecondaryTags: boolean
  isRowLayout: boolean
}) {
  const { thematic, location, secondaryTags = [] } = event.extendedProps
  if (clair) {
    return (
      <IndividuelClair
        event={event}
        thematic={thematic}
        location={location}
        slotColor={slotColor}
        tranches={tranches}
        onPick={onPick}
      />
    )
  }
  const durationMinutes = event.end
    ? dayjs(event.end).diff(dayjs(event.start), 'minute')
    : 0
  return (
    <EventLabel
      title={event.title}
      thematic={thematic}
      location={location}
      secondaryTags={showSecondaryTags ? secondaryTags : []}
      isRowLayout={isRowLayout}
      locationOnOwnLine={durationMinutes > 30}
    />
  )
}

function IndividuelClair({
  event,
  thematic,
  location,
  slotColor,
  tranches,
  onPick,
}: {
  event: EventDisplayInfo['event']
  thematic?: string
  location?: string
  slotColor: string
  tranches: SlotTranche[]
  onPick?: (eventId: string, tranche: FreeInterval) => void
}) {
  return (
    <>
      <EnTeteIndividuel
        thematic={thematic}
        location={location}
        slotColor={slotColor}
        tranches={tranches}
        supprime={event.extendedProps.archived}
      />
      <Tranches
        event={event}
        tranches={tranches}
        slotColor={slotColor}
        onPick={onPick && ((tranche) => onPick(event.id, tranche))}
      />
    </>
  )
}

/** Tranches libres avec leur heure, cliquables pour ajouter ; le reliquat trop court est hachuré. */
function Tranches({
  event,
  tranches,
  slotColor,
  onPick,
}: {
  event: EventDisplayInfo['event']
  tranches: SlotTranche[]
  slotColor: string
  onPick?: (tranche: FreeInterval) => void
}) {
  const separateur = hexToRGBA(slotColor, 0.5)
  const position = (start: string, end: string) =>
    appointmentStyle({ startDate: start, endDate: end }, event, '', true)
  const finTranches = tranches.at(-1)?.end
  const reliquat =
    finTranches && event.end && dayjs.utc(finTranches).isBefore(event.end)
  return (
    <>
      {tranches
        .filter((tranche) => !tranche.taken)
        .map((tranche) => {
          const heure = dayjs.utc(tranche.start).format('HH:mm')
          const enTete = sousEnTete(tranche.start, event.start)
          const className = clsx(
            'z-10 flex items-start justify-between px-1 text-[0.6rem] tabular-nums',
            enTete ? 'pt-[18px]' : 'border-t border-dashed',
            onPick &&
              'group/tranche cursor-pointer transition-colors hover:bg-black/5',
          )
          const style = {
            ...position(tranche.start, tranche.end),
            backgroundColor: undefined,
            borderColor: separateur,
          }
          return onPick ? (
            <button
              key={tranche.start}
              type="button"
              data-event-action
              aria-label={`Ajouter un rendez-vous à ${heure}`}
              onClick={(e) => {
                e.stopPropagation()
                onPick(tranche)
              }}
              style={style}
              className={className}
            >
              <span>{heure}</span>
              <span className="flex items-center gap-0.5 font-semibold opacity-0 transition-opacity group-hover/tranche:opacity-100">
                <Plus className="h-3 w-3" />
                Ajouter
              </span>
            </button>
          ) : (
            <div
              key={tranche.start}
              style={style}
              className={clsx(className, 'pointer-events-none')}
            >
              {heure}
            </div>
          )
        })}
      {reliquat && (
        <div
          aria-hidden
          className="pointer-events-none border-t border-dashed"
          style={{
            ...position(finTranches, dayjs(event.end).toISOString()),
            backgroundColor: undefined,
            borderColor: separateur,
            backgroundImage: hachuresDe(separateur),
          }}
        />
      )}
    </>
  )
}
