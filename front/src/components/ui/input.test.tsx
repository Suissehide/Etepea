import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { Input } from './input.tsx'

function Recherche() {
  const [value, setValue] = useState('')
  return (
    <Input
      aria-label="Recherche"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onClear={() => setValue('')}
    />
  )
}

describe('Input — onClear', () => {
  it('la croix apparaît avec du texte et vide le champ', async () => {
    render(<Recherche />)
    const champ = screen.getByLabelText('Recherche')
    expect(
      screen.queryByRole('button', { name: 'Effacer la recherche' }),
    ).not.toBeInTheDocument()

    await userEvent.type(champ, 'Dupont')
    await userEvent.click(
      screen.getByRole('button', { name: 'Effacer la recherche' }),
    )
    expect(champ).toHaveValue('')
    expect(
      screen.queryByRole('button', { name: 'Effacer la recherche' }),
    ).not.toBeInTheDocument()
  })
})
