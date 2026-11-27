import { describe, expect, it } from 'vitest'

import { ctxRole } from '../test/roles.ts'
import type { TenantContext } from '../types/auth.ts'
import { can } from './useCan.ts'

const context = (servicePermissions: TenantContext['servicePermissions']) =>
  ({
    establishmentId: 'e1',
    serviceId: 's1',
    establishmentRole: 'MEMBER',
    servicePermissions,
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

  it('l ajout depuis le dashboard est propre au coordinateur', () => {
    const base = context(null)
    const inter = { ...base, ...ctxRole('INTERVENANT') }
    expect(can(inter, 'appointment:create')).toBe(true)
    expect(can(inter, 'dashboard:write')).toBe(false)
    expect(
      can({ ...base, ...ctxRole('COORDINATEUR') }, 'dashboard:write'),
    ).toBe(true)
  })
})
