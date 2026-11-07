import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import isoWeek from 'dayjs/plugin/isoWeek'
import utc from 'dayjs/plugin/utc'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { Slot } from '../../../../types/slot.ts'
import PlanningExportModal, {
  isSlotExported,
  NO_SOIGNANT_KEY,
} from './planning-export-modal.tsx'

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
vi.mock('../../../../queries/useSoignant.ts', () => ({
  useSoignantQueries: () => ({
    soignants: [
      { id: 'k1', name: 'Kiné1', color: '#0284c7' },
      { id: 'apa', name: 'APA', color: '#0d9488' },
      { id: 'psy', name: 'Psychologue', color: '#9333ea' },
    ],
  }),
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
  render(
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
      <PlanningExportModal initialDate="2026-11-04" onClose={vi.fn()} />
    </LocalizationProvider>,
  )

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

  it('synchronise raccourcis et compteur ; hors raccourci, « Personnalisé »', async () => {
    const user = userEvent.setup()
    cycle.current = null
    renderModal()
    expect(screen.queryByText('1 cycle')).not.toBeInTheDocument()
    expect(screen.queryByText('2 sem.')).not.toBeInTheDocument()

    await user.click(screen.getByText('1 sem.'))
    expect(
      screen.getByRole('button', { name: 'Retirer une semaine' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /^Télécharger$/ }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Ajouter une semaine' }),
    )
    expect(screen.getByText('2 sem.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Personnalisé' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('propose « 1 cycle », plafonné à 53 semaines', async () => {
    const user = userEvent.setup()
    cycle.current = { startOfWeek: '2026-09-21', weekCount: 16 }
    renderModal()
    await user.click(screen.getByText('1 cycle'))
    expect(screen.getByText('16 sem.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Ajouter une semaine' }),
    ).toBeEnabled()
    cycle.current = null
  })

  it('exporte un semestre en semaines entières à partir du mois cliqué', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: 'Semestre' }))
    // Novembre 2026 → avril 2027 : du lundi 26 octobre au dimanche 2 mai.
    expect(screen.getByText('Page 1 sur 27')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Ajouter une semaine' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/la génération du PDF/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Année suivante' }))
    await user.click(screen.getByRole('button', { name: /^janv/i }))
    expect(
      screen.getByRole('button', { name: /^Télécharger \(27 pages\)$/ }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Année' }))
    expect(screen.getByText('Page 1 sur 53')).toBeInTheDocument()

    await user.click(screen.getByText('1 mois'))
    expect(screen.getByText('4 sem.')).toBeInTheDocument()
  })

  it('ouvre « Personnalisé » sur la plage affichée et l’applique', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: 'Personnalisé' }))
    expect(screen.getByText('Période personnalisée')).toBeInTheDocument()
    expect(
      screen.getByText(
        /du lundi 02\/11\/2026 au vendredi 27\/11\/2026, 4 pages/,
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Valider' }))
    expect(screen.queryByText('Période personnalisée')).not.toBeInTheDocument()
    expect(screen.getByText('Page 1 sur 4')).toBeInTheDocument()
  })

  it('filtre aussi par soignant et le rappelle dans le résumé', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: /Tous les soignants/ }))
    expect(
      screen
        .getAllByRole('button')
        .map((b) => b.textContent)
        .filter((t) =>
          ['APA', 'Kiné1', 'Psychologue', 'Sans soignant'].includes(t ?? ''),
        ),
    ).toEqual(['APA', 'Kiné1', 'Psychologue', 'Sans soignant'])

    await user.click(screen.getByRole('button', { name: 'Psychologue' }))
    await user.click(screen.getByRole('button', { name: 'Sans soignant' }))
    await user.keyboard('{Escape}')
    expect(screen.getByText('APA, Kiné1')).toBeInTheDocument()
    expect(screen.getByText(/Soignants : APA, Kiné1/)).toBeInTheDocument()
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
      screen.getByText('Choisissez au moins un parcours et un soignant.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Télécharger/ })).toBeDisabled()
    expect(screen.getByText('Aucun parcours')).toBeInTheDocument()

    await user.click(screen.getByText('Tout sélectionner'))
    expect(screen.getByRole('button', { name: /Télécharger/ })).toBeEnabled()
  })

  it('Échap ferme le menu des parcours, puis la popup', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<PlanningExportModal initialDate="2026-11-04" onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: /Tous les parcours/ }))
    await user.keyboard('{Escape}')
    expect(
      screen.queryByPlaceholderText('Rechercher un parcours'),
    ).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('isSlotExported', () => {
  const slot = (pathwayId: string | null, soignantIds: string[]) =>
    ({
      pathway: pathwayId ? { template: { id: pathwayId } } : undefined,
      slotTemplate: { soignants: soignantIds.map((id) => ({ id })) },
    }) as unknown as Slot

  it('exige un parcours retenu ET au moins un soignant retenu', () => {
    const noPathway = new Set(['ta'])
    const noSoignant = new Set(['psy'])
    expect(isSlotExported(slot('ic', ['k1']), noPathway, noSoignant)).toBe(true)
    expect(isSlotExported(slot('ta', ['k1']), noPathway, noSoignant)).toBe(
      false,
    )
    expect(isSlotExported(slot('ic', ['psy']), noPathway, noSoignant)).toBe(
      false,
    )
    expect(
      isSlotExported(slot('ic', ['psy', 'k1']), noPathway, noSoignant),
    ).toBe(true)
  })

  it('range les créneaux sans soignant sous « Sans soignant »', () => {
    const none = new Set<string>()
    expect(isSlotExported(slot('ic', []), none, none)).toBe(true)
    expect(
      isSlotExported(slot('ic', []), none, new Set([NO_SOIGNANT_KEY])),
    ).toBe(false)
  })
})
