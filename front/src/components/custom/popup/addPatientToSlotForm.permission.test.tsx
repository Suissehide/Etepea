import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import type { SlotSuggestion } from '../../../libs/slotAvailability.ts'
import { useAuthStore } from '../../../store/useAuthStore.ts'
import type { TenantContext } from '../../../types/auth.ts'
import type { Slot } from '../../../types/slot.ts'
import type { ServicePermission } from '../../../utils/permissions.ts'
import AddPatientToSlotForm, { SlotList } from './addPatientToSlotForm.tsx'

const contextWith = (
  servicePermissions: ServicePermission[],
): TenantContext => ({
  establishmentId: 'e',
  serviceId: 's',
  establishmentRole: 'MEMBER',
  servicePermissions,
  soignantId: null,
})

describe('AddPatientToSlotForm selon appointment:create', () => {
  beforeEach(() => useAuthStore.setState({ context: null }))

  it('est absent sans appointment:create', () => {
    useAuthStore.setState({
      context: contextWith(['appointment:write', 'patient:read']),
    })
    render(<AddPatientToSlotForm />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('propose son bouton avec appointment:create', () => {
    useAuthStore.setState({ context: contextWith(['appointment:create']) })
    render(<AddPatientToSlotForm />)
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
  })
})

describe('rejoindre un rendez-vous collectif selon appointment:write', () => {
  const collectif: SlotSuggestion = {
    slot: {
      id: 'slot-c',
      startDate: '2026-11-16T09:00:00.000Z',
      endDate: '2026-11-16T10:00:00.000Z',
      slotTemplate: { soignants: [{ id: 'so1', name: 'Kiné' }], capacity: 8 },
      appointments: [{ id: 'apt-c' }],
    } as unknown as Slot,
    alreadyBooked: false,
    isFull: false,
    bookedCount: 2,
    capacity: 8,
    isIndividual: false,
    joinableAppointmentID: 'apt-c',
  }
  const ligne = () => {
    render(
      <SlotList
        isReady
        suggestions={[collectif]}
        until="4 décembre 2026"
        hasMore={false}
        isLoading={false}
        onSelect={() => undefined}
        onLoadMore={() => undefined}
      />,
    )
    return screen.getByText('Kiné').closest('button')
  }

  it('ne se choisit pas sans appointment:write', () => {
    useAuthStore.setState({ context: contextWith(['appointment:create']) })
    expect(ligne()).toBeDisabled()
  })

  it('se choisit avec appointment:write', () => {
    useAuthStore.setState({
      context: contextWith(['appointment:create', 'appointment:write']),
    })
    expect(ligne()).toBeEnabled()
  })
})
