import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store/useAuthStore.ts'
import { usePlanningStore } from '@/store/usePlanningStore.ts'
import { ctxRole } from '@/test/roles.ts'
import type { Patient } from '@/types/patient.ts'
import type { RolePreset } from '@/utils/permissions.ts'
import PlanningPatient from './planning.patient.tsx'

dayjs.extend(utc)

const jour = dayjs.utc().format('YYYY-MM-DD')
const creneau = {
  id: 'slot-1',
  startDate: `${jour}T09:00:00.000Z`,
  endDate: `${jour}T10:00:00.000Z`,
  locked: false,
  slotTemplate: {
    isIndividual: false,
    thematic: 'Rééducation',
    color: '#20b2aa',
    soignants: [{ id: 'so1', name: 'Kiné1' }],
  },
  appointments: [
    {
      id: 'apt-1',
      startDate: `${jour}T09:00:00.000Z`,
      endDate: `${jour}T10:00:00.000Z`,
      appointmentPatients: [{ id: 'ap1', patient: { id: 'p1' } }],
    },
  ],
}

const monter = (preset: RolePreset) => {
  useAuthStore.setState({
    isAuthenticated: true,
    context: {
      establishmentId: 'e1',
      serviceId: 's1',
      establishmentRole: 'MEMBER',
      ...ctxRole(preset),
      soignantId: null,
    },
  })
  usePlanningStore.setState({ viewStart: jour })
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = input.toString()
      const { pathname } = new URL(url)
      const body = pathname.endsWith('/slot') ? [creneau] : []
      return Promise.resolve({
        ok: true,
        status: 200,
        url,
        json: async () => body,
      })
    }),
  )
  const element = <PlanningPatient patient={{ id: 'p1' } as Patient} />
  const router = createRouter({
    routeTree: createRootRoute({ component: () => element }),
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
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('planning du patient', () => {
  it('propose la sélection groupée avec appointment:write', async () => {
    monter('COORDINATEUR')
    expect(
      await screen.findByRole('button', { name: /Tout sélectionner/ }),
    ).toBeInTheDocument()
  })

  it('ne propose pas la sélection groupée sans appointment:write', async () => {
    monter('LECTURE')
    expect(await screen.findByText('Kiné1')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Tout sélectionner/ }),
    ).toBeNull()
  })
})
