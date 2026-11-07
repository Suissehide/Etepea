import { useId } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { Switch } from '@/components/ui/switch.tsx'

// MDS-70 : les créneaux verrouillés sont masqués hors du Planning, sauf demande explicite.
export const useAfficherVerrouilles = create<{
  afficher: boolean
  setAfficher: (afficher: boolean) => void
}>()(
  persist(
    (set) => ({
      afficher: false,
      setAfficher: (afficher) => set({ afficher }),
    }),
    { name: 'afficher-verrouilles' },
  ),
)

export default function ToggleVerrouilles() {
  const id = useId()
  const afficher = useAfficherVerrouilles((state) => state.afficher)
  const setAfficher = useAfficherVerrouilles((state) => state.setAfficher)
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 text-sm text-foreground cursor-pointer whitespace-nowrap"
    >
      <Switch id={id} checked={afficher} onCheckedChange={setAfficher} />
      Créneaux verrouillés
    </label>
  )
}
