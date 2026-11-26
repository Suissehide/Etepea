import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { can } from '@/hooks/useCan.ts'
import { NAVIGATION } from '@/navigation/navigation.ts'
import type { Permission } from '@/utils/permissions.ts'
import { resolveTenantContext } from '@/utils/tenant-context.ts'

// Les ecrans de cette branche sont ceux du groupe Administration : on y entre avec la permission de
// l'un d'eux, chaque ecran se garde ensuite par la sienne.
const SETTINGS_PERMISSIONS: Permission[] = NAVIGATION.service
  .filter((item) => item.group === 'Administration')
  .flatMap((item) => [item.permission ?? []].flat())

export const Route = createFileRoute(
  '/_authenticated/e/$establishmentId/s/$serviceId/_settings',
)({
  beforeLoad: ({ context, params }) => {
    const tenant = resolveTenantContext(context.authState.user, params)
    if (!SETTINGS_PERMISSIONS.some((permission) => can(tenant, permission))) {
      throw redirect({
        to: '/e/$establishmentId/s/$serviceId/dashboard',
        params,
      })
    }
  },
  component: () => <Outlet />,
})
