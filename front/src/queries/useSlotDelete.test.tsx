import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SlotApi } from '@/api/slot.api.ts'
import { useAuthStore } from '@/store/useAuthStore.ts'
import type { Slot } from '@/types/slot.ts'
import { useSlotMutations, useSlotsInRangeQuery } from './useSlot.ts'

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const range = { from: '2026-01-05', to: '2026-01-12' }

describe('deleteSlot en lot', () => {
  let serveur: string[]
  const fins = new Map<string, () => void>()

  beforeEach(() => {
    useAuthStore.setState({
      context: {
        establishmentId: 'e1',
        serviceId: 's1',
        establishmentRole: 'ADMIN',
        serviceRole: 'COORDINATEUR',
        soignantId: null,
      },
    })
    serveur = ['a', 'b']
    fins.clear()
    vi.spyOn(SlotApi, 'getAll').mockImplementation(() =>
      Promise.resolve(serveur.map((id) => ({ id }) as Slot)),
    )
    vi.spyOn(SlotApi, 'delete').mockImplementation(
      (id) =>
        new Promise((resolve) => {
          fins.set(id, () => {
            serveur = serveur.filter((s) => s !== id)
            resolve(undefined as never)
          })
        }),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ne fait pas revenir un creneau dont la suppression est encore en cours', async () => {
    const { result } = renderHook(
      () => ({
        mutations: useSlotMutations(),
        query: useSlotsInRangeQuery(range),
      }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.query.slots).toHaveLength(2))

    act(() => {
      result.current.mutations.deleteSlot.mutate('a')
      result.current.mutations.deleteSlot.mutate('b')
    })
    await waitFor(() => expect(fins.size).toBe(2))
    expect(result.current.query.slots).toEqual([])

    const lectures = vi.mocked(SlotApi.getAll).mock.calls.length
    await act(async () => {
      fins.get('a')?.()
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    // « b » existe encore côté serveur : relire maintenant le ferait réapparaître.
    expect(vi.mocked(SlotApi.getAll).mock.calls.length).toBe(lectures)
    expect(result.current.query.slots).toEqual([])

    await act(async () => {
      fins.get('b')?.()
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(vi.mocked(SlotApi.getAll).mock.calls.length).toBe(lectures + 1)
    expect(result.current.query.slots).toEqual([])
  })
})
