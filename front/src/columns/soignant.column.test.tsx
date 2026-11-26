import type { CellContext } from '@tanstack/react-table'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { Features } from '../components/table/features.ts'
import type { Soignant } from '../types/soignant.ts'
import { getSoignantColumns } from './soignant.column.tsx'

vi.mock('../components/custom/popup/editSoignantAccountsForm.tsx', () => ({
  default: () => <button type="button">Comptes</button>,
  nomDuCompte: () => '',
}))
vi.mock('../components/custom/popup/editSoignantThematicsForm.tsx', () => ({
  default: () => <button type="button">Thématiques</button>,
}))
vi.mock('../components/custom/popup/archiveSoignantForm.tsx', () => ({
  default: () => <button type="button">Supprimer</button>,
}))

const actions = (canLinkAccounts: boolean) => {
  const column = getSoignantColumns({
    onRestore: vi.fn(),
    onDeleteForever: vi.fn(),
    onToggleActive: vi.fn(),
    onToggleHidden: vi.fn(),
    archived: false,
    thematics: [],
    thematicOptions: [],
    members: [],
    canManage: true,
    canLinkAccounts,
    roles: [],
    onChangeDefaultRole: vi.fn(),
  }).find((c) => c.id === 'actions')
  if (!column?.cell) {
    throw new Error('colonne actions introuvable')
  }
  const cell = column.cell as (
    context: CellContext<Features, Soignant, unknown>,
  ) => React.ReactNode
  return cell({ row: { original: { id: 's1', name: 'Léa' } } } as never)
}

describe('colonne Actions du soignant', () => {
  it('cache le rattachement des comptes sans service-members:manage', () => {
    render(actions(false))
    expect(screen.queryByText('Comptes')).toBeNull()
    expect(screen.getByText('Thématiques')).toBeTruthy()
  })

  it('le montre avec service-members:manage', () => {
    render(actions(true))
    expect(screen.getByText('Comptes')).toBeTruthy()
  })
})
