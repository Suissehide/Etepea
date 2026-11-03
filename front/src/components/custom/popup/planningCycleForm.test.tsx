import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import isoWeek from 'dayjs/plugin/isoWeek'
import utc from 'dayjs/plugin/utc'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PlanningCycleForm } from './planningCycleForm.tsx'

dayjs.extend(utc)
dayjs.extend(isoWeek)
dayjs.locale('fr')

vi.mock('../../../queries/useForbiddenWeek.ts', () => ({
  useForbiddenWeekQueries: () => ({
    // S3 du cycle démarré le 5 oct. 2026.
    forbiddenWeeks: [
      { id: 'f1', startOfWeek: '2026-10-19T00:00:00.000Z', createdAt: '' },
    ],
  }),
}))

const row = (iso: number) =>
  screen
    .getAllByRole('button')
    .find((b) => b.firstElementChild?.textContent === `S${iso}`) as HTMLElement

describe('PlanningCycleForm', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      now: new Date('2026-10-07T10:00:00Z'),
      toFake: ['Date'],
    })
  })
  afterEach(() => vi.useRealTimers())

  const renderForm = (onSave = vi.fn()) => {
    render(
      <PlanningCycleForm
        open
        setOpen={vi.fn()}
        cycle={{ startOfWeek: '2026-10-05', weekCount: 6 }}
        onSave={onSave}
        onReset={vi.fn()}
      />,
    )
    return onSave
  }

  it('ne compte pas une semaine interdite et la rend non cliquable', () => {
    renderForm()
    expect(within(row(41)).getByText('S1 · départ')).toBeInTheDocument()
    expect(row(43)).toBeDisabled()
    expect(within(row(44)).getByText('S3')).toBeInTheDocument()
  })

  it('déplace le départ au clic et enregistre la nouvelle valeur', async () => {
    const user = userEvent.setup()
    const onSave = renderForm()
    await user.click(row(42))
    expect(within(row(42)).getByText('S1 · départ')).toBeInTheDocument()
    expect(within(row(41)).getByText('S6')).toBeInTheDocument()
    expect(screen.getByText(/sera S6/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '4 semaines' }))
    expect(screen.getByText('4 sem.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mois suivant' }))
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(onSave).toHaveBeenCalledWith({
      startOfWeek: '2026-10-12',
      weekCount: 4,
    })
  })

  it('désactive « − » à 1 semaine', async () => {
    const user = userEvent.setup()
    renderForm()
    const minus = screen.getByRole('button', { name: 'Raccourcir le cycle' })
    for (let i = 0; i < 5; i++) {
      await user.click(minus)
    }
    expect(minus).toBeDisabled()
  })
})
