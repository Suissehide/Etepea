import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import utc from 'dayjs/plugin/utc'
import { describe, expect, it, vi } from 'vitest'

import {
  getSlotTranches,
  type SlotSuggestion,
} from '../../../libs/slotAvailability.ts'
import type { Slot } from '../../../types/slot.ts'
import { getTrancheCapacityLabel, SlotList } from './addPatientToSlotForm.tsx'

dayjs.extend(utc)
dayjs.locale('fr')

// MDS-75 : consultation de 9h15 a 12h15, thematique de 45 min, 10h00 deja pris.
const slot = {
  id: 'slot-1',
  startDate: '2026-11-06T09:15:00.000Z',
  endDate: '2026-11-06T12:15:00.000Z',
  slotTemplate: {
    isIndividual: true,
    soignants: [{ id: 's1', name: 'Diététicienne' }],
    location: { name: 'Bureau 2' },
  },
  appointments: [
    {
      id: 'apt-1',
      startDate: '2026-11-06T10:00:00.000Z',
      endDate: '2026-11-06T10:45:00.000Z',
    },
  ],
} as unknown as Slot

const suggestion: SlotSuggestion = {
  slot,
  alreadyBooked: false,
  isFull: false,
  bookedCount: 1,
  capacity: 1,
  isIndividual: true,
  tranches: getSlotTranches(slot, 45),
}

describe('SlotList — créneau individuel découpé (MDS-75)', () => {
  it('propose les heures de début, barre celles déjà prises et transmet l’heure cliquée', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <SlotList
        isReady
        suggestions={[suggestion]}
        until="4 décembre 2026"
        hasMore={false}
        isLoading={false}
        onSelect={onSelect}
        onLoadMore={vi.fn()}
      />,
    )

    expect(
      ['09:15', '10:00', '10:45', '11:30'].map((time) =>
        screen.getByRole('button', { name: time }),
      ),
    ).toHaveLength(4)
    expect(screen.getByRole('button', { name: '10:00' })).toBeDisabled()
    expect(screen.getByText('3 libres sur 4')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '10:45' }))
    expect(onSelect).toHaveBeenCalledWith(
      suggestion,
      '2026-11-06T10:45:00.000Z',
    )
  })
})

describe('getTrancheCapacityLabel', () => {
  it('accorde « libre » au singulier', () => {
    expect(
      getTrancheCapacityLabel([
        { start: 'a', end: 'b', taken: false },
        { start: 'b', end: 'c', taken: true },
      ]),
    ).toBe('1 libre sur 2')
  })
})
