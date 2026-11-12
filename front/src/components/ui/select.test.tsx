import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Select } from './select.tsx'

const options = Array.from({ length: 120 }, (_, i) => ({
  value: `p${i}`,
  label: `Patient ${i}`,
}))

describe('Select recherchable avec maxResults', () => {
  it("n'affiche que les premiers resultats et compte le reste", async () => {
    render(<Select searchable maxResults={50} options={options} />)
    fireEvent.click(screen.getByRole('button'))
    expect(await screen.findAllByText(/^Patient \d+$/)).toHaveLength(50)
    expect(
      screen.getByText('70 autres résultats, affinez la recherche'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Rechercher...'), {
      target: { value: 'Patient 11' },
    })
    expect(screen.getAllByText(/^Patient \d+$/)).toHaveLength(11)
    expect(screen.queryByText(/autres résultats/)).not.toBeInTheDocument()
  })
})
