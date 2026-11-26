import { createFileRoute } from '@tanstack/react-router'

import { redirectToFirstTab } from '@/utils/tab-guard.ts'
import { resolveTenantContext } from '@/utils/tenant-context.ts'

export const Route = createFileRoute(
  '/_authenticated/e/$establishmentId/s/$serviceId/',
)({
  beforeLoad: ({ context, params }) =>
    redirectToFirstTab(
      resolveTenantContext(context.authState.user, params),
      params,
    ),
})
