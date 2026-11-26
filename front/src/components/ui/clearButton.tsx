import { X } from 'lucide-react'

import { cn } from '../../libs/utils.ts'

interface ClearButtonProps {
  onClear: () => void
  label?: string
  className?: string
}

// Croix qui vide un champ de recherche. `onMouseDown` empêché : le champ garde le focus,
// on peut retaper aussitôt.
export function ClearButton({
  onClear,
  label = 'Effacer la recherche',
  className,
}: ClearButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClear}
      className={cn(
        'flex items-center justify-center w-5 h-5 shrink-0 rounded cursor-pointer text-text-light hover:text-text-dark hover:bg-muted',
        className,
      )}
    >
      <X className="w-3.5 h-3.5" />
    </button>
  )
}
