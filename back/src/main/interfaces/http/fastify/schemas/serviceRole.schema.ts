import { z } from 'zod/v4'

export const serviceRoleResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  preset: z
    .enum(['COORDINATEUR', 'INTERVENANT', 'SECRETARIAT', 'LECTURE'])
    .nullable(),
  permissions: z.array(z.string()),
  hiddenSoignantIds: z.array(z.string()),
  memberCount: z.number().int(),
  archivedAt: z.coerce.date().nullable(),
})

export const serviceRolesResponseSchema = z.array(serviceRoleResponseSchema)

export const listServiceRolesQuerySchema = z.object({
  archived: z.stringbool().default(false),
})

export type ListServiceRolesQuery = z.infer<typeof listServiceRolesQuerySchema>
