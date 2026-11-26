import { Link, useParams } from '@tanstack/react-router'

import { Button } from '@/components/ui/button.tsx'
import { useLegacyAppointmentsQuery } from '@/queries/useLegacyAppointment.ts'

// Temporaire : n'apparaît que si la fonctionnalité « legacy-rdv » est activée.
const BoutonRdvAncienneApp = () => {
  const { data } = useLegacyAppointmentsQuery()
  const { establishmentId = '', serviceId = '' } = useParams({ strict: false })
  if (!data) {
    return null
  }
  const aReporter = data.filter((r) => r.reportedAt === null).length
  return (
    <Button asChild size="sm" variant={aReporter > 0 ? 'default' : 'outline'}>
      <Link
        to="/e/$establishmentId/s/$serviceId/rdv-ancienne-app"
        params={{ establishmentId, serviceId }}
      >
        Ancienne app : {aReporter} à reporter
      </Link>
    </Button>
  )
}

export default BoutonRdvAncienneApp
