// Un nom de référentiel (thématique, soignant, salle) ne sert qu'une fois par service,
// supprimés compris : la base refuse le doublon, le formulaire le signale avant l'envoi.
// La casse et les espaces autour ne comptent pas : « ap » et « AP » se ressemblent trop
// pour coexister dans une liste de choix.

export type NameConflict<T> = { kind: 'active' | 'archived'; item: T }

export const normalizeName = (name: string) =>
  name.trim().toLocaleLowerCase('fr')

export function findNameConflict<T extends { id: string; name: string }>(
  name: string,
  active: readonly T[] | undefined,
  archived: readonly T[] | undefined,
  ignoreID?: string,
): NameConflict<T> | null {
  const key = normalizeName(name)
  if (!key) {
    return null
  }
  const same = (item: T) =>
    item.id !== ignoreID && normalizeName(item.name) === key
  const activeItem = active?.find(same)
  if (activeItem) {
    return { kind: 'active', item: activeItem }
  }
  const archivedItem = archived?.find(same)
  return archivedItem ? { kind: 'archived', item: archivedItem } : null
}
