import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import isoWeek from 'dayjs/plugin/isoWeek'
import utc from 'dayjs/plugin/utc'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BulkWeekForm } from './bulkWeekForm.tsx'

dayjs.extend(utc)
dayjs.extend(isoWeek)
dayjs.locale('fr')

const MONDAY = dayjs.utc('2026-11-02')

describe('BulkWeekForm, mode calendrier', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      now: new Date('2026-11-04T10:00:00Z'),
      toFake: ['Date'],
    })
  })
  afterEach(() => vi.useRealTimers())

  const renderCalendar = (onConfirm = vi.fn()) => {
    render(
      <BulkWeekForm
        open
        setOpen={vi.fn()}
        mode="move"
        count={84}
        sourceWeek={MONDAY}
        forbiddenWeeks={[
          { id: 'f1', startOfWeek: '2026-11-30T00:00:00.000Z', createdAt: '' },
        ]}
        onConfirm={onConfirm}
      />,
    )
    return onConfirm
  }

  it('vise la semaine suivante par défaut et bloque source et semaines passées', () => {
    renderCalendar()
    expect(
      screen.getByRole('button', { name: 'Déplacer en S46' }),
    ).toBeEnabled()
    expect(
      screen.getByRole('button', { name: 'S45 · 2 – 6 nov.' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'S44 · 26 – 30 oct.' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Semaine suivante' }),
    ).toHaveClass('border-primary')
    expect(
      screen.getByRole('button', { name: 'Interdite · 30 nov. – 4 déc.' }),
    ).toBeEnabled()
  })

  it('« Dans 3 semaines » vaut source + 3, et le confirme', async () => {
    const onConfirm = renderCalendar()
    await userEvent.click(
      screen.getByRole('button', { name: 'Dans 3 semaines' }),
    )
    expect(
      screen.getByText(
        'Les 84 créneaux de S45 passeront en S48, du 23 au 27 nov. S45 sera vidée de ces créneaux.',
      ),
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Déplacer en S48' }),
    )
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onConfirm.mock.calls[0][0].format('YYYY-MM-DD')).toBe('2026-11-23')
  })

  it('un clic sur une ligne la rend cible', async () => {
    renderCalendar()
    await userEvent.click(
      screen.getByRole('button', { name: 'S47 · 16 – 20 nov.' }),
    )
    expect(
      screen.getByRole('button', { name: 'S47 · 16 – 20 nov.' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: 'Déplacer en S47' }),
    ).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Dans 2 semaines' })).toHaveClass(
      'border-primary',
    )
  })
})

it('la cible par défaut saute une semaine interdite', () => {
  vi.useFakeTimers({ now: new Date('2026-11-04T10:00:00Z'), toFake: ['Date'] })
  render(
    <BulkWeekForm
      open
      setOpen={vi.fn()}
      mode="duplicate"
      count={2}
      sourceWeek={MONDAY}
      forbiddenWeeks={[
        { id: 'f1', startOfWeek: '2026-11-09T00:00:00.000Z', createdAt: '' },
      ]}
      onConfirm={vi.fn()}
    />,
  )
  expect(screen.getByRole('button', { name: 'Dupliquer en S47' })).toBeEnabled()
  vi.useRealTimers()
})

describe('BulkWeekForm, mode semaines fixes', () => {
  it('liste les semaines du modèle et renvoie un numéro', async () => {
    const onConfirm = vi.fn()
    render(
      <BulkWeekForm
        open
        setOpen={vi.fn()}
        mode="duplicate"
        count={1}
        editMode
        sourceWeek={2}
        weekCount={3}
        onConfirm={onConfirm}
      />,
    )
    expect(screen.getByText('Dupliquer 1 créneau')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Semaine 2/ })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: /Semaine 5/ }))
    expect(
      screen.getByText('1 créneau sera créé en S5. S2 ne change pas.'),
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Dupliquer en S5' }),
    )
    expect(onConfirm).toHaveBeenCalledWith(5)
  })
})
