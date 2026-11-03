import { CheckSquare, Square, X } from 'lucide-react'
import { type ReactNode, useCallback, useEffect } from 'react'

import { CHAMPS_DE_SAISIE } from '@/components/custom/pdf-design/editor/raccourcis.ts'
import { Button } from '@/components/ui/button.tsx'
import type { CalendarEvent } from './calendar.tsx'

export const BAR_BUTTON =
  'flex h-9 cursor-pointer items-center gap-[7px] rounded-lg px-3 text-sm font-medium text-white hover:bg-white/10'
export const MENU_ITEM =
  'flex h-[38px] cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm text-foreground outline-none select-none data-highlighted:bg-[#f8fafc]'

export function SelectAllButton({
  events,
  hidden,
  selectedIds,
  onSelectAll,
  onClear,
}: {
  events: CalendarEvent[]
  hidden: boolean
  selectedIds: Set<string>
  onSelectAll: (ids: string[]) => void
  onClear: () => void
}) {
  const disabled = hidden || events.length === 0
  const selectAll = useCallback(
    () => onSelectAll(events.map((event) => event.id)),
    [events, onSelectAll],
  )

  useEffect(() => {
    if (disabled) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      // Dans un champ ou une modale, Cmd+A garde son sens habituel.
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== 'a' ||
        CHAMPS_DE_SAISIE.includes(target.tagName) ||
        target.isContentEditable ||
        target.closest('[role="dialog"]')
      ) {
        return
      }
      event.preventDefault()
      selectAll()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [disabled, selectAll])

  if (disabled) {
    return null
  }
  const allSelected = events.every((event) => selectedIds.has(event.id))
  return (
    <Button
      variant="outline"
      className="font-normal rounded-lg"
      title="Cmd+A"
      onClick={allSelected ? onClear : selectAll}
    >
      {allSelected ? <Square size={16} /> : <CheckSquare size={16} />}
      {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
    </Button>
  )
}

/** Barre flottante de la sélection : `children` porte les actions, Suppr appelle `onDelete`. */
export function SelectionBar({
  count,
  onDelete,
  onClear,
  children,
}: {
  count: number
  onDelete: () => void
  onClear: () => void
  children: ReactNode
}) {
  // Échap désélectionne, Suppr ou Retour arrière demande la suppression ; hors champ, menu ou modale.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        CHAMPS_DE_SAISIE.includes(target.tagName) ||
        target.isContentEditable ||
        target.closest('[role="dialog"], [role="menu"]')
      ) {
        return
      }
      if (event.key === 'Escape') {
        onClear()
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        onDelete()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onDelete, onClear])

  return (
    <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-xl bg-[#04182b] p-1.5 shadow-[0_10px_30px_rgba(4,24,43,.3)]">
      <span className="flex items-center gap-2 px-2.5 text-sm font-semibold text-white">
        <span className="flex h-[22px] min-w-[26px] items-center justify-center rounded-full bg-primary px-1.5 text-[13px]">
          {count}
        </span>
        {count > 1 ? 'sélectionnés' : 'sélectionné'}
      </span>
      <span className="h-6 w-px bg-white/15" />
      {children}
      <span className="h-6 w-px bg-white/15" />
      <button
        type="button"
        title="Désélectionner (Échap)"
        aria-label="Désélectionner"
        onClick={onClear}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[#cbd5e1] hover:bg-white/10"
      >
        <X size={18} />
      </button>
    </div>
  )
}
