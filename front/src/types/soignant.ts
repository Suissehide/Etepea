export type Soignant = {
  id: string
  name: string
  color?: string
  /** MDS-76 : décoché « Actif » ; absent de l'Agenda, du tableau de bord et des formulaires. */
  inactive?: boolean
  /** Masqué : absent de l'Agenda et des filtres du tableau de bord, toujours sélectionnable. */
  hidden?: boolean
  /** Rôle pré-rempli à l'invitation d'un compte rattaché ; ne lie pas. */
  defaultRoleId?: string | null
}

/** Réponse du PATCH : comptes rattachés dont le rôle diffère du nouveau rôle par défaut. */
export type UpdatedSoignant = Soignant & { membersWithOtherRole?: number }

export type CreateSoignantParams = Pick<Soignant, 'name' | 'color'>
// `name`/`color` facultatifs : une restauration n'envoie que `archived`.
export type UpdateSoignantParams = Pick<Soignant, 'id'> &
  Partial<
    Pick<Soignant, 'name' | 'color' | 'inactive' | 'hidden' | 'defaultRoleId'>
  > & {
    /** `true` archive, `false` restaure. */
    archived?: boolean
  }
