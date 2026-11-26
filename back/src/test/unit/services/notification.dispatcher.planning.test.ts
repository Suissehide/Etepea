import { NotificationDispatcher } from '../../../main/services/notification.dispatcher'
import type { IocContainer } from '../../../main/types/application/ioc'

// La clé de regroupement horaire porte le service : un auteur actif dans deux services prévient deux fois.
describe('NotificationDispatcher.planningChanged, clé de regroupement', () => {
  const build = (serviceId: string) => {
    const createMany = jest.fn()
    const dispatcher = new NotificationDispatcher({
      membershipRepository: { findActiveAdminUserIds: async () => ['a', 'me'] },
      userRepository: { findNotificationPrefsMany: async () => new Map() },
      notificationRepository: { createMany },
      tenantContext: { scope: () => ({ serviceId, establishmentId: 'e' }) },
      logger: { error: jest.fn() },
    } as unknown as IocContainer)
    return { dispatcher, createMany }
  }
  const input = (action: 'planning.updated' | 'planning.deleted') => ({
    actorId: 'me',
    activityLogId: 'l',
    action,
    entityType: 'slot' as const,
    detail: null,
  })
  const attendre = () => new Promise((r) => setTimeout(r, 20))

  it("inclut le service, exclut l'auteur, et n'en met pas pour une suppression", async () => {
    const un = build('s1')
    un.dispatcher.planningChanged(input('planning.updated'))
    const deux = build('s2')
    deux.dispatcher.planningChanged(input('planning.deleted'))
    await attendre()
    const [rows] = un.createMany.mock.calls[0]
    expect(rows).toHaveLength(1)
    expect(rows[0].userId).toBe('a')
    expect(rows[0].dedupeKey).toMatch(
      /^planning:s1:me:\d{4}-\d{2}-\d{2}T\d{2}$/,
    )
    expect(deux.createMany.mock.calls[0][0][0].dedupeKey).toBeUndefined()
  })
})
