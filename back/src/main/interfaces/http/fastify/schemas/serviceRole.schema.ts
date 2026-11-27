import { z } from 'zod/v4'

import { SERVICE_PERMISSION_KEYS } from '../../../../utils/permissions'
import { cuid } from './id.schema'

export const serviceRoleResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  preset: z
    .enum(['COORDINATEUR', 'INTERVENANT', 'SECRETARIAT', 'LECTURE'])
    .nullable(),
  permissions: z.array(z.string()),
  memberCount: z.number().int(),
  archivedAt: z.coerce.date().nullable(),
})

export const serviceRolesResponseSchema = z.array(serviceRoleResponseSchema)

export const listServiceRolesQuerySchema = z.object({
  archived: z.stringbool().default(false),
})

export type ListServiceRolesQuery = z.infer<typeof listServiceRolesQuerySchema>

export const createServiceRoleSchema = z.object({
  name: z.string().trim().min(1).max(60),
  permissions: z.array(z.enum(SERVICE_PERMISSION_KEYS)),
})

export type CreateServiceRoleBody = z.infer<typeof createServiceRoleSchema>

export const updateServiceRoleSchema = createServiceRoleSchema.partial()

export type UpdateServiceRoleBody = z.infer<typeof updateServiceRoleSchema>

export const serviceRoleParamsSchema = z.object({ roleId: cuid() })

export type ServiceRoleParams = z.infer<typeof serviceRoleParamsSchema>
