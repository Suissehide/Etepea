import { describe, expect, it } from 'vitest'

import type { User } from '@/types/auth.ts'
import { dailyTabGuard } from './tab-guard.ts'

const params = { establishmentId: 'e', serviceId: 's' }

const contextFor = (permissions: string[]) => ({
  authState: {
    isAuthenticated: true,
    user: {
      id: 'u',
      email: 'u@t.fr',
      firstName: null,
      lastName: null,
      isSuperAdmin: false,
      establishments: [
        {
          id: 'e',
          name: 'E',
          role: 'MEMBER',
          services: [
            {
              id: 's',
              name: 'S',
              roleId: 'r',
              roleName: 'R',
              permissions,
            },
          ],
        },
      ],
    } as User,
  },
})

const redirectedTo = (permissions: string[]) => {
  try {
    dailyTabGuard('dashboard:read')({
      context: contextFor(permissions),
      params,
    })
  } catch (e) {
    return (e as { options: { to: string } }).options.to
  }
  return null
}

describe('dailyTabGuard', () => {
  it('laisse passer qui détient la clé', () => {
    expect(redirectedTo(['dashboard:read'])).toBeNull()
  })

  it('renvoie vers le premier onglet ouvert', () => {
    expect(redirectedTo(['suivi:read', 'patients:read'])).toBe(
      '/e/$establishmentId/s/$serviceId/patient',
    )
  })

  it('renvoie vers un écran d administration sans onglet du quotidien', () => {
    expect(redirectedTo(['planning:read', 'thematics:write'])).toBe(
      '/e/$establishmentId/s/$serviceId/thematic',
    )
  })

  it('renvoie au choix de contexte sans aucun écran', () => {
    expect(redirectedTo(['planning:read'])).toBe('/choose-context')
  })
})
