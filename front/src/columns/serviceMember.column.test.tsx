import type { CellContext } from '@tanstack/react-table'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { Features } from '../components/table/features.ts'
import type { ServiceMember } from '../types/serviceMember.ts'
import type { Soignant } from '../types/soignant.ts'
import { getServiceMemberColumns } from './serviceMember.column.tsx'

vi.mock('../components/custom/popup/editServiceMemberForm.tsx', () => ({
  default: () => null,
}))

const membre = (soignantId: string | null): ServiceMember => ({
  id: 'm1',
  role: { id: 'r-inter', name: 'Intervenant' },
  soignantId,
  canTasks: false,
  user: {
    id: 'u1',
    email: 'a@b.fr',
    firstName: null,
    lastName: null,
    deactivatedAt: null,
    invitationStatus: null,
    invitationResendableAt: null,
  },
})

const rendreRole = (
  m: ServiceMember,
  soignants: Soignant[],
  {
    soiMeme,
    attribuable = true,
  }: { soiMeme?: string; attribuable?: boolean } = {},
) => {
  const onApplyDefaultRole = vi.fn()
  const colonne = getServiceMemberColumns({
    soignants,
    avecIdentifiant: false,
    soiMeme,
    onRemove: vi.fn(),
    onApplyDefaultRole,
    attribuable: () => attribuable,
  }).find((c) => c.id === 'role')
  const cell = colonne?.cell as (
    c: CellContext<Features, ServiceMember, unknown>,
  ) => React.ReactNode
  render(cell({ row: { original: m } } as never))
  return onApplyDefaultRole
}

describe('colonne Rôle des membres du service', () => {
  it('signale un rôle différent de celui du soignant et propose de l’appliquer', () => {
    const appliquer = rendreRole(membre('s1'), [
      { id: 's1', name: 'IDE SMCP', defaultRoleId: 'r-equipe' },
    ])
    expect(screen.getByText('Rôle différent de IDE SMCP')).toBeTruthy()
    screen.getByRole('button', { name: 'Appliquer le rôle par défaut' }).click()
    expect(appliquer).toHaveBeenCalledWith(expect.anything(), 'r-equipe')
  })

  it('n’affiche rien quand les rôles concordent', () => {
    rendreRole(membre('s1'), [
      { id: 's1', name: 'IDE SMCP', defaultRoleId: 'r-inter' },
    ])
    expect(screen.queryByText(/Rôle différent/)).toBeNull()
  })

  it('n’affiche rien sans rôle par défaut ni sans soignant', () => {
    rendreRole(membre('s1'), [{ id: 's1', name: 'IDE', defaultRoleId: null }])
    expect(screen.queryByText(/Rôle différent/)).toBeNull()
    rendreRole(membre(null), [])
    expect(screen.queryByText(/Rôle différent/)).toBeNull()
  })

  it.each([
    ['sur sa propre ligne', { soiMeme: 'u1' }],
    ['pour un rôle hors de ses droits', { attribuable: false }],
  ])('ne propose pas d’appliquer le rôle par défaut %s', (_, options) => {
    rendreRole(
      membre('s1'),
      [{ id: 's1', name: 'IDE SMCP', defaultRoleId: 'r-equipe' }],
      options,
    )
    expect(screen.getByText('Rôle différent de IDE SMCP')).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Appliquer le rôle par défaut' }),
    ).toBeNull()
  })
})
