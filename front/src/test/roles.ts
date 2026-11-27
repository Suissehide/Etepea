import {
  DEFAULT_ROLE_PERMISSIONS,
  parsePermissions,
  type RolePreset,
} from '../utils/permissions.ts'

// Fixture d'une entrée `services[]` de `/me` pour un rôle prédéfini.
export const svcRole = (preset: RolePreset) => ({
  roleId: `role-${preset}`,
  roleName: preset,
  permissions: [...DEFAULT_ROLE_PERMISSIONS[preset]],
})

// Fixture des champs de rôle d'un `TenantContext` pour un rôle prédéfini.
export const ctxRole = (preset: RolePreset) => ({
  servicePermissions: parsePermissions(DEFAULT_ROLE_PERMISSIONS[preset]),
})
