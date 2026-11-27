import { Check, Copy, Trash2, X } from 'lucide-react'
import { useState } from 'react'

import {
  changedRows,
  ROLE_LAYOUT,
  rowValue,
} from '../../../constants/roleLayout.ts'
import { findNameConflict } from '../../../libs/nameConflict.ts'
import { useRoleMutations } from '../../../queries/useRoles.ts'
import type { Role } from '../../../types/role.ts'
import { Button } from '../../ui/button.tsx'
import { Input } from '../../ui/input.tsx'
import { PermissionCard } from './permissionCard.tsx'

const explicationRefus = (n: number) =>
  `Rôle attribué à ${n} membre${n > 1 ? 's' : ''} : changez leur rôle avant de le supprimer.`

type Props = {
  role: Role | null
  // Rôle dont un nouveau rôle reprend les droits (« Dupliquer »).
  copie: Role | null
  autres: Role[]
  onCreated: (role: Role) => void
  onDuplicate: (role: Role) => void
  onDelete: (role: Role) => void
}

// Éditeur d'un rôle (maquette 24b) : en-tête (nom, Dupliquer, Supprimer), droits en cartes sur
// deux colonnes, barre ambre collée en bas tant qu'il reste des changements à enregistrer.
export function RoleEditor({
  role,
  copie,
  autres,
  onCreated,
  onDuplicate,
  onDelete,
}: Props) {
  const { createRole, updateRole } = useRoleMutations()
  const modele = role ?? copie
  const initialName = role?.name ?? (copie ? `Copie de ${copie.name}` : '')
  const initialPermissions = modele?.permissions ?? []
  const [name, setName] = useState(initialName)
  const [permissions, setPermissions] = useState<string[]>(initialPermissions)

  const conflit = findNameConflict(name, autres, undefined, role?.id)
  const pending = createRole.isPending || updateRole.isPending
  const enregistrer = () => {
    const input = { name: name.trim(), permissions }
    if (role) {
      updateRole.mutate({ id: role.id, ...input })
    } else {
      createRole.mutate(input, { onSuccess: onCreated })
    }
  }

  return (
    <form
      className="flex flex-1 min-w-0 min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        enregistrer()
      }}
    >
      <div className="flex items-end gap-3 px-6 py-4 border-b border-border">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="role-name" className="text-xs text-text-light">
            Nom du rôle
          </label>
          <Input
            id="role-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-80 font-semibold"
          />
          {conflit && (
            <p role="alert" className="text-sm text-destructive">
              Un rôle s'appelle déjà « {conflit.item.name} ».
            </p>
          )}
        </div>
        {role && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDuplicate(role)}
            >
              <Copy className="w-3.5 h-3.5" />
              Dupliquer
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Supprimer le rôle ${role.name}`}
              title={
                role.memberCount > 0
                  ? explicationRefus(role.memberCount)
                  : 'Supprimer'
              }
              disabled={role.memberCount > 0}
              onClick={() => onDelete(role)}
              className="border-red-200 text-red-700 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer
            </Button>
          </>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto bg-surface-douce px-6 pb-5">
        {ROLE_LAYOUT.map((section) => (
          <div key={section.title}>
            <h2 className="mt-4 mb-2 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
              {section.title}
            </h2>
            <div className="lg:columns-2 gap-3.5">
              {section.cards.map((card) => (
                <PermissionCard
                  key={card.title}
                  card={card}
                  permissions={permissions}
                  initial={initialPermissions}
                  onChange={setPermissions}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <SaveBar
        isNew={!role}
        renamed={name.trim() !== initialName}
        before={initialPermissions}
        after={permissions}
        disabled={!name.trim() || !!conflit || pending}
        pending={pending}
        onCancel={() => {
          setName(initialName)
          setPermissions(initialPermissions)
        }}
      />
    </form>
  )
}

function SaveBar({
  isNew,
  renamed,
  before,
  after,
  disabled,
  pending,
  onCancel,
}: {
  isNew: boolean
  renamed: boolean
  before: readonly string[]
  after: readonly string[]
  disabled: boolean
  pending: boolean
  onCancel: () => void
}) {
  const rows = changedRows(before, after)
  const changes = [
    ...(renamed ? ['Nom'] : []),
    ...rows.map((row) => `${row.label} : ${rowValue(row, after)}`),
  ]
  if (!isNew && changes.length === 0) {
    return null
  }
  const titre = isNew
    ? 'Nouveau rôle, pas encore enregistré'
    : `${changes.length} modification${changes.length > 1 ? 's' : ''} non enregistrée${changes.length > 1 ? 's' : ''}`
  return (
    <div className="flex items-center gap-3 px-6 py-3 border-t border-amber-200 bg-amber-50 shadow-[0_-6px_16px_rgba(4,24,43,.06)]">
      <span
        aria-hidden="true"
        className="w-2 h-2 shrink-0 rounded-full bg-a-saisir"
      />
      <p className="flex-1 min-w-0 truncate text-sm text-a-saisir-texte">
        <b>{titre}</b>
        {!isNew && ` · ${changes.join(', ')}`}
      </p>
      {!isNew && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="bg-background border-amber-200"
        >
          <X className="w-4 h-4" />
          Annuler
        </Button>
      )}
      <Button type="submit" disabled={disabled} isLoading={pending}>
        <Check className="w-4 h-4" />
        Enregistrer
      </Button>
    </div>
  )
}
