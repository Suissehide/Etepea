import type { ReactNode } from 'react'

import {
  THEMATIC_ROLE,
  type ThematicRole,
} from '@/constants/thematic.constant.ts'

type Effet = { page: string; texte: ReactNode }

const EFFETS: Record<ThematicRole, Effet[]> = {
  DIAGNOSTIC_EDUCATIF: [
    {
      page: "Jeux d'indicateurs",
      texte: "date l'entrée du patient quand sa fiche n'en a pas.",
    },
    { page: 'Activité', texte: 'compté dans les diagnostics éducatifs.' },
    {
      page: 'Notifications',
      texte: (
        <>
          ses soignants sont prévenus d'un patient entré{' '}
          <strong>sans diagnostic</strong>.
        </>
      ),
    },
  ],
  REACTUALISATION: [
    {
      page: "Jeux d'indicateurs",
      texte: (
        <>
          un programme n'est <strong>complet</strong> qu'avec une
          réactualisation après le diagnostic.
        </>
      ),
    },
  ],
  BILAN_DE_FIN: [
    { page: 'Activité', texte: 'compté dans les bilans de fin.' },
    {
      page: 'Notifications',
      texte: (
        <>
          ses soignants sont prévenus d'un parcours terminé{' '}
          <strong>sans bilan</strong>.
        </>
      ),
    },
  ],
}

export function ThematicRoleHelp() {
  return (
    <div className="flex flex-col gap-2 py-1 leading-snug">
      <p>
        Indique quelle <strong>étape clé du parcours</strong> représente cette
        thématique, quel que soit son nom.
      </p>
      {(Object.keys(EFFETS) as ThematicRole[]).map((role) => (
        <div key={role}>
          <p className="font-semibold">{THEMATIC_ROLE[role]}</p>
          <ul className="ml-4 list-disc">
            {EFFETS[role].map(({ page, texte }) => (
              <li key={page}>
                <strong className="font-semibold text-primary">{page}</strong> :{' '}
                {texte}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p>
        <span className="font-semibold">Aucun</span> : une séance ordinaire,
        comptée comme les autres.
      </p>
    </div>
  )
}
