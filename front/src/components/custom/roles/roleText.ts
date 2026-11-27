import { SERVICE_PERMISSION_KEYS } from '../../../utils/permissions.ts'

const CATALOGUE = new Set<string>(SERVICE_PERMISSION_KEYS)

export const TOTAL_PERMISSIONS = CATALOGUE.size

// Droits du catalogue détenus par le rôle (une clé retirée du catalogue ne compte pas).
export const countPermissions = (role: { permissions: readonly string[] }) =>
  role.permissions.filter((p) => CATALOGUE.has(p)).length

export const membres = (n: number) => `${n} membre${n > 1 ? 's' : ''}`
