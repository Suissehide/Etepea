import { describe, expect, it } from 'vitest'

import { SERVICE_PERMISSION_KEYS } from '../utils/permissions.ts'
import {
  allRows,
  changedRows,
  type LevelRow,
  levelOf,
  rowKeys,
  withLevel,
} from './roleLayout.ts'

const membres = allRows().find(
  (r) => r.label === 'Membres du service',
) as LevelRow

describe('ROLE_LAYOUT', () => {
  it('place chaque droit du catalogue une fois et une seule', () => {
    const keys = allRows().flatMap(rowKeys)
    expect([...keys].sort()).toEqual([...SERVICE_PERMISSION_KEYS].sort())
  })
})

describe('niveaux', () => {
  it('« Gérer » accorde aussi « Voir »', () => {
    expect(withLevel(membres, ['agenda:read'], 'Gérer')).toEqual([
      'agenda:read',
      'members:read',
      'service-members:manage',
    ])
  })

  it('redescendre retire le droit le plus fort, « Aucun » retire tout', () => {
    const tout = ['members:read', 'service-members:manage']
    expect(withLevel(membres, tout, 'Voir')).toEqual(['members:read'])
    expect(withLevel(membres, tout, 'Aucun')).toEqual([])
  })

  it('lit le niveau sur la clé la plus forte détenue', () => {
    expect(levelOf(membres, [])).toBe('Aucun')
    expect(levelOf(membres, ['members:read'])).toBe('Voir')
    expect(levelOf(membres, ['service-members:manage'])).toBe('Gérer')
  })

  it('liste les lignes modifiées', () => {
    expect(
      changedRows(['pdf:export'], ['stats:read']).map((r) => r.label),
    ).toEqual(['Exporter en PDF', 'Indicateurs'])
  })
})
