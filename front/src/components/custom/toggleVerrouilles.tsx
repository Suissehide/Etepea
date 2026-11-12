import { Lock } from 'lucide-react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { Button } from '@/components/ui/button.tsx'

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
  const afficher = useAfficherVerrouilles((state) => state.afficher)
  const setAfficher = useAfficherVerrouilles((state) => state.setAfficher)
  return (
    <Button
      variant={afficher ? 'default' : 'outline'}
      className="rounded-lg font-normal"
      aria-pressed={afficher}
      onClick={() => setAfficher(!afficher)}
    >
      <Lock className="size-4" />
      Afficher verrouillés
    </Button>
  )
}
