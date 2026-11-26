import { describe, expect, it } from 'vitest'

import { SERVICE_PERMISSION_KEYS } from '../utils/permissions.ts'
import { PERMISSION_LABELS } from './permissions.constant.ts'

describe('PERMISSION_LABELS', () => {
  it('couvre exactement le catalogue de service', () => {
    expect(Object.keys(PERMISSION_LABELS).sort()).toEqual(
      [...SERVICE_PERMISSION_KEYS].sort(),
    )
  })
})
