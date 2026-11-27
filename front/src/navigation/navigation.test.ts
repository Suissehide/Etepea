import { type AnyRoute, createRouter } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'

import { can } from '@/hooks/useCan.ts'
import { routeTree } from '@/routeTree.gen.ts'
import type { TenantContext } from '@/types/auth.ts'
import {
  isEstablishmentPermission,
  isServicePermission,
  type Permission,
  type ServicePermission,
} from '@/utils/permissions.ts'
import { HORS_ONGLETS, NAVIGATION, SCALE_ROOTS } from './navigation.ts'

// Les routes FEUILLES de l'arbre genere qui rendent un ecran : un `component` et aucun enfant.
// Les fichiers de redirection (anciennes adresses) n'ont pas de composant ; les layouts ont des
// enfants. Le routeur calcule `fullPath` a son initialisation, d'ou sa construction ici.
// `fullPath` perd sa barre finale, qui ne distingue que les routes d'index.
const ecransDeLArbre = (): string[] => {
  // Le contexte n'est lu que par les gardes (`beforeLoad`), jamais executees ici : aucune
  // navigation n'a lieu, seul l'arbre est initialise.
  const router = createRouter({ routeTree, context: undefined as never })
  return (Object.values(router.routesById) as AnyRoute[])
    .filter(
      (route) =>
        route.options?.component &&
        Object.keys(route.children ?? {}).length === 0,
    )
    .map((route) => route.fullPath.replace(/(.)\/$/, '$1'))
}

const sousUneEchelle = (chemin: string) =>
  Object.values(SCALE_ROOTS).some(
    (racine) => chemin === racine || chemin.startsWith(`${racine}/`),
  )

const toutesLesEntrees = Object.values(NAVIGATION).flat()

describe('table de navigation', () => {
  // Le verrou du defaut n° 2 de l'inventaire (des ecrans sans point d'entree nomme) : ajouter
  // une route de section sans l'inscrire ici fait rougir ce test.
  it('donne un onglet, ou une raison ecrite, a chaque ecran des trois echelles', () => {
    const connus = new Set<string>([
      ...toutesLesEntrees.map((item) => item.to),
      ...Object.keys(HORS_ONGLETS),
    ])
    const orphelins = ecransDeLArbre()
      .filter(sousUneEchelle)
      .filter((chemin) => !connus.has(chemin))

    expect(orphelins).toEqual([])
  })

  it('ne pointe que vers des ecrans qui existent', () => {
    const existants = new Set(ecransDeLArbre())
    const morts = [
      ...toutesLesEntrees.map((item) => item.to),
      ...Object.keys(HORS_ONGLETS),
    ].filter((chemin) => !existants.has(chemin))

    expect(morts).toEqual([])
  })

  it('range chaque ecran sous la racine de son echelle', () => {
    for (const [echelle, items] of Object.entries(NAVIGATION)) {
      const racine = SCALE_ROOTS[echelle as keyof typeof SCALE_ROOTS]
      for (const item of items) {
        expect(item.to === racine || item.to.startsWith(`${racine}/`)).toBe(
          true,
        )
      }
    }
  })

  // Le verrou du defaut n° 3 : un ecran garde par une permission d'etablissement ne peut plus
  // vivre a l'echelle du service (ni l'inverse), ou un administrateur sans service ne
  // l'atteindrait pas.
  it('garde chaque echelle par des permissions de sa propre echelle', () => {
    const permissions = (
      items: readonly { permission?: Permission | readonly Permission[] }[],
    ) =>
      items.flatMap((item) => (item.permission ? [item.permission].flat() : []))

    // « Rôles » : réservé à l'ADMIN d'établissement, seule exception à l'échelle du service.
    expect(
      permissions(NAVIGATION.service).every(
        (p) => isServicePermission(p) || p === 'roles:manage',
      ),
    ).toBe(true)
    expect(
      permissions(NAVIGATION.establishment).every(isEstablishmentPermission),
    ).toBe(true)
    expect(permissions(NAVIGATION.platform)).toEqual([])
  })
})

describe('visibilite des entrees par permission', () => {
  const contexte = (
    servicePermissions: ServicePermission[],
  ): TenantContext => ({
    establishmentId: 'e',
    serviceId: 's',
    establishmentRole: 'MEMBER',
    servicePermissions,
    soignantId: null,
  })

  const visibles = (...permissions: ServicePermission[]) =>
    NAVIGATION.service
      .filter(
        (item) =>
          !item.permission || can(contexte(permissions), item.permission),
      )
      .map((item) => item.label)

  it("cache l'onglet Suivi sans suivi:read", () => {
    const labels = visibles('dashboard:read', 'agenda:read')
    expect(labels).toContain('Dashboard')
    expect(labels).not.toContain('Suivi')
  })

  it("ne montre qu'un ecran d'administration avec diagnostic-templates:write", () => {
    const admin = NAVIGATION.service
      .filter((item) => item.group === 'Administration')
      .map((item) => item.label)
    const ouverts = visibles('diagnostic-templates:write').filter((label) =>
      admin.includes(label),
    )
    expect(ouverts).toEqual(['Diagnostics éducatifs'])
  })

  it('ouvre Planning avec pathway-templates:write seul', () => {
    expect(visibles('pathway-templates:write')).toContain('Planning')
  })
})
