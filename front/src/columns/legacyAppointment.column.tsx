import { createColumnHelper } from '@tanstack/react-table'
import dayjs from 'dayjs'

import { Etiquette } from '../components/table/etiquette.tsx'
import type { Features } from '../components/table/features.ts'
import { Button } from '../components/ui/button.tsx'
import { APPOINTMENT_TYPE } from '../constants/appointment.constant.ts'
import type { LegacyAppointment } from '../types/legacyAppointment.ts'

const columnHelper = createColumnHelper<Features, LegacyAppointment>()

export const getLegacyAppointmentColumns = ({
  onToggleReported,
  pendingId,
}: {
  onToggleReported: (row: LegacyAppointment) => void
  pendingId: string | null
}) => [
  columnHelper.accessor((r) => (r.reportedAt ? 'Reporté' : 'À reporter'), {
    id: 'statut',
    header: 'Statut',
    size: 100,
    cell: ({ row }) =>
      row.original.reportedAt ? (
        <Etiquette ton="succes">Reporté</Etiquette>
      ) : (
        <Etiquette ton="alerte">À reporter</Etiquette>
      ),
  }),
  columnHelper.accessor((r) => `${r.date.slice(0, 10)} ${r.time}`, {
    id: 'date',
    header: 'Date',
    size: 220,
    cell: ({ row }) => (
      <span className="first-letter:uppercase">
        {dayjs.utc(row.original.date).format('ddd D MMM YYYY')} à{' '}
        {row.original.time}
      </span>
    ),
  }),
  columnHelper.accessor('durationMinutes', {
    header: 'Durée',
    size: 100,
    cell: ({ getValue }) => {
      const v = getValue()
      return v === null ? '' : `${v} min`
    },
  }),
  columnHelper.accessor('patientName', {
    header: 'Patient',
    meta: { grow: true },
  }),
  columnHelper.accessor((r) => r.thematic ?? '', {
    id: 'thematic',
    header: 'Thématique',
    size: 140,
  }),
  columnHelper.accessor((r) => (r.type ? APPOINTMENT_TYPE[r.type] : ''), {
    id: 'type',
    header: 'Mode',
    size: 120,
    cell: ({ row }) =>
      row.original.type ? (
        <Etiquette
          ton={row.original.type === 'telephonic' ? 'temporaire' : 'primaire'}
        >
          {APPOINTMENT_TYPE[row.original.type]}
        </Etiquette>
      ) : (
        <Etiquette ton="neutre">Non précisé</Etiquette>
      ),
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    size: 120,
    meta: { align: 'right' },
    cell: ({ row }) => {
      const reporte = row.original.reportedAt !== null
      return (
        <Button
          size="sm"
          variant={reporte ? 'outline' : 'default'}
          isLoading={pendingId === row.original.id}
          title={reporte ? 'Remettre à reporter' : undefined}
          onClick={() => onToggleReported(row.original)}
        >
          {reporte ? 'Annuler' : 'Reporté'}
        </Button>
      )
    },
  }),
]
