import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PlanningRestoreApi } from '@/api/planningRestore.api.ts'
import { useAuthStore } from '@/store/useAuthStore.ts'
import { ctxRole } from '@/test/roles.ts'
import type { ActivityLog } from '@/types/activityLog.ts'
import { JournalActivite } from './journalActivite.tsx'

dayjs.extend(utc)

// Le virtualiseur ne mesure rien sous jsdom : on rend toutes les lignes.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (options: { count: number; estimateSize: () => number }) => ({
    getVirtualItems: () =>
      Array.from({ length: options.count }, (_, index) => ({
        index,
        start: index * options.estimateSize(),
        end: (index + 1) * options.estimateSize(),
        size: options.estimateSize(),
      })),
    getTotalSize: () => options.count * options.estimateSize(),
    scrollToIndex: () => undefined,
    measure: () => undefined,
    measureElement: () => undefined,
  }),
}))

vi.mock('@tanstack/react-router', async (original) => ({
  ...(await original<typeof import('@tanstack/react-router')>()),
  useParams: () => ({ establishmentId: 'e1', serviceId: 's1' }),
  Link: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}))

vi.mock('@/components/dashboard.layout.tsx', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const ligne = (id: string, action: string, restoredAt: string | null) =>
  ({
    id,
    userID: 'u1',
    userFirstName: 'Ada',
    userLastName: 'L',
    serviceId: 's2',
    action,
    entityType: 'slot',
    entityID: `x-${id}`,
    detail: null,
    createdAt: '2026-11-26T10:00:00.000Z',
    restoredAt,
  }) as ActivityLog

const reponse = vi.hoisted(() => ({ value: null as unknown }))

vi.mock('@/queries/useActivityLog.ts', () => ({
  useActivityLogsQuery: () => ({ isPending: false, data: reponse.value }),
}))

reponse.value = {
  total: 3,
  page: 1,
  data: [
    ligne('a', 'planning.deleted', null),
    ligne('b', 'planning.deleted', '2026-11-26T11:00:00.000Z'),
    ligne('c', 'planning.updated', null),
  ],
}

const renderJournal = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <JournalActivite services={[{ id: 's2', name: 'Cardio' } as never]} />
    </QueryClientProvider>,
  )

describe('JournalActivite, restauration', () => {
  beforeEach(() => {
    useAuthStore.setState({
      context: {
        establishmentId: 'e1',
        serviceId: null,
        establishmentRole: 'ADMIN',
        servicePermissions: null,
        soignantId: null,
      },
    })
    vi.spyOn(PlanningRestoreApi, 'restore').mockResolvedValue(undefined)
  })

  it('propose Restaurer sur la seule suppression non restauree', async () => {
    renderJournal()
    expect(
      await screen.findAllByRole('button', { name: 'Restaurer' }),
    ).toHaveLength(1)
  })

  it('restaure avec le service de la ligne', async () => {
    renderJournal()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Restaurer' }),
    )
    expect(PlanningRestoreApi.restore).toHaveBeenCalledWith(
      { establishmentId: 'e1', serviceId: 's2' },
      'a',
    )
  })

  it('masque Restaurer sans planning:write', async () => {
    useAuthStore.setState({
      context: {
        establishmentId: 'e1',
        serviceId: 's1',
        establishmentRole: 'MEMBER',
        ...ctxRole('INTERVENANT'),
        soignantId: null,
      },
    })
    renderJournal()
    await screen.findAllByText('Planning : suppression')
    expect(screen.queryByRole('button', { name: 'Restaurer' })).toBeNull()
  })
})
