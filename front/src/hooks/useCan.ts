import { useAuthStore } from '../store/useAuthStore.ts'
import type { TenantContext } from '../types/auth.ts'
import {
  hasPermission,
  type Permission,
  presetPermissions,
} from '../utils/permissions.ts'

export const can = (
  context: TenantContext | null,
  permission: Permission,
): boolean =>
  context !== null &&
  hasPermission(
    {
      servicePermissions: presetPermissions(context.serviceRole),
      establishmentRole: context.establishmentRole,
    },
    permission,
  )

export const useCan = (permission: Permission): boolean => {
  const context = useAuthStore((state) => state.context)
  return can(context, permission)
}
