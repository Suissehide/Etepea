import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMemo } from 'react'

import { getLegacyAppointmentColumns } from '@/columns/legacyAppointment.column.tsx'
import DashboardLayout from '@/components/dashboard.layout.tsx'
import ReactTable from '@/components/table/reactTable.tsx'
import { can } from '@/hooks/useCan.ts'
import {
  useLegacyAppointmentsQuery,
  useSetLegacyAppointmentReported,
} from '@/queries/useLegacyAppointment.ts'
import type { LegacyAppointment } from '@/types/legacyAppointment.ts'
import { resolveTenantContext } from '@/utils/tenant-context.ts'

export const Route = createFileRoute(
  '/_authenticated/e/$establishmentId/s/$serviceId/_settings/rdv-ancienne-app',
)({
  beforeLoad: ({ context, params }) => {
    const tenant = resolveTenantContext(context.authState.user, params)
    if (!can(tenant, 'appointment:create')) {
      throw redirect({
        to: '/e/$establishmentId/s/$serviceId/dashboard',
        params,
      })
    }
  },
  component: RdvAncienneApp,
})

// À reporter d'abord, puis par date de rendez-vous.
const ordre = (a: LegacyAppointment, b: LegacyAppointment) =>
  Number(a.reportedAt !== null) - Number(b.reportedAt !== null) ||
  `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)

function RdvAncienneApp() {
  const { data, isPending } = useLegacyAppointmentsQuery()
  const setReported = useSetLegacyAppointmentReported()
  const pendingId = setReported.isPending
    ? (setReported.variables?.id ?? null)
    : null

  const rows = useMemo(() => [...(data ?? [])].sort(ordre), [data])
  const aReporter = rows.filter((r) => r.reportedAt === null).length

  const columns = useMemo(
    () =>
      getLegacyAppointmentColumns({
        onToggleReported: (r) =>
          setReported.mutate({ id: r.id, reported: r.reportedAt === null }),
        pendingId,
      }),
    [setReported.mutate, pendingId],
  )

  return (
    <DashboardLayout>
      <div className="flex-1 min-h-0 bg-background p-6 rounded-lg flex flex-col w-full gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="h-9 flex items-center text-text-dark text-xl font-semibold">
            RDV de l'ancienne app
          </h1>
          <p className="text-sm text-text-light">
            {data === null
              ? "Cette fonctionnalité n'est pas activée pour ce service."
              : `Rendez-vous créés dans l'ancienne app, à reporter à la main dans l'Agenda : ${aReporter} à reporter sur ${rows.length}.`}
          </p>
        </div>

        <ReactTable<LegacyAppointment>
          data={rows}
          columns={columns}
          filterId="legacy-appointment"
          isLoading={isPending}
          isRowMuted={(r) => r.reportedAt !== null}
          fixedLayout
          emptyState="Aucun rendez-vous reçu de l'ancienne app"
        />
      </div>
    </DashboardLayout>
  )
}
