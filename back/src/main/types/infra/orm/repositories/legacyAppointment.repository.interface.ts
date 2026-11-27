import type { LegacyAppointment, Prisma } from '../../../../../generated/client'

export type LegacyAppointmentEntityRepo = LegacyAppointment

export type LegacyAppointmentInput = Omit<
  Prisma.LegacyAppointmentUncheckedCreateInput,
  'id' | 'serviceId' | 'establishmentId' | 'receivedAt' | 'reportedAt'
>

export interface LegacyAppointmentRepositoryInterface {
  isEnabled: () => Promise<boolean>
  receive: (
    target: { serviceId: string; establishmentId: string },
    input: LegacyAppointmentInput,
  ) => Promise<boolean>
  findAll: () => Promise<LegacyAppointmentEntityRepo[]>
  setReported: (
    id: string,
    reported: boolean,
  ) => Promise<LegacyAppointmentEntityRepo>
  delete: (id: string) => Promise<void>
}
