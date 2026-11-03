import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import isoWeek from 'dayjs/plugin/isoWeek'
import utc from 'dayjs/plugin/utc'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import PlanningExportModal from './planning-export-modal.tsx'

dayjs.extend(utc)
dayjs.extend(isoWeek)
dayjs.locale('fr')

const cycle = vi.hoisted(() => ({
  current: null as null | { startOfWeek: string; weekCount: number },
}))

vi.mock('@react-pdf/renderer', () => ({
  PDFViewer: () => null,
  PDFDownloadLink: ({
    children,
  }: {
    children: (state: { loading: boolean }) => ReactNode
  }) => children({ loading: false }),
}))
vi.mock('./planning-weeks.pdf.tsx', () => ({ default: () => null }))
vi.mock('../../../../queries/useSlot.ts', () => ({
  useSlotsInRangeQuery: () => ({ slots: [], isFetching: false }),
}))
vi.mock('../../../../queries/useForbiddenWeek.ts', () => ({
  useForbiddenWeekQueries: () => ({ forbiddenWeeks: [] }),
}))
vi.mock('../../../../queries/usePlanningCycle.ts', () => ({
  usePlanningCycleQueries: () => ({ planningCycle: cycle.current }),
}))
vi.mock('../../../../queries/usePathwayTemplate.ts', () => ({
  usePathwayTemplateQueries: () => ({
    pathwayTemplates: [
      {
        id: 'ic',
        name: 'Insuffisance cardiaque',
        color: '#228b22',
        firstAppointmentOnly: false,
      },
      {
        id: 'ta',
        name: 'Tabac',
        color: '#f59e0b',
        firstAppointmentOnly: true,
      },
    ],
  }),
}))

const row = (iso: number) =>
  screen
    .getAllByRole('button')
    .find((b) => b.firstElementChild?.textContent === `S${iso}`) as HTMLElement

const renderModal = () =>
  render(<PlanningExportModal initialDate="2026-11-04" onClose={vi.fn()} />)

describe('PlanningExportModal', () => {
  it('surligne la plage avec ses numéros de page et la déplace au clic', async () => {
    const user = userEvent.setup()
    renderModal()
    expect(within(row(45)).getByText('p. 1')).toBeInTheDocument()
    expect(within(row(48)).getByText('p. 4')).toBeInTheDocument()
    expect(within(row(49)).queryByText(/p\./)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Page suivante' }))
    expect(screen.getByText('Page 2 sur 4')).toBeInTheDocument()

    await user.click(row(46))
    expect(within(row(46)).getByText('p. 1')).toBeInTheDocument()
    expect(within(row(49)).getByText('p. 4')).toBeInTheDocument()
    expect(screen.getByText('Page 1 sur 4')).toBeInTheDocument()
  })

  it('synchronise raccourcis et compteur, bornés de 1 à 12', async () => {
    const user = userEvent.setup()
    cycle.current = null
    renderModal()
    expect(screen.queryByText('1 cycle')).not.toBeInTheDocument()

    await user.click(screen.getByText('1 sem.'))
    expect(
      screen.getByRole('button', { name: 'Retirer une semaine' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /^Télécharger$/ }),
    ).toBeInTheDocument()

    await user.click(screen.getByText('2 sem.'))
    expect(screen.getByText('2 sem.', { selector: 'span' })).toBeInTheDocument()
  })

  it('propose « 1 cycle » plafonné à 12 semaines', async () => {
    const user = userEvent.setup()
    cycle.current = { startOfWeek: '2026-09-21', weekCount: 16 }
    renderModal()
    await user.click(screen.getByText('1 cycle'))
    expect(screen.getByText('12 sem.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Ajouter une semaine' }),
    ).toBeDisabled()
    cycle.current = null
  })

  it('désactive le téléchargement sans parcours', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: /Tous les parcours/ }))
    const labels = screen
      .getAllByRole('button')
      .map((b) => b.textContent)
      .filter((t) =>
        ['Hors parcours', 'Tabac', 'Insuffisance cardiaque'].includes(t ?? ''),
      )
    expect(labels).toEqual(['Hors parcours', 'Tabac', 'Insuffisance cardiaque'])
    expect(screen.getByText('Individuels')).toBeInTheDocument()
    expect(screen.getByText('Multiples')).toBeInTheDocument()
    await user.type(
      screen.getByPlaceholderText('Rechercher un parcours'),
      'tab',
    )
    expect(screen.getByRole('button', { name: 'Tabac' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Insuffisance cardiaque' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByText('Tout désélectionner'))
    expect(
      screen.getByText('Choisissez au moins un parcours.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Télécharger/ })).toBeDisabled()
    expect(screen.getByText('Aucun parcours')).toBeInTheDocument()

    await user.click(screen.getByText('Tout sélectionner'))
    expect(screen.getByRole('button', { name: /Télécharger/ })).toBeEnabled()
  })
})
