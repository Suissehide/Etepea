import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AnyRoute } from '@tanstack/react-router'
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store/useAuthStore.ts'
import { useToastStore } from '@/store/useToastStore.ts'
import { svcRole } from '@/test/roles.ts'
import type { AuthState, User } from '@/types/auth.ts'
import type { Role } from '@/types/role.ts'
import { DEFAULT_ROLE_PERMISSIONS } from '@/utils/permissions.ts'
import { Route as serviceLayoutRoute } from '../../$serviceId.tsx'
import { Route as rolesRoute } from './roles.tsx'

dayjs.extend(utc)

const optionsDe = (route: AnyRoute) => route.options

const user: User = {
  id: 'u1',
  email: 'u1@b.fr',
  firstName: null,
  lastName: null,
  isSuperAdmin: false,
  establishments: [
    {
      id: 'e1',
      name: 'CHU',
      role: 'ADMIN',
      services: [{ id: 's1', name: 'Cardio', ...svcRole('COORDINATEUR') }],
    },
  ],
}

const rootRoute = createRootRouteWithContext<{ authState: AuthState }>()({
  component: () => <Outlet />,
})
const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '/_authenticated',
  component: () => <Outlet />,
})
const serviceRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: 'e/$establishmentId/s/$serviceId',
  beforeLoad: optionsDe(serviceLayoutRoute).beforeLoad,
  remountDeps: optionsDe(serviceLayoutRoute).remountDeps,
  component: () => <Outlet />,
})
const ecranRoute = createRoute({
  getParentRoute: () => serviceRoute,
  path: 'roles',
  beforeLoad: optionsDe(rolesRoute).beforeLoad,
  component: optionsDe(rolesRoute).component,
})
const routeTree = rootRoute.addChildren([
  authenticatedRoute.addChildren([serviceRoute.addChildren([ecranRoute])]),
])

const role = (id: string, name: string, rest: Partial<Role> = {}): Role => ({
  id,
  name,
  preset: null,
  permissions: [...DEFAULT_ROLE_PERMISSIONS.LECTURE],
  hiddenSoignantIds: [],
  memberCount: 0,
  archivedAt: null,
  ...rest,
})

const actifs = [
  role('r1', 'Coordinateur', { memberCount: 2 }),
  role('r2', 'Lecture seule'),
]
const supprimes = [role('r3', 'Ancien rôle', { archivedAt: '2026-11-01' })]
const soignants = [
  { id: 'k1', name: 'Kiné 1' },
  { id: 'k2', name: 'Kiné 2' },
]

type Appel = { url: string; method: string; body: unknown }

const reponse = (
  method: string,
  pathname: string,
  searchParams: URLSearchParams,
  body: { name?: string } | undefined,
  liste: Role[],
) => {
  if (method === 'POST' && pathname.endsWith('/roles')) {
    const cree = role(`cree-${liste.length}`, body?.name ?? '')
    liste.push(cree)
    return cree
  }
  if (method !== 'GET') {
    return {}
  }
  if (pathname.endsWith('/soignant')) {
    return soignants
  }
  if (!pathname.endsWith('/roles')) {
    return []
  }
  return searchParams.get('archived') === 'true' ? supprimes : [...liste]
}

// `listeFigee` : la liste relue ne contient pas encore le rôle créé.
const monter = (listeFigee = false) => {
  const appels: Appel[] = []
  const liste = [...actifs]
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString()
      const method = init?.method ?? 'GET'
      const { pathname, searchParams } = new URL(url)
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      appels.push({ url, method, body })
      const data = reponse(
        method,
        pathname,
        searchParams,
        body,
        listeFigee ? [...liste] : liste,
      )
      return Promise.resolve({
        ok: true,
        status: 200,
        url,
        json: async () => data,
      })
    }),
  )
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/e/e1/s/s1/roles'] }),
    context: { authState: { isAuthenticated: true, user } },
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
  return appels
}

const ecritures = (appels: Appel[]) => appels.filter((a) => a.method !== 'GET')

beforeEach(() => {
  useToastStore.setState({ toasts: [] })
  useAuthStore.setState({
    isAuthenticated: true,
    user,
    context: {
      establishmentId: 'e1',
      serviceId: 's1',
      establishmentRole: 'ADMIN',
      servicePermissions: null,
      hiddenSoignantIds: [],
      soignantId: null,
    },
  })
})

describe('écran Rôles', () => {
  it('liste les rôles avec leur nombre de membres', async () => {
    monter()
    expect(await screen.findByText('2 membres')).toBeInTheDocument()
    expect(screen.getByText('Lecture seule')).toBeInTheDocument()
  })

  it('coche une permission et enregistre', async () => {
    const appels = monter()
    await userEvent.click(await screen.findByText('Lecture seule'))
    await userEvent.click(await screen.findByLabelText('Ajouter un patient'))
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(ecritures(appels)).toHaveLength(1))
    const [ecriture] = ecritures(appels)
    expect(ecriture.method).toBe('PATCH')
    expect(ecriture.url).toContain('/roles/r2')
    expect(ecriture.body).toMatchObject({
      name: 'Lecture seule',
      permissions: expect.arrayContaining(['patient:create']),
    })
  })

  it('renomme un rôle', async () => {
    const appels = monter()
    await userEvent.click(await screen.findByText('Lecture seule'))
    const champ = await screen.findByLabelText('Nom du rôle')
    await userEvent.clear(champ)
    await userEvent.type(champ, 'Direction')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(ecritures(appels)).toHaveLength(1))
    expect(ecritures(appels)[0].body).toMatchObject({ name: 'Direction' })
  })

  it('signale un nom déjà pris sans envoyer', async () => {
    const appels = monter()
    await userEvent.click(await screen.findByText('Lecture seule'))
    const champ = await screen.findByLabelText('Nom du rôle')
    await userEvent.clear(champ)
    await userEvent.type(champ, 'coordinateur')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Un rôle s'appelle déjà « Coordinateur ».",
    )
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
    expect(ecritures(appels)).toHaveLength(0)
  })

  it('envoie les soignants masqués choisis', async () => {
    const appels = monter()
    await userEvent.click(await screen.findByText('Nouveau rôle'))
    await userEvent.type(await screen.findByLabelText('Nom du rôle'), 'Cadre')
    await userEvent.click(await screen.findByLabelText('Kiné 1'))
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(ecritures(appels)).toHaveLength(1))
    expect(ecritures(appels)[0]).toMatchObject({
      method: 'POST',
      body: { name: 'Cadre', hiddenSoignantIds: ['k1'] },
    })
  })

  it("désactive la suppression d'un rôle attribué et l'explique", async () => {
    monter()
    const attribue = await screen.findByRole('button', {
      name: 'Supprimer le rôle Coordinateur',
    })
    expect(attribue).toBeDisabled()
    expect(attribue).toHaveAttribute(
      'title',
      expect.stringContaining('2 membres'),
    )
  })

  it('supprime un rôle libre après confirmation', async () => {
    const appels = monter()
    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Supprimer le rôle Lecture seule',
      }),
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'Supprimer' }),
    )

    await waitFor(() => expect(ecritures(appels)).toHaveLength(1))
    expect(ecritures(appels)[0]).toMatchObject({ method: 'DELETE' })
    expect(ecritures(appels)[0].url).toContain('/roles/r2')
  })

  it('affiche les supprimés et les restaure', async () => {
    const appels = monter()
    await userEvent.click(await screen.findByText('Supprimés'))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Restaurer' }),
    )

    await waitFor(() => expect(ecritures(appels)).toHaveLength(1))
    expect(ecritures(appels)[0]).toMatchObject({ method: 'POST' })
    expect(ecritures(appels)[0].url).toContain('/roles/r3/restore')
  })

  it('selectionne le role cree : un second enregistrement le modifie', async () => {
    const appels = monter()
    await userEvent.click(
      await screen.findByRole('button', { name: /Nouveau rôle/ }),
    )
    await userEvent.type(await screen.findByLabelText('Nom du rôle'), 'Diet')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await screen.findByRole('button', { name: 'Dupliquer' })
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(ecritures(appels)).toHaveLength(2))
    expect(ecritures(appels).map((a) => a.method)).toEqual(['POST', 'PATCH'])
    expect(ecritures(appels)[1].url).toContain('/roles/cree-2')
  })

  it('garde l editeur du role cree avant que la liste ne le contienne', async () => {
    const appels = monter(true)
    await userEvent.click(
      await screen.findByRole('button', { name: /Nouveau rôle/ }),
    )
    await userEvent.type(await screen.findByLabelText('Nom du rôle'), 'Diet')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(
      await screen.findByRole('button', { name: 'Dupliquer' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Nom du rôle')).toHaveValue('Diet')
    await waitFor(() =>
      expect(appels.filter((a) => a.method === 'GET').length).toBeGreaterThan(
        3,
      ),
    )
    expect(
      screen.getByRole('button', { name: 'Dupliquer' }),
    ).toBeInTheDocument()
  })

  it('duplique un role : nouveau role pre-rempli de ses droits', async () => {
    const appels = monter()
    await userEvent.click(await screen.findByText('Lecture seule'))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Dupliquer' }),
    )
    expect(await screen.findByLabelText('Nom du rôle')).toHaveValue(
      'Copie de Lecture seule',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(ecritures(appels)).toHaveLength(1))
    const [ecriture] = ecritures(appels)
    expect(ecriture.method).toBe('POST')
    expect(ecriture.body).toEqual({
      name: 'Copie de Lecture seule',
      permissions: [...DEFAULT_ROLE_PERMISSIONS.LECTURE],
      hiddenSoignantIds: [],
    })
  })

  it('signale que gerer l equipe demande aussi de voir les membres', async () => {
    monter()
    await userEvent.click(
      await screen.findByRole('button', { name: /Nouveau rôle/ }),
    )
    await userEvent.click(
      await screen.findByLabelText("Gérer l'équipe du service"),
    )
    expect(screen.getByText(/Nécessite aussi/)).toBeInTheDocument()
    await userEvent.click(
      screen.getByLabelText('Voir la liste des membres du service'),
    )
    expect(screen.queryByText(/Nécessite aussi/)).toBeNull()
  })
})
