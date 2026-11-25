import { Eye, Undo2 } from 'lucide-react'

import type { NameConflict } from '../../../libs/nameConflict.ts'
import { Button } from '../../ui/button.tsx'

type Named = { id: string; name: string }

interface NameConflictNoticeProps<T extends Named> {
  conflict: NameConflict<T> | null
  /** « Une thématique », « Un soignant », « Une salle ». */
  noun: string
  feminine: boolean
  /** Réglages de l'élément existant, en pastilles (durée, soignants…). */
  details?: (item: T) => string[]
  onRestore: (item: T) => void
  restoring?: boolean
  /** Ferme l'ajout et montre l'élément existant dans la liste. */
  onShowExisting?: (item: T) => void
}

// Encart sous le champ Nom quand le nom tapé est déjà pris. Une supprimée se restaure en
// un clic (le nom ne peut pas servir deux fois) ; une active est signalée en information,
// pas en faute : on cherchait souvent celle qui existe.
export function NameConflictNotice<T extends Named>({
  conflict,
  noun,
  feminine,
  details,
  onRestore,
  restoring,
  onShowExisting,
}: NameConflictNoticeProps<T>) {
  if (!conflict) {
    return null
  }
  const { item } = conflict
  const chips = details?.(item) ?? []

  if (conflict.kind === 'archived') {
    return (
      <div
        role="status"
        className="flex flex-col gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
      >
        <p className="leading-snug">
          {noun} <b>« {item.name} »</b> a été{' '}
          {feminine ? 'supprimée' : 'supprimé'}. Le nom ne peut pas servir deux
          fois : {feminine ? 'restaurez-la' : 'restaurez-le'}, ou choisissez un
          autre nom.
        </p>
        <Chips
          chips={chips}
          className="bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-100"
        />
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            size="sm"
            isLoading={restoring}
            onClick={() => onRestore(item)}
            className="bg-amber-700 text-white hover:bg-amber-700/85"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Restaurer « {item.name} »
          </Button>
          <span className="text-xs text-amber-800 dark:text-amber-200">
            avec ses réglages d'avant
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100"
    >
      <p className="leading-snug">
        <b>« {item.name} »</b> existe déjà dans ce service.
        {onShowExisting &&
          ` Vous vouliez peut-être ${feminine ? 'la' : 'le'} modifier ?`}
      </p>
      <Chips
        chips={chips}
        className="bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-100"
      />
      {onShowExisting && (
        <div className="flex items-center gap-2.5">
          <Button type="button" size="sm" onClick={() => onShowExisting(item)}>
            <Eye className="w-3.5 h-3.5" />
            Voir « {item.name} »
          </Button>
          <span className="text-xs text-blue-800 dark:text-blue-200">
            ou choisissez un autre nom
          </span>
        </div>
      )}
    </div>
  )
}

function Chips({ chips, className }: { chips: string[]; className: string }) {
  if (chips.length === 0) {
    return null
  }
  return (
    <div className="flex flex-wrap gap-1.5 text-xs">
      {chips.map((chip) => (
        <span key={chip} className={`rounded-full px-2 py-0.5 ${className}`}>
          {chip}
        </span>
      ))}
    </div>
  )
}
