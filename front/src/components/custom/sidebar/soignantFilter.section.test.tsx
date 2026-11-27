import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSoignantStore } from '@/store/useSoignantStore.ts'
import SoignantFilterSection from './soignantFilter.section.tsx'

const soignants = [
  { id: 'k1', name: 'Kiné 1', hidden: true },
  { id: 'k2', name: 'Kiné 2' },
]

beforeEach(() => {
  useSoignantStore.setState({ soignants, selectedSoignantIDs: [] })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: RequestInfo | URL) => ({
      ok: true,
      status: 200,
      url: url.toString(),
      json: async () => soignants,
    })),
  )
})

describe('filtre des soignants', () => {
  it('cache les soignants masqués sur la page Soignants', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SoignantFilterSection title={<p>Soignants</p>} />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Kiné 2')).toBeInTheDocument()
    expect(screen.queryByText('Kiné 1')).not.toBeInTheDocument()
  })
})
