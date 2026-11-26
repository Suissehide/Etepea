import { z } from 'zod/v4'

const appointmentType = z.enum(['ambulatory', 'hospital', 'telephonic'])

export const legacyAppointmentBodySchema = z.object({
  legacyId: z.string().min(1).max(64),
  date: z.iso.date(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().int().positive().max(1440).nullable(),
  patientName: z.string().trim().min(1).max(255),
  thematic: z.string().trim().max(255).nullable(),
  type: appointmentType.nullable(),
})

export const legacyAppointmentResponseSchema = z.object({
  id: z.string(),
  legacyId: z.string(),
  date: z.coerce.date(),
  time: z.string(),
  durationMinutes: z.number().nullable(),
  patientName: z.string(),
  thematic: z.string().nullable(),
  type: appointmentType.nullable(),
  receivedAt: z.coerce.date(),
  reportedAt: z.coerce.date().nullable(),
})

export const legacyAppointmentsResponseSchema = z.array(
  legacyAppointmentResponseSchema,
)

export const legacyAppointmentParamsSchema = z.object({ id: z.string() })

export const legacyAppointmentPatchSchema = z.object({
  reported: z.boolean(),
})

export type LegacyAppointmentBody = z.infer<typeof legacyAppointmentBodySchema>
export type LegacyAppointmentParams = z.infer<
  typeof legacyAppointmentParamsSchema
>
export type LegacyAppointmentPatch = z.infer<
  typeof legacyAppointmentPatchSchema
>
