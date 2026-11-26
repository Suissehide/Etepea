import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store/useAuthStore.ts'
import { ctxRole } from '@/test/roles.ts'
import AppointmentSheet from './appointmentSheet.tsx'

const rendezVous = {
  id: 'apt-1',
  startDate: '2026-11-26T09:00:00.000Z',
  endDate: '2026-11-26T10:00:00.000Z',
  thematicId: null,
  type: 'individual',
  slot: {
    id: 'slot-1',
    slotTemplate: { id: 'st1', isIndividual: false, capacity: 4 },
  },
  appointmentPatients: [
    {
      id: 'ap1',
      status: 'yes',
      transmissionNotes: 'Bonne séance',
      convocationSent: true,
      patient: { id: 'p1', firstName: 'Sabrina', lastName: 'Bernadet' },
    },
  ],
}

const monter = async () => {
  useAuthStore.setState({
    isAuthenticated: true,
    context: {
      establishmentId: 'e1',
      serviceId: 's1',
      establishmentRole: 'MEMBER',
      ...ctxRole('LECTURE'),
      soignantId: null,
    },
  })
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = input.toString()
      const body = new URL(url).pathname.endsWith('/appointment/apt-1')
        ? rendezVous
        : []
      return Promise.resolve({
        ok: true,
        status: 200,
        url,
        json: async () => body,
      })
    }),
  )
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <AppointmentSheet open setOpen={() => undefined} eventID="apt-1" />
      ),
    }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await act(() => router.load())
  return router
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fiche rendez-vous sans appointment:write', () => {
  it('se lit : la ligne se déplie et mène au patient, sans geste d écriture', async () => {
    const router = await monter()
    const ligne = await screen.findByRole('button', {
      name: /Bernadet Sabrina/,
    })
    expect(ligne).toBeEnabled()
    await userEvent.click(ligne)
    expect(await screen.findByLabelText('Notes de transmission')).toHaveValue(
      'Bonne séance',
    )
    expect(screen.getByLabelText('Notes de transmission')).toBeDisabled()

    expect(
      screen.queryByRole('button', { name: 'Retirer le patient' }),
    ).toBeNull()
    expect(screen.queryByRole('button', { name: 'Mettre à jour' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Supprimer' })).toBeNull()
    expect(screen.queryByText('Ajouter des patients')).toBeNull()
    expect(screen.getByLabelText('Convocation envoyée')).toBeDisabled()

    await userEvent.click(
      screen.getByRole('button', { name: 'Voir le patient' }),
    )
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/patient/p1'),
    )
  })
})
