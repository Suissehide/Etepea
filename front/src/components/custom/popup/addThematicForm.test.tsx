import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useThematicQueries } from '@/queries/useThematic.ts'
import { useAuthStore } from '@/store/useAuthStore.ts'
import { useToastStore } from '@/store/useToastStore.ts'
import type { TenantContext } from '@/types/auth.ts'
import AddThematicForm from './addThematicForm.tsx'

const service: TenantContext = {
  establishmentId: 'e1',
  serviceId: 's1',
  establishmentRole: 'ADMIN',
  serviceRole: 'COORDINATEUR',
  soignantId: null,
}

type Reponse = { ok: boolean; status: number; json: () => Promise<unknown> }
// Remplacee par un test pour retenir ou refuser la creation ; par defaut, 201.
let reponseCreation: () => Reponse | Promise<Reponse>
// Ce que renvoient les listes actives et supprimees ; vides par defaut.
let actives: unknown[] = []
let supprimees: unknown[] = []

// Toute lecture repond une liste vide ; seul le POST de creation est observe.
const fetchMock = vi.fn(
  async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString()
    const method = init?.method ?? 'GET'
    if (url.includes('/thematic') && method === 'POST') {
      const reponse = await reponseCreation()
      return { ...reponse, url, clone: () => reponse }
    }
    if (url.includes('/thematic/') && method === 'PATCH') {
      return { ok: true, status: 200, url, json: async () => ({ id: 'x' }) }
    }
    if (method === 'GET') {
      const liste = url.includes('/thematic?')
        ? url.includes('archived=true')
          ? supprimees
          : actives
        : []
      return { ok: true, status: 200, url, json: async () => liste }
    }
    throw new Error(`Appel fetch non attendu dans ce test : ${method} ${url}`)
  },
)

const corpsCree = () => {
  const call = fetchMock.mock.calls.find(
    ([url, init]) =>
      String(url).includes('/thematic') && init?.method === 'POST',
  )
  return JSON.parse(String(call?.[1]?.body))
}

// La liste de l'ecran, pour voir ce qu'elle affiche pendant la creation.
function Liste() {
  const { thematics } = useThematicQueries()
  return (
    <ul aria-label="Thématiques">
      {thematics?.map((t) => (
        <li key={t.id}>{t.name}</li>
      ))}
    </ul>
  )
}

beforeEach(() => {
  actives = []
  supprimees = []
  reponseCreation = () => ({
    ok: true,
    status: 201,
    json: async () => ({ id: 't1' }),
  })
  useAuthStore.setState({ context: service })
  useToastStore.setState({ toasts: [] })
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  monter()
})

function monter(onShowExisting?: (name: string) => void) {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <Liste />
      <AddThematicForm onShowExisting={onShowExisting} />
    </QueryClientProvider>,
  )
}

// Les listes se lisent au montage : on remonte apres les avoir remplies.
function remonter(onShowExisting?: (name: string) => void) {
  cleanup()
  monter(onShowExisting)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const ouvrir = () =>
  userEvent.click(screen.getByRole('button', { name: /nouvelle thématique/i }))

const ajouter = () =>
  userEvent.click(screen.getByRole('button', { name: /^ajouter$/i }))

describe('AddThematicForm — consigne du programme PDF', () => {
  it('envoie la consigne saisie à la création', async () => {
    await ouvrir()
    await userEvent.type(screen.getByLabelText('Nom'), 'Diabète')
    await userEvent.type(
      screen.getByLabelText('Consigne affichée dans le programme PDF'),
      'Un seul rendez-vous parmi : %dates%',
    )
    await ajouter()

    await waitFor(() => {
      expect(corpsCree().pdfNotice).toBe('Un seul rendez-vous parmi : %dates%')
    })
  })

  it('une consigne laissée vide part en null', async () => {
    await ouvrir()
    await userEvent.type(screen.getByLabelText('Nom'), 'Diabète')
    await ajouter()

    await waitFor(() => {
      expect(corpsCree().pdfNotice).toBeNull()
    })
  })
})

describe('AddThematicForm — attend la réponse du serveur', () => {
  it("rien n'apparaît dans la liste tant que le serveur n'a pas répondu", async () => {
    let repondre: (r: Reponse) => void = () => undefined
    reponseCreation = () =>
      new Promise((resolve) => {
        repondre = resolve
      })
    await ouvrir()
    await userEvent.type(screen.getByLabelText('Nom'), 'Sommeil')
    await ajouter()

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(
      screen.getByRole('list', { name: 'Thématiques', hidden: true }),
    ).toBeEmptyDOMElement()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    repondre({ ok: true, status: 201, json: async () => ({ id: 't1' }) })
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })

  it('un refus laisse la popup ouverte avec la saisie et le message du serveur', async () => {
    const message =
      "Une thématique supprimée s'appelle déjà « Sommeil » : restaurez-la depuis « Supprimées »."
    reponseCreation = () => ({
      ok: false,
      status: 409,
      json: async () => ({ message }),
    })
    await ouvrir()
    await userEvent.type(screen.getByLabelText('Nom'), 'Sommeil')
    await ajouter()

    await waitFor(() => {
      expect(useToastStore.getState().toasts.map((t) => t.message)).toContain(
        message,
      )
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Nom')).toHaveValue('Sommeil')
    expect(
      screen.getByRole('list', { name: 'Thématiques', hidden: true }),
    ).toBeEmptyDOMElement()
  })
})

describe('AddThematicForm — nom déjà pris', () => {
  it('une supprimée du même nom se restaure depuis la popup', async () => {
    supprimees = [{ id: 'ap', name: 'AP', duration: 45, soignants: [] }]
    remonter()
    await ouvrir()
    await userEvent.type(screen.getByLabelText('Nom'), ' ap')

    const restaurer = await screen.findByRole('button', {
      name: /restaurer « AP »/i,
    })
    expect(screen.getByText('45 min')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^ajouter$/i })).toBeDisabled()

    await userEvent.click(restaurer)
    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(
        ([, init]) => init?.method === 'PATCH',
      )
      expect(String(patch?.[0])).toContain('/thematic/ap')
      expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ archived: false })
    })
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'POST')).toBe(
      false,
    )
  })

  it("une active du même nom bloque l'ajout et se montre dans la liste", async () => {
    actives = [{ id: 'g', name: 'Gym + Vélo', soignants: [] }]
    const montrer = vi.fn()
    remonter(montrer)
    await ouvrir()
    await userEvent.type(screen.getByLabelText('Nom'), 'gym + vélo')

    await userEvent.click(
      await screen.findByRole('button', { name: /voir « Gym \+ Vélo »/i }),
    )
    expect(montrer).toHaveBeenCalledWith('Gym + Vélo')
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })

  it('Entrée ne crée pas un doublon', async () => {
    actives = [{ id: 'g', name: 'Gym + Vélo', soignants: [] }]
    remonter()
    await ouvrir()
    await userEvent.type(screen.getByLabelText('Nom'), 'Gym + Vélo')
    await screen.findByText(/existe déjà dans ce service/)
    await userEvent.type(screen.getByLabelText('Nom'), '{Enter}')
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'POST')).toBe(
      false,
    )
  })
})
