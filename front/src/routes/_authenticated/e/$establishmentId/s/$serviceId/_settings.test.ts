import { describe, expect, it } from 'vitest'

import type { User } from '@/types/auth.ts'
import { redirection } from '../../../../../../test/redirection.ts'
import { Route } from './_settings.tsx'

const membre = (permissions: string[]): User => ({
  id: 'u1',
  email: 'a@b.fr',
  firstName: null,
  lastName: null,
  isSuperAdmin: false,
  establishments: [
    {
      id: 'e1',
      name: 'CHU',
      role: 'MEMBER',
      services: [
        {
          id: 's1',
          name: 'Cardio',
          roleId: 'r1',
          roleName: 'Sur mesure',
          permissions,
        },
      ],
    },
  ],
})

const lancer = (permissions: string[]) =>
  (Route.options.beforeLoad as (a: unknown) => unknown)({
    context: {
      authState: { isAuthenticated: true, user: membre(permissions) },
    },
    params: { establishmentId: 'e1', serviceId: 's1' },
  })

describe('branche des reglages du service', () => {
  it.each(['service-members:manage', 'service-journal:read'])(
    'admet un role qui ne porte que %s',
    (permission) => {
      expect(() => lancer([permission])).not.toThrow()
    },
  )

  it('renvoie au tableau de bord un role sans ecran d administration', () => {
    expect(() => lancer(['agenda:read'])).toThrow(
      redirection({ to: '/e/$establishmentId/s/$serviceId/dashboard' }),
    )
  })
})
