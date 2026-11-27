import { Check, ChevronRight } from 'lucide-react'
import { Fragment } from 'react'

import {
  levelOf,
  NO_LEVEL,
  type PermissionRow,
  ROLE_LAYOUT,
} from '../../../constants/roleLayout.ts'
import type { Role } from '../../../types/role.ts'
import { membres } from './roleText.ts'

// Aperçu des rôles (maquette 24c) : tous les rôles côte à côte, en lecture seule. Un clic sur
// l'en-tête d'un rôle l'ouvre en édition.
export function RolesOverview({
  roles,
  onOpen,
}: {
  roles: Role[]
  onOpen: (role: Role) => void
}) {
  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-[17px] font-bold text-text-dark">
          Aperçu des rôles
        </h2>
        <p className="text-[13px] text-text-light">
          Lecture seule. Cliquez sur un rôle pour le modifier.
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-6 pb-5">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-background">
            <tr>
              <th className="p-3 text-left align-bottom text-xs font-semibold text-text-light border-b border-border">
                Droit
              </th>
              {roles.map((role) => (
                <th
                  key={role.id}
                  className="w-36 px-2 py-2.5 text-center align-bottom border-b border-border"
                >
                  <button
                    type="button"
                    onClick={() => onOpen(role)}
                    className="inline-flex flex-col items-center gap-0.5 rounded-md px-2.5 py-1.5 cursor-pointer hover:bg-primary/10"
                  >
                    <span className="flex items-center gap-1 text-[13px] font-semibold text-primary">
                      {role.name}
                      <ChevronRight className="w-3 h-3" />
                    </span>
                    <span className="text-[11px] font-normal text-text-light">
                      {membres(role.memberCount)}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLE_LAYOUT.map((section) => (
              <Fragment key={section.title}>
                <tr>
                  <td
                    colSpan={roles.length + 1}
                    className="px-3 pt-4 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]"
                  >
                    {section.title}
                  </td>
                </tr>
                {section.cards.map((card) => (
                  <Fragment key={card.title}>
                    <tr>
                      <td
                        colSpan={roles.length + 1}
                        className="px-3 pt-2 pb-1 text-[13px] font-bold text-text-dark border-t border-border"
                      >
                        {card.title}
                      </td>
                    </tr>
                    {card.rows.map((row) => (
                      <tr key={row.label} className="border-t border-muted">
                        <td className="py-1.5 pl-6 pr-3 text-[13px] text-text">
                          {row.label}
                        </td>
                        {roles.map((role) => (
                          <td key={role.id} className="px-2 py-1.5 text-center">
                            <Cell row={row} permissions={role.permissions} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Cell({
  row,
  permissions,
}: {
  row: PermissionRow
  permissions: string[]
}) {
  const none = (
    <span className="text-[#cbd5e1]">
      <span aria-hidden="true">—</span>
      <span className="sr-only">Non</span>
    </span>
  )
  if (row.kind === 'toggle') {
    return permissions.includes(row.key) ? (
      <Check aria-label="Oui" className="inline w-4 h-4 text-primary" />
    ) : (
      none
    )
  }
  const level = levelOf(row, permissions)
  return level === NO_LEVEL ? (
    none
  ) : (
    <span className="whitespace-nowrap rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-800">
      {level}
    </span>
  )
}
