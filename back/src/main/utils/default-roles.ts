import {
  DEFAULT_ROLE_NAMES,
  DEFAULT_ROLE_PERMISSIONS,
  type RolePreset,
} from './permissions'

const PRESETS = Object.keys(DEFAULT_ROLE_PERMISSIONS) as RolePreset[]

// Les quatre rôles par défaut d'un service, tels que les écrit la migration.
export const defaultRolesInput = () =>
  PRESETS.map((preset) => ({
    name: DEFAULT_ROLE_NAMES[preset],
    preset,
    permissions: [...DEFAULT_ROLE_PERMISSIONS[preset]],
  }))

export const defaultRolesData = (serviceId: string, establishmentId: string) =>
  defaultRolesInput().map((role) => ({ ...role, serviceId, establishmentId }))
