import { redirect } from '@tanstack/react-router'

import { can } from '@/hooks/useCan.ts'
import type { AuthState } from '@/types/auth.ts'
import type { ServicePermission } from '@/utils/permissions.ts'
import { resolveTenantContext } from '@/utils/tenant-context.ts'

type Params = { establishmentId: string; serviceId: string }

const TABS = [
  ['dashboard:read', '/e/$establishmentId/s/$serviceId/dashboard'],
  ['agenda:read', '/e/$establishmentId/s/$serviceId/agenda'],
  ['patients:read', '/e/$establishmentId/s/$serviceId/patient'],
  ['suivi:read', '/e/$establishmentId/s/$serviceId/suivi'],
] as const

// Renvoie vers le premier onglet du quotidien que le rôle ouvre (ou vers le choix de contexte).
export const redirectToFirstTab = (
  tenant: ReturnType<typeof resolveTenantContext>,
  params: Params,
): never => {
  const first = TABS.find(([permission]) => can(tenant, permission))
  throw first
    ? redirect({ to: first[1], params })
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
