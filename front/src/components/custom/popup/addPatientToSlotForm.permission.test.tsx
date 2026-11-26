import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '../../../store/useAuthStore.ts'
import type { TenantContext } from '../../../types/auth.ts'
import type { ServicePermission } from '../../../utils/permissions.ts'
import AddPatientToSlotForm from './addPatientToSlotForm.tsx'

const contextWith = (
  servicePermissions: ServicePermission[],
): TenantContext => ({
  establishmentId: 'e',
  serviceId: 's',
  establishmentRole: 'MEMBER',
  servicePermissions,
  hiddenSoignantIds: [],
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
