import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { InboxApi } from '@/api/inbox.api.ts'
import { PlanningRestoreApi } from '@/api/planningRestore.api.ts'
import type { InboxNotification, InboxService } from '@/queries/useInbox.ts'
import type { NotificationType } from '@/types/task.ts'
import { NotificationsPanel } from './notificationsPanel.tsx'

vi.mock('@/api/inbox.api.ts', () => ({
  InboxApi: {
    members: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}))

const service: InboxService = {
  establishmentId: 'e1',
  serviceId: 's1',
  name: 'Cardio',
  canTasks: true,
  canWriteTasks: true,
  soignantId: null,
}

const notif = (
  id: string,
  type: NotificationType,
  payload: Record<string, unknown>,
): InboxNotification => ({
  id,
  type,
  payload,
  readAt: null,
  createdAt: new Date().toISOString(),
  service,
})

// Le lien « Préférences » exige un `RouterProvider` ; la page de reglages prouve la navigation et son ancre.
const renderPanel = async (ui: ReactNode) => {
  const rootRoute = createRootRoute({ component: Outlet })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <>{ui}</>,
  })
  const settingsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/user/notifications',
    component: () => <div>Preferences de notification</div>,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, settingsRoute]),
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

describe('NotificationsPanel', () => {
  beforeEach(() => {
    vi.mocked(InboxApi.members).mockReset().mockResolvedValue([])
    vi.mocked(InboxApi.markRead).mockReset().mockResolvedValue(undefined)
    vi.mocked(InboxApi.markAllRead).mockReset().mockResolvedValue(undefined)
  })

  it('un type inconnu ne plante pas le panneau, les autres lignes restent affichees', async () => {
    const notifications = [
      notif('n1', 'INCONNU' as NotificationType, { foo: 'bar' }),
      notif('n2', 'TASK_DUE', { taskId: 't1', text: 'Appeler le labo' }),
    ]
    await renderPanel(
      <NotificationsPanel
        services={[service]}
        notifications={notifications}
        onOpenNotification={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(await screen.findByText(/Appeler le labo/)).toBeInTheDocument()
    expect(screen.getByText(/^Notification ·/)).toBeInTheDocument()
  })

  it('le lien Preferences navigue vers /user/notifications et ferme le panneau', async () => {
    const u = userEvent.setup()
    const onClose = vi.fn()
    const router = await renderPanel(
      <NotificationsPanel
        services={[service]}
        notifications={[]}
        onOpenNotification={vi.fn()}
        onClose={onClose}
      />,
    )
    await u.click(screen.getByRole('link', { name: 'Préférences' }))
    expect(
      await screen.findByText('Preferences de notification'),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/user/notifications')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('une suppression du planning propose Restaurer, une modification Voir le planning', async () => {
    const planning = (id: string, action: string) =>
      notif(id, 'PLANNING_CHANGED', {
        actorId: 'u1',
        activityLogId: `log-${id}`,
        action,
        entityType: 'slot',
        detail: 'Atelier',
      })
    await renderPanel(
      <NotificationsPanel
        services={[service]}
        notifications={[
          planning('p1', 'planning.deleted'),
          planning('p2', 'planning.updated'),
        ]}
        onOpenNotification={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(
      await screen.findByRole('button', { name: 'Restaurer' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Voir le planning')).toBeInTheDocument()
  })

  it('Restaurer appelle la route du service de la notification puis marque lue', async () => {
    const restore = vi
      .spyOn(PlanningRestoreApi, 'restore')
      .mockResolvedValue(undefined)
    const u = userEvent.setup()
    const onOpen = vi.fn()
    await renderPanel(
      <NotificationsPanel
        services={[service]}
        notifications={[
          notif('p1', 'PLANNING_CHANGED', {
            actorId: 'u1',
            activityLogId: 'log-1',
            action: 'planning.deleted',
            entityType: 'slot',
            detail: 'Atelier',
          }),
        ]}
        onOpenNotification={onOpen}
        onClose={vi.fn()}
      />,
    )
    await u.click(await screen.findByRole('button', { name: 'Restaurer' }))
    expect(restore).toHaveBeenCalledWith(
      expect.objectContaining({ establishmentId: 'e1', serviceId: 's1' }),
      'log-1',
    )
    await vi.waitFor(() => expect(InboxApi.markRead).toHaveBeenCalled())
    expect(onOpen).not.toHaveBeenCalled()
  })
})
