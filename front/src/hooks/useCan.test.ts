import { describe, expect, it } from 'vitest'

import type { TenantContext } from '../types/auth.ts'
import { can } from './useCan.ts'

const context = (servicePermissions: TenantContext['servicePermissions']) =>
  ({
    establishmentId: 'e1',
    serviceId: 's1',
    establishmentRole: 'MEMBER',
    servicePermissions,
    hiddenSoignantIds: [],
    soignantId: null,
  }) satisfies TenantContext

describe('can', () => {
  it('lit les permissions du rôle du contexte', () => {
    const ctx = context(['planning:read'])
    expect(can(ctx, 'planning:read')).toBe(true)
    expect(can(ctx, 'patient:read')).toBe(false)
  })

  it('refuse sans contexte ni permissions', () => {
    expect(can(null, 'planning:read')).toBe(false)
    expect(can(context(null), 'planning:read')).toBe(false)
  })
})
