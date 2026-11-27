import type { ServicePermission } from '../utils/permissions.ts'

// Disposition de l'écran « Rôles » (maquette 24b, 2026-11-27) : les droits rangés par écran, en
// cartes, dans les familles du menu. Une paire lire/modifier devient un NIVEAU : chaque niveau
// liste TOUT ce qu'il accorde, « Modifier » inclut donc « Lire ». Chaque clé du catalogue figure
// une fois et une seule (vérifié par `roleLayout.test.ts`).

export type ToggleRow = {
  kind: 'toggle'
  label: string
  key: ServicePermission
}

export type LevelRow = {
  kind: 'level'
  label: string
  // Du plus faible au plus fort ; « Aucun » est implicite, avant le premier.
  levels: readonly { label: string; keys: readonly ServicePermission[] }[]
}

export type PermissionRow = ToggleRow | LevelRow

export type PermissionCard = { title: string; rows: readonly PermissionRow[] }

export type PermissionSection = {
  title: string
  cards: readonly PermissionCard[]
}

export const NO_LEVEL = 'Aucun'

const toggle = (label: string, key: ServicePermission): ToggleRow => ({
  kind: 'toggle',
  label,
  key,
})

const level = (
  label: string,
  lower: [string, ServicePermission],
  upper: [string, ServicePermission],
): LevelRow => ({
  kind: 'level',
  label,
  levels: [
    { label: lower[0], keys: [lower[1]] },
    { label: upper[0], keys: [lower[1], upper[1]] },
  ],
})

export const ROLE_LAYOUT: readonly PermissionSection[] = [
  {
    title: 'Quotidien',
    cards: [
      {
        title: 'Écrans',
        rows: [
          toggle('Dashboard', 'dashboard:read'),
          toggle('Agenda', 'agenda:read'),
          toggle('Liste des patients', 'patients:read'),
          toggle('Suivi', 'suivi:read'),
        ],
      },
      {
        title: 'Patients et rendez-vous',
        rows: [
          level(
            'Fiche patient',
            ['Ouvrir', 'patient:read'],
            ['Modifier', 'patient:write'],
          ),
          toggle('Ajouter un patient', 'patient:create'),
          toggle('Supprimer un patient', 'patient:delete'),
          level(
            'Données cliniques',
            ['Lire', 'clinical:read'],
            ['Modifier', 'clinical:write'],
          ),
          level(
            'Rendez-vous',
            ['Créer', 'appointment:create'],
            ['Créer et modifier', 'appointment:write'],
          ),
          toggle('Ajouter depuis le Dashboard', 'dashboard:write'),
          toggle('Exporter en PDF', 'pdf:export'),
        ],
      },
      {
        title: 'Planning, tâches, notifications',
        rows: [
          level(
            'Planning',
            ['Lire', 'planning:read'],
            ['Modifier les semaines types', 'planning:write'],
          ),
          toggle(
            'Listes de choix (thématiques, salles, soignants)',
            'referentials:read',
          ),
          level('Tâches', ['Voir', 'tasks:read'], ['Traiter', 'tasks:write']),
          toggle('Gérer ses propres notifications', 'notifications:own'),
        ],
      },
    ],
  },
  {
    title: 'Pilotage',
    cards: [
      {
        title: 'Pilotage',
        rows: [
          toggle('Activité du service', 'activity:read'),
          level(
            'Indicateurs',
            ['Voir', 'stats:read'],
            ['Saisir et régler', 'stats:write'],
          ),
        ],
      },
    ],
  },
  {
    title: 'Administration',
    cards: [
      {
        title: 'Organisation',
        rows: [
          toggle('Modèles de parcours', 'pathway-templates:write'),
          toggle('Thématiques', 'thematics:write'),
          toggle('Soignants', 'soignants:write'),
          toggle('Salles', 'locations:write'),
        ],
      },
      {
        title: 'Patients',
        rows: [
          toggle('Fiche patient (champs)', 'patient-form:write'),
          toggle('Diagnostics éducatifs', 'diagnostic-templates:write'),
          toggle('Document patient', 'pdf-design:write'),
        ],
      },
      {
        title: 'Équipe',
        rows: [
          level(
            'Membres du service',
            ['Voir', 'members:read'],
            ['Gérer', 'service-members:manage'],
          ),
          toggle("Journal d'activité", 'service-journal:read'),
          toggle('Journal des consultations de dossiers', 'consultations:read'),
        ],
      },
    ],
  },
]

export const rowKeys = (row: PermissionRow): ServicePermission[] =>
  row.kind === 'toggle'
    ? [row.key]
    : [...new Set(row.levels.flatMap((l) => l.keys))]

// Niveau affiché : le plus fort dont la clé propre (la dernière) est détenue. Une donnée
// ancienne « modifier sans lire » s'affiche donc « Modifier » ; la choisir la complète.
export function levelOf(row: LevelRow, permissions: readonly string[]): string {
  for (const l of [...row.levels].reverse()) {
    if (permissions.includes(l.keys.at(-1) as string)) {
      return l.label
    }
  }
  return NO_LEVEL
}

export function withLevel(
  row: LevelRow,
  permissions: readonly string[],
  label: string,
): string[] {
  const owned = new Set<string>(rowKeys(row))
  const kept = permissions.filter((p) => !owned.has(p))
  const chosen = row.levels.find((l) => l.label === label)
  return chosen ? [...kept, ...chosen.keys] : kept
}

export const isGranted = (
  row: PermissionRow,
  permissions: readonly string[],
) =>
  row.kind === 'toggle'
    ? permissions.includes(row.key)
    : levelOf(row, permissions) !== NO_LEVEL

// Valeur lisible d'une ligne : « Voir », « Aucun », « accordé » / « retiré ».
export const rowValue = (row: PermissionRow, permissions: readonly string[]) =>
  row.kind === 'toggle'
    ? permissions.includes(row.key)
      ? 'ajouté'
      : 'retiré'
    : levelOf(row, permissions)

export const allRows = (): PermissionRow[] =>
  ROLE_LAYOUT.flatMap((s) => s.cards.flatMap((c) => c.rows))

// Lignes dont la valeur diffère entre deux jeux de droits.
export const changedRows = (
  before: readonly string[],
  after: readonly string[],
): PermissionRow[] =>
  allRows().filter((row) => rowValue(row, before) !== rowValue(row, after))
