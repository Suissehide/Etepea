import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store/useAuthStore.ts'
import { useSoignantStore } from '@/store/useSoignantStore.ts'
import SoignantFilterSection from './soignantFilter.section.tsx'

const soignants = [
  { id: 'k1', name: 'Kiné 1' },
  { id: 'k2', name: 'Kiné 2' },
]

const monter = (appliquerMasquesDuRole: boolean) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: RequestInfo | URL) => ({
      ok: true,
      status: 200,
      url: url.toString(),
      json: async () => soignants,
    })),
  )
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SoignantFilterSection
        title={<p>Soignants</p>}
        appliquerMasquesDuRole={appliquerMasquesDuRole}
      />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  useSoignantStore.setState({ soignants, selectedSoignantIDs: [] })
  useAuthStore.setState({
    context: {
      establishmentId: 'e1',
      serviceId: 's1',
      establishmentRole: 'MEMBER',
      servicePermissions: null,
      hiddenSoignantIds: ['k1'],
      soignantId: null,
    },
  })
})

describe('filtre des soignants', () => {
  it('masque ceux du rôle au Dashboard et laisse les autres', async () => {
    monter(true)
    expect(await screen.findByText('Kiné 2')).toBeInTheDocument()
    expect(screen.queryByText('Kiné 1')).not.toBeInTheDocument()
  })

  it('garde tout le monde ailleurs (Agenda)', async () => {
    monter(false)
    expect(await screen.findByText('Kiné 1')).toBeInTheDocument()
    expect(screen.getByText('Kiné 2')).toBeInTheDocument()
  })
})
