import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PathwayTemplate } from '../../../types/pathwayTemplate.ts'
import PathwayTemplatesSummary from './pathwayTemplatesSummary.tsx'

const api = vi.hoisted(() => ({ update: vi.fn() }))
vi.mock('../../../api/pathwayTemplate.api.ts', () => ({
  PathwayTemplateApi: { update: api.update },
}))

const template = (
  id: string,
  extra: Partial<PathwayTemplate> = {},
): PathwayTemplate => ({
  id,
  name: id.toUpperCase(),
  color: id === 'rc' ? '#16a34a' : '#0284c7',
  mainTag: id.toUpperCase(),
  secondaryTags: [],
  displayOrder: 0,
  motifRequired: false,
  firstAppointmentOnly: false,
  optional: false,
  prerequisiteIDs: [],
  slotTemplates: [
    { id: `${id}-1`, isIndividual: false, thematicId: 't' },
  ] as PathwayTemplate['slotTemplates'],
  ...extra,
})

const templates = [template('rc'), template('tab', { slotTemplates: [] })]
vi.mock('../../../queries/usePathwayTemplate.ts', () => ({
  usePathwayTemplateQueries: () => ({ pathwayTemplates: templates }),
}))

const renderSummary = (onShowInPlanning = vi.fn()) => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PathwayTemplatesSummary onShowInPlanning={onShowInPlanning} />
    </QueryClientProvider>,
  )
  return onShowInPlanning
}

describe('PathwayTemplatesSummary', () => {
  beforeEach(() => {
    api.update.mockReset()
    api.update.mockResolvedValue({})
  })

  it('liste les parcours avec leurs alertes, filtrables', async () => {
    const user = userEvent.setup()
    renderSummary()
    await user.click(
      screen.getByRole('button', { name: 'Résumé des parcours' }),
    )
    expect(screen.getByText('2 parcours · 1 à vérifier')).toBeInTheDocument()
    expect(screen.getByText('Aucun créneau')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /À vérifier/ }))
    const names = screen.getAllByRole('textbox', { name: 'Nom du parcours' })
    expect(names.map((input) => (input as HTMLInputElement).value)).toEqual([
      'TAB',
    ])
  })

  it('enregistre chaque modification aussitôt, avec tout le parcours', async () => {
    const user = userEvent.setup()
    renderSummary()
    await user.click(
      screen.getByRole('button', { name: 'Résumé des parcours' }),
    )

    await user.click(
      screen.getByRole('switch', { name: 'RC : parcours optionnel' }),
    )
    expect(api.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'rc',
        name: 'RC',
        mainTag: 'RC',
        optional: true,
      }),
      expect.anything(),
    )
    expect(
      screen.getByText(/« RC » : optionnel — enregistré/),
    ).toBeInTheDocument()

    const name = screen.getAllByRole('textbox', { name: 'Nom du parcours' })[0]
    await user.clear(name)
    await user.type(name, 'Réadaptation cardiaque{Enter}')
    expect(api.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'rc', name: 'Réadaptation cardiaque' }),
      expect.anything(),
    )

    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(api.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'rc', name: 'RC' }),
      expect.anything(),
    )
  })

  it('ne vide jamais un nom, et ferme pour montrer le parcours dans le planning', async () => {
    const user = userEvent.setup()
    const onShow = renderSummary()
    await user.click(
      screen.getByRole('button', { name: 'Résumé des parcours' }),
    )
    const name = screen.getAllByRole('textbox', { name: 'Nom du parcours' })[1]
    await user.clear(name)
    await user.tab()
    expect(api.update).not.toHaveBeenCalled()
    expect(name).toHaveValue('TAB')

    const row = name.closest('tr') as HTMLElement
    await user.click(
      within(row).getByRole('button', { name: 'Voir TAB dans le planning' }),
    )
    expect(onShow).toHaveBeenCalledWith(templates[1])
  })
})
