import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

// Le SQL brut contourne le garde-fou d'ORM : il n'a le droit d'exister que dans ces fichiers.
const AUTORISES = ['infra/orm/postgres-client.ts', 'infra/orm/role-id.ts']

const RACINE = join(__dirname, '../../../main')

const fichiers = (dossier: string): string[] =>
  readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = join(dossier, entree.name)
    if (entree.isDirectory()) {
      return fichiers(chemin)
    }
    return entree.name.endsWith('.ts') ? [chemin] : []
  })

describe('unicité du SQL brut dans src/main', () => {
  it('$queryRaw / $executeRaw (et leurs variantes Unsafe) ne figurent que dans les fichiers déclarés', () => {
    const trouves = fichiers(RACINE)
      .filter((chemin) =>
        /\$(query|execute)Raw(Unsafe)?\b/.test(readFileSync(chemin, 'utf8')),
      )
      .map((chemin) => relative(RACINE, chemin).split(sep).join('/'))
      .sort()
    expect(trouves).toEqual(AUTORISES)
  })
})
