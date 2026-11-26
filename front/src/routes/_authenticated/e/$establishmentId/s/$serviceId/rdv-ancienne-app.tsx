import { createFileRoute } from '@tanstack/react-router'
import dayjs from 'dayjs'

import DashboardLayout from '@/components/dashboard.layout.tsx'
import { Etiquette } from '@/components/table/etiquette.tsx'
import { Button } from '@/components/ui/button.tsx'
import { APPOINTMENT_TYPE } from '@/constants/appointment.constant.ts'
import {
  useLegacyAppointmentsQuery,
  useSetLegacyAppointmentReported,
} from '@/queries/useLegacyAppointment.ts'
import type { LegacyAppointment } from '@/types/legacyAppointment.ts'
import { dailyTabGuard } from '@/utils/tab-guard.ts'

export const Route = createFileRoute(
  '/_authenticated/e/$establishmentId/s/$serviceId/rdv-ancienne-app',
)({
  beforeLoad: dailyTabGuard('appointment:create'),
  component: RdvAncienneApp,
})

const COLONNES = ['Date', 'Heure', 'Durée', 'Patient', 'Thématique', 'Mode', '']

const Ligne = ({ rdv }: { rdv: LegacyAppointment }) => {
  const setReported = useSetLegacyAppointmentReported()
  const reporte = rdv.reportedAt !== null
  return (
    <tr className="border-b border-border">
      <td className="px-3 py-2 first-letter:uppercase">
        {dayjs.utc(rdv.date).format('dddd D MMMM YYYY')}
      </td>
      <td className="px-3 py-2">{rdv.time}</td>
      <td className="px-3 py-2">
        {rdv.durationMinutes === null ? '' : `${rdv.durationMinutes} min`}
      </td>
      <td className="px-3 py-2 font-medium">{rdv.patientName}</td>
      <td className="px-3 py-2">{rdv.thematic ?? ''}</td>
      <td className="px-3 py-2">
        {rdv.type ? (
          <Etiquette
            ton={rdv.type === 'telephonic' ? 'temporaire' : 'primaire'}
          >
            {APPOINTMENT_TYPE[rdv.type]}
          </Etiquette>
        ) : (
          <Etiquette ton="neutre">Non précisé</Etiquette>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <Button
          size="sm"
          variant={reporte ? 'outline' : 'default'}
          isLoading={setReported.isPending}
          onClick={() => setReported.mutate({ id: rdv.id, reported: !reporte })}
        >
          {reporte ? 'Remettre à reporter' : 'Reporté'}
        </Button>
      </td>
    </tr>
  )
}

const Tableau = ({
  titre,
  rdvs,
  vide,
}: {
  titre: string
  rdvs: LegacyAppointment[]
  vide: string
}) => (
  <section className="flex flex-col gap-2">
    <h2 className="text-base font-semibold text-text-dark">
      {titre} ({rdvs.length})
    </h2>
    {rdvs.length === 0 ? (
      <p className="text-sm text-text-light">{vide}</p>
    ) : (
      <div className="overflow-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-douce text-left text-text-light">
            <tr>
              {COLONNES.map((c) => (
                <th key={c} className="px-3 py-2 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rdvs.map((rdv) => (
              <Ligne key={rdv.id} rdv={rdv} />
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
)

function RdvAncienneApp() {
  const { data, isPending } = useLegacyAppointmentsQuery()

  return (
    <DashboardLayout>
      <div className="flex-1 min-h-0 overflow-y-auto bg-background p-6 rounded-lg flex flex-col w-full gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-text-dark">
            Rendez-vous de l'ancienne app
          </h1>
          <p className="text-sm text-text-light">
            Rendez-vous créés dans l'ancienne app, à reporter à la main dans
            l'Agenda.
          </p>
        </div>
        {isPending ? null : data ? (
          <>
            <Tableau
              titre="À reporter"
              rdvs={data.filter((r) => r.reportedAt === null)}
              vide="Rien à reporter."
            />
            <Tableau
              titre="Reportés"
              rdvs={data.filter((r) => r.reportedAt !== null)}
              vide="Aucun rendez-vous reporté."
            />
          </>
        ) : (
          <p className="text-sm text-text-light">
            Cette fonctionnalité n'est pas activée pour ce service.
          </p>
        )}
      </div>
    </DashboardLayout>
  )
}
