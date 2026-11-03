import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthApi } from '@/api/auth.api.ts'
import { ServiceMembersApi } from '@/api/serviceMembers.api.ts'
import { SoignantApi } from '@/api/soignant.api.ts'
import { type Affectation, MesSoignants } from './mesSoignants.tsx'

vi.mock('@/api/serviceMembers.api.ts', () => ({
  ServiceMembersApi: { setOwnSoignant: vi.fn() },
}))
vi.mock('@/api/auth.api.ts', () => ({ AuthApi: { me: vi.fn() } }))
vi.mock('@/api/soignant.api.ts', () => ({ SoignantApi: { getAll: vi.fn() } }))
const toast = vi.fn()
vi.mock('@/hooks/useToast.ts', () => ({ useToast: () => ({ toast }) }))

const aff = (
  establishmentId: string,
  serviceId: string,
  role: Affectation['role'] = 'INTERVENANT',
): Affectation => ({
  establishmentId,
  establishmentName: `Etab ${establishmentId}`,
  serviceId,
  serviceName: `Service ${serviceId}`,
  role,
  soignantId: null,
})

const monter = (affectations: Affectation[]) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MesSoignants affectations={affectations} user={null} />
    </QueryClientProvider>,
  )

const choisir = async (serviceName: string, soignant: string) => {
  const u = userEvent.setup()
  await u.click(screen.getByLabelText(`Mon métier dans ${serviceName}`))
  await u.click(await screen.findByText(soignant))
}

describe('MesSoignants', () => {
  beforeEach(() => {
    toast.mockReset()
    vi.mocked(SoignantApi.getAll).mockResolvedValue([
      { id: 'med', name: 'Médecin' },
    ] as Awaited<ReturnType<typeof SoignantApi.getAll>>)
    vi.mocked(AuthApi.me)
      .mockReset()
      .mockResolvedValue({} as never)
    vi.mocked(ServiceMembersApi.setOwnSoignant)
      .mockReset()
      .mockResolvedValue({} as never)
  })

  it('groupe par établissement dans l ordre, avec le nombre de services', () => {
    monter([aff('b', 's1'), aff('a', 's2'), aff('b', 's3')])
    const groupes = screen.getAllByRole('region')
    expect(groupes.map((g) => g.getAttribute('aria-label'))).toEqual([
      'Etab b',
      'Etab a',
    ])
    expect(within(groupes[0]).getByText('2 services')).toBeInTheDocument()
    expect(within(groupes[1]).getByText('1 service')).toBeInTheDocument()
  })

  it('l accès est une pastille en lecture seule, sans bouton Enregistrer', () => {
    monter([aff('a', 's1', 'COORDINATEUR')])
    expect(screen.getByText('Coordinateur')).toHaveAttribute(
      'title',
      'Attribué par un administrateur',
    )
    expect(screen.queryByRole('button', { name: /Enregistrer/ })).toBeNull()
  })

  it('changer de métier enregistre aussitôt et affiche la coche', async () => {
    monter([aff('a', 's1')])
    await choisir('Service s1', 'Médecin')
    expect(ServiceMembersApi.setOwnSoignant).toHaveBeenCalledWith({
      establishmentId: 'a',
      serviceId: 's1',
      soignantId: 'med',
    })
    expect(await screen.findByLabelText('Enregistré')).toBeInTheDocument()
  })

  it('en cas d échec, l ancienne valeur revient et un toast s affiche', async () => {
    vi.mocked(ServiceMembersApi.setOwnSoignant).mockRejectedValue(
      new Error('refus'),
    )
    monter([aff('a', 's1')])
    await choisir('Service s1', 'Médecin')
    await waitFor(() => expect(toast).toHaveBeenCalled())
    expect(
      screen.getByLabelText('Mon métier dans Service s1'),
    ).toHaveTextContent('Choisir mon métier…')
  })

  it('rien sans affectation', () => {
    const { container } = monter([])
    expect(container).toBeEmptyDOMElement()
  })
})
