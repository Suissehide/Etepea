import type { ServiceRole } from './auth.ts'

// Un rôle d'un service (`GET /roles`). Miroir de `serviceRole.schema.ts` (back).
export type Role = {
  id: string
  name: string
  preset: ServiceRole | null
  permissions: string[]
  hiddenSoignantIds: string[]
  memberCount: number
  archivedAt: string | null
}
