import { useAuthStore } from '../store/useAuthStore.ts'
import type { TenantContext } from '../types/auth.ts'
import { hasPermission, type Permission } from '../utils/permissions.ts'

// Une liste vaut « l'une quelconque ».
export const can = (
  context: TenantContext | null,
  permission: Permission | readonly Permission[],
): boolean =>
  context !== null &&
  (Array.isArray(permission) ? permission : [permission]).some((p) =>
    hasPermission(
      {
        servicePermissions: context.servicePermissions,
        establishmentRole: context.establishmentRole,
      },
      p,
    ),
  )

export const useCan = (
  permission: Permission | readonly Permission[],
): boolean => {
  const context = useAuthStore((state) => state.context)
  return can(context, permission)
}
