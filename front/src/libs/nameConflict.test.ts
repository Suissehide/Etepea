import { describe, expect, it } from 'vitest'

import { findNameConflict, normalizeName } from './nameConflict.ts'

const actives = [{ id: 'a', name: 'Gym + Vélo' }]
const supprimees = [{ id: 's', name: 'AP' }]

describe('findNameConflict', () => {
  it('ignore la casse et les espaces autour', () => {
    expect(normalizeName('  Gym + VÉLO ')).toBe('gym + vélo')
    expect(findNameConflict(' gym + vélo', actives, supprimees)).toEqual({
      kind: 'active',
      item: actives[0],
    })
  })

  it('signale une supprimée', () => {
    expect(findNameConflict('ap', actives, supprimees)?.kind).toBe('archived')
  })

  it('un nom libre ou vide ne bloque rien', () => {
    expect(findNameConflict('Sommeil', actives, supprimees)).toBeNull()
    expect(findNameConflict('   ', actives, supprimees)).toBeNull()
  })

  it("l'élément lui-même ne compte pas (renommage)", () => {
    expect(findNameConflict('Gym + vélo', actives, supprimees, 'a')).toBeNull()
  })

  it('une active passe avant une supprimée du même nom', () => {
    const doublon = [{ id: 'x', name: 'gym + vélo' }]
    expect(findNameConflict('Gym + Vélo', actives, doublon)?.item.id).toBe('a')
  })
})
