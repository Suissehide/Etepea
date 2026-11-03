import type {
  AppointmentPatient,
  UpdateAppointmentPatientParams,
} from './appointmentPatient.ts'
import type { PlanningConflict, Slot } from './slot.ts'

export type Appointment = {
  id: string
  startDate: string
  endDate: string
  slot: Slot
  thematic?: string
  thematicId?: string | null
  /** Motif du rendez-vous — saisi sur un créneau individuel uniquement. */
  motif?: string | null
  appointmentPatients: AppointmentPatient[]
  conflicts?: PlanningConflict[]
}

export type CreateAppointmentParams = Pick<
  Appointment,
  'startDate' | 'endDate' | 'thematicId' | 'motif'
> & { slotID: string; patientIDs: string[] }

export type UpdateAppointmentParams = Pick<
  Appointment,
  'id' | 'thematicId' | 'motif'
> & { slotID?: string; appointmentPatients: UpdateAppointmentPatientParams[] }
