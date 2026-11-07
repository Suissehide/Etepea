import type { ThematicRole } from '../constants/thematic.constant.ts'

export type Thematic = {
  id: string
  name: string
  duration?: number | null
  /** Consigne affichee au patient dans le PDF du programme. */
  pdfNotice?: string | null
  role?: ThematicRole | null
  /** MDS-71 : créneaux sans patient, visibles seulement dans le Planning. */
  internal?: boolean
  soignants: { id: string; name: string }[]
}

export type CreateThematicParams = {
  name: string
  duration?: number | null
  pdfNotice?: string | null
  role?: ThematicRole | null
  /** MDS-71 : créneaux sans patient, visibles seulement dans le Planning. */
  internal?: boolean
  soignantIDs: string[]
}

export type UpdateThematicParams = {
  id: string
  name?: string
  duration?: number | null
  pdfNotice?: string | null
  role?: ThematicRole | null
  /** MDS-71 : créneaux sans patient, visibles seulement dans le Planning. */
  internal?: boolean
  soignantIDs?: string[]
  /** `true` archive, `false` restaure. */
  archived?: boolean
}
