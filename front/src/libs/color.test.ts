import { describe, expect, it } from 'vitest'

import { contrastRatio, readableTint, tintOnWhite } from './color.ts'

describe('contrastRatio', () => {
  it('vaut 21 entre noir et blanc, 1 entre deux couleurs égales', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21)
    expect(contrastRatio('#3f8f3f', '#3f8f3f')).toBeCloseTo(1)
  })
})

describe('tintOnWhite', () => {
  it('mélange la couleur au blanc', () => {
    expect(tintOnWhite('#000000', 0.5)).toBe('#808080')
    expect(tintOnWhite('#3f8f3f', 0)).toBe('#ffffff')
  })
})

describe('readableTint', () => {
  it('garde la couleur assombrie quand elle reste lisible', () => {
    expect(readableTint('#3f8f3f', 0.14)).toBe('#2c642c')
  })

  it('repasse au texte sombre pour une couleur trop claire', () => {
    expect(readableTint('#facc15', 0.14)).toBe('#1f2937')
    expect(readableTint('#94a3b8', 0.14)).toBe('#1f2937')
  })
})
