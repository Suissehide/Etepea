export type Soignant = {
  id: string
  name: string
  color?: string
  /** MDS-76 : absent de l'Agenda, ses créneaux y passent dans « Sans soignant ». */
  hiddenInAgenda?: boolean
}

export type CreateSoignantParams = Pick<Soignant, 'name' | 'color'>
// `name`/`color` facultatifs : une restauration n'envoie que `archived`.
export type UpdateSoignantParams = Pick<Soignant, 'id'> &
  Partial<Pick<Soignant, 'name' | 'color' | 'hiddenInAgenda'>> & {
    /** `true` archive, `false` restaure. */
    archived?: boolean
  }
