import { describe, expect, it } from 'vitest'

import { commonThematics } from './bulkThematicTypeForm.tsx'

const thematic = (id: string, soignantIds: string[]) => ({
  id,
  name: id,
  soignants: soignantIds.map((s) => ({ id: s, name: s })),
})

describe('commonThematics', () => {
  it('ne garde que les thématiques praticables sur chaque créneau', () => {
    const thematics = [
      thematic('gym', ['kine']),
      thematic('tabac', ['ide', 'medecin']),
    ]
    expect(commonThematics(thematics, [['ide'], ['medecin', 'kine']])).toEqual([
      thematics[1],
    ])
    expect(commonThematics(thematics, [['ide'], ['kine']])).toEqual([])
  })
})
