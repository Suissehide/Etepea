import { redirect } from '@tanstack/react-router'

import { can } from '@/hooks/useCan.ts'
import { NAVIGATION } from '@/navigation/navigation.ts'
import type { AuthState } from '@/types/auth.ts'
import type { ServicePermission } from '@/utils/permissions.ts'
import { resolveTenantContext } from '@/utils/tenant-context.ts'

type Params = { establishmentId: string; serviceId: string }

// Renvoie vers le premier écran du service que le rôle ouvre, quotidien d'abord (ou vers le choix
// de contexte).
export const redirectToFirstTab = (
  tenant: ReturnType<typeof resolveTenantContext>,
  params: Params,
): never => {
  const first = NAVIGATION.service.find(
    (item) => !item.parJeu && item.permission && can(tenant, item.permission),
  )
  throw first
    ? redirect({ to: first.to, params })
    : redirect({ to: '/choose-context' })
}

export const dailyTabGuard =
  (permission: ServicePermission) =>
  ({
    context,
    params,
  }: {
    context: { authState: AuthState }
    params: Params
  }) => {
    const tenant = resolveTenantContext(context.authState.user, params)
    if (!can(tenant, permission)) {
      redirectToFirstTab(tenant, params)
    }
  }
