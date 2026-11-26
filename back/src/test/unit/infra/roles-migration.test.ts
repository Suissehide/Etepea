import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { defaultRolesData } from '../../../main/utils/default-roles'
import {
  DEFAULT_ROLE_PERMISSIONS,
  parsePermissions,
  type RolePreset,
} from '../../../main/utils/permissions'

const MIGRATION = join(
  __dirname,
  '../../../../prisma/migrations/20261126120000_roles_configurables/migration.sql',
)

// Lit le littéral ARRAY[...] qui suit le bloc `-- preset:<PRESET>`.
const permissionsInsertedFor = (sql: string, preset: string): string[] => {
  const bloc = sql.split(`-- preset:${preset}\n`)[1] ?? ''
  const array = /ARRAY\[([^\]]*)\]/.exec(bloc)?.[1] ?? ''
  return parsePermissions([...array.matchAll(/'([^']+)'/g)].map((m) => m[1]))
    .slice()
    .sort()
}

const AJOUT = join(
  __dirname,
  '../../../../prisma/migrations/20261126140000_dashboard_write/migration.sql',
)

describe('migration roles_configurables', () => {
  const sql = readFileSync(MIGRATION, 'utf8')
  const ajout = readFileSync(AJOUT, 'utf8')
  const ajoutes = (preset: string) =>
    ajout.includes(`"preset" = '${preset}'`) &&
    ajout.includes('array_append("permissions", \'dashboard:write\')')

  for (const [preset, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    it(`la migration écrit exactement les droits de ${preset}`, () => {
      const apres = [
        ...permissionsInsertedFor(sql, preset),
        ...(ajoutes(preset) ? ['dashboard:write'] : []),
      ]
      expect(apres.sort()).toEqual([...perms].sort())
    })
  }

  it('la migration dashboard_write ne cible que COORDINATEUR', () => {
    expect(ajoutes('COORDINATEUR')).toBe(true)
    for (const autre of ['INTERVENANT', 'SECRETARIAT', 'LECTURE']) {
      expect(ajoutes(autre)).toBe(false)
    }
  })

  it('defaultRolesData produit les quatre presets avec leurs droits', () => {
    const roles = defaultRolesData('s1', 'e1')
    expect(roles.map((r) => r.preset).sort()).toEqual(
      (Object.keys(DEFAULT_ROLE_PERMISSIONS) as RolePreset[]).sort(),
    )
    for (const r of roles) {
      expect(r).toMatchObject({ serviceId: 's1', establishmentId: 'e1' })
      expect(r.permissions).toEqual([...DEFAULT_ROLE_PERMISSIONS[r.preset]])
    }
  })
})
