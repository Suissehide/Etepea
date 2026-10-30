import { Lock, Trash2 } from 'lucide-react'

import {
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '../ui/tooltip.tsx'

const CLOSED = {
  locked: {
    Icon: Lock,
    label: 'Créneau verrouillé : plus de prise de rendez-vous',
  },
  archived: {
    Icon: Trash2,
    label: 'Créneau supprimé, conservé pour ses rendez-vous',
  },
}

// Bouton plutôt qu'icône : l'explication s'ouvre aussi au focus clavier.
export function ClosedBadge({ reason }: { reason?: keyof typeof CLOSED }) {
  if (!reason) {
    return null
  }
  const { Icon, label } = CLOSED[reason]
  return (
    <TooltipProvider>
      <TooltipRoot>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className="inline-flex items-center rounded bg-slate-200 p-0.5 text-slate-600"
          >
            <Icon className="h-2.5 w-2.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  )
}
