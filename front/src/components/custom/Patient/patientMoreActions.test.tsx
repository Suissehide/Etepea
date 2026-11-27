import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { useAuthStore } from '@/store/useAuthStore.ts'
import type { ServicePermission } from '@/utils/permissions.ts'
import { PatientMoreActions } from './patientMoreActions.tsx'

const monter = async (servicePermissions: ServicePermission[]) => {
  useAuthStore.setState({
    context: {
      establishmentId: 'e1',
      serviceId: 's1',
      establishmentRole: 'MEMBER',
      servicePermissions,
      soignantId: null,
    },
  })
  const rootRoute = createRootRoute({
    component: () => (
      <PatientMoreActions
        establishmentId="e1"
        serviceId="s1"
        patientID="p1"
        onDelete={() => undefined}
      />
    ),
  })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  const rendu = render(<RouterProvider router={router} />)
  await act(() => router.load())
  return rendu
}

describe('PatientMoreActions', () => {
  it('propose la suppression avec patient:delete', async () => {
    await monter(['patient:delete'])
    await userEvent.click(
      screen.getByRole('button', { name: "Plus d'actions" }),
    )
    expect(
      await screen.findByRole('button', { name: /supprimer le patient/i }),
    ).toBeInTheDocument()
  })

  it('cache la suppression sans patient:delete', async () => {
    await monter(['consultations:read'])
    await userEvent.click(
      screen.getByRole('button', { name: "Plus d'actions" }),
    )
    expect(
      await screen.findByRole('link', { name: /consultations du dossier/i }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/supprimer le patient/i)).toBeNull()
  })

  it('ne rend pas le menu sans aucune entree', async () => {
    const { container } = await monter(['patients:read'])
    expect(container).toBeEmptyDOMElement()
  })
})
