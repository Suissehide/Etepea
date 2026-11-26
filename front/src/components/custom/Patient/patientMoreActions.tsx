import { Ellipsis, Trash2 } from 'lucide-react'

import { useCan } from '../../../hooks/useCan.ts'
import { Button } from '../../ui/button.tsx'
import {
  PopoverContent,
  PopoverMenuItem,
  PopoverRoot,
  PopoverSeparator,
  PopoverTrigger,
} from '../../ui/popover.tsx'
import { PatientAccessLogButton } from './patientAccessLogButton.tsx'

// Menu « … » de la fiche patient ; absent quand le rôle n'y a aucune entrée.
export const PatientMoreActions = ({
  establishmentId,
  serviceId,
  patientID,
  onDelete,
}: {
  establishmentId: string
  serviceId: string
  patientID: string
  onDelete: () => void
}) => {
  const canReadAccessLog = useCan('consultations:read')
  const canDelete = useCan('patient:delete')
  if (!canReadAccessLog && !canDelete) {
    return null
  }
  return (
    <PopoverRoot>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Plus d'actions">
          <Ellipsis className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[250px]">
        <PatientAccessLogButton
          establishmentId={establishmentId}
          serviceId={serviceId}
          patientID={patientID}
        />
        {canReadAccessLog && canDelete && <PopoverSeparator />}
        {canDelete && (
          <PopoverMenuItem
            variant="destructive"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={onDelete}
          >
            Supprimer le patient
          </PopoverMenuItem>
        )}
      </PopoverContent>
    </PopoverRoot>
  )
}
