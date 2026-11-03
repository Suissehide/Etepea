import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { PathwayTemplate } from '../../../types/pathwayTemplate.ts'
import PathwayFilter from './pathwayFilter.tsx'

const templates = [
  { id: 'a', name: 'A', color: '#000', firstAppointmentOnly: false },
  { id: 'b', name: 'B', color: '#000', firstAppointmentOnly: true },
] as PathwayTemplate[]

const rendre = (hiddenIds: string[]) =>
  render(
    <PathwayFilter
      templates={templates}
      hiddenIds={new Set(hiddenIds)}
      onToggle={() => undefined}
      onReset={() => undefined}
      onHideAll={() => undefined}
    />,
  )

describe('PathwayFilter', () => {
  it('sans filtre, pas de compteur', () => {
    rendre([])
    expect(screen.getByRole('button', { name: 'Parcours' })).toBeTruthy()
  })

  it('filtre actif : compte les parcours visibles, zéro compris', () => {
    const { unmount } = rendre(['a'])
    expect(
      screen.getByRole('button', { name: 'Parcours, 2 affichés sur 3' }),
    ).toBeTruthy()
    unmount()
    rendre(['a', 'b', '__no_pathway__'])
    expect(
      screen.getByRole('button', { name: 'Parcours, 0 affiché sur 3' }),
    ).toBeTruthy()
  })
})
