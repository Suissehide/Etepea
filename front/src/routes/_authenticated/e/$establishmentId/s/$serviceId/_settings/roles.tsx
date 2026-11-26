import { createFileRoute, redirect } from '@tanstack/react-router'
import { Copy, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ConfirmDeleteForm } from '@/components/custom/popup/confirmDeleteForm.tsx'
import DashboardLayout from '@/components/dashboard.layout.tsx'
import { VueSupprimesToggle } from '@/components/settings/vueSupprimesToggle.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
} from '@/constants/permissions.constant.ts'
import { can } from '@/hooks/useCan.ts'
import { findNameConflict } from '@/libs/nameConflict.ts'
import { useRoleMutations, useRolesQuery } from '@/queries/useRoles.ts'
import { useSoignantQueries } from '@/queries/useSoignant.ts'
import type { Role } from '@/types/role.ts'
import type { ServicePermission } from '@/utils/permissions.ts'
import { SERVICE_PERMISSION_KEYS } from '@/utils/permissions.ts'
import { resolveTenantContext } from '@/utils/tenant-context.ts'

export const Route = createFileRoute(
  '/_authenticated/e/$establishmentId/s/$serviceId/_settings/roles',
)({
  beforeLoad: ({ context, params }) => {
    const tenant = resolveTenantContext(context.authState.user, params)
    if (!can(tenant, 'roles:manage')) {
      throw redirect({
        to: '/e/$establishmentId/s/$serviceId/dashboard',
        params,
      })
    }
  },
  component: RolesSettings,
})

const NOUVEAU = 'nouveau'

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

const explicationRefus = (n: number) =>
  `Rôle attribué à ${n} membre${n > 1 ? 's' : ''} : changez leur rôle avant de le supprimer.`

function RoleEditor({
  role,
  copie,
  autres,
  soignants,
  onCreated,
  onDuplicate,
}: {
  role: Role | null
  // Rôle dont un nouveau rôle reprend les droits (« Dupliquer »).
  copie: Role | null
  autres: Role[]
  soignants: { id: string; name: string }[]
  onCreated: (role: Role) => void
  onDuplicate: (role: Role) => void
}) {
  const { createRole, updateRole } = useRoleMutations()
  const modele = role ?? copie
  const [name, setName] = useState(
    role?.name ?? (copie ? `Copie de ${copie.name}` : ''),
  )
  const [permissions, setPermissions] = useState<string[]>(
    modele?.permissions ?? [],
  )
  const [hidden, setHidden] = useState<string[]>(
    modele?.hiddenSoignantIds ?? [],
  )

  const conflit = findNameConflict(name, autres, undefined, role?.id)
  const input = { name: name.trim(), permissions, hiddenSoignantIds: hidden }
  const pending = createRole.isPending || updateRole.isPending

  return (
    <form
      className="flex flex-col gap-5 overflow-y-auto"
      onSubmit={(e) => {
        e.preventDefault()
        if (role) {
          updateRole.mutate({ id: role.id, ...input })
        } else {
          createRole.mutate(input, { onSuccess: onCreated })
        }
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="role-name" className="text-sm font-semibold">
          Nom du rôle
        </label>
        <Input
          id="role-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-80"
        />
        {conflit && (
          <p role="alert" className="text-sm text-destructive">
            Un rôle s'appelle déjà « {conflit.item.name} ».
          </p>
        )}
      </div>

      {PERMISSION_GROUPS.map((group) => (
        <fieldset key={group} className="flex flex-col gap-1">
          <legend className="text-sm font-semibold mb-1">{group}</legend>
          {SERVICE_PERMISSION_KEYS.filter(
            (k: ServicePermission) => PERMISSION_LABELS[k].group === group,
          ).map((key) => (
            <div key={key} className="flex flex-col">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={permissions.includes(key)}
                  onChange={() => setPermissions(toggle(permissions, key))}
                />
                {PERMISSION_LABELS[key].label}
              </label>
              {key === 'service-members:manage' &&
                permissions.includes(key) &&
                !permissions.includes('members:read') && (
                  <p className="ml-6 text-xs text-a-saisir-texte">
                    Nécessite aussi : {PERMISSION_LABELS['members:read'].label}
                  </p>
                )}
            </div>
          ))}
        </fieldset>
      ))}

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-semibold mb-1">
          Soignants masqués du Dashboard
        </legend>
        {soignants.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hidden.includes(s.id)}
              onChange={() => setHidden(toggle(hidden, s.id))}
            />
            {s.name}
          </label>
        ))}
      </fieldset>

      <div className="flex gap-3">
        <Button type="submit" disabled={!input.name || !!conflit || pending}>
          Enregistrer
        </Button>
        {role && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onDuplicate(role)}
          >
            <Copy className="w-4 h-4" />
            Dupliquer
          </Button>
        )}
      </div>
    </form>
  )
}

function RolesSettings() {
  const [showDeleted, setShowDeleted] = useState(false)
  const { roles, isPending } = useRolesQuery(showDeleted)
  const { roles: actifs } = useRolesQuery(false)
  const { soignants } = useSoignantQueries()
  const { deleteRole, restoreRole } = useRoleMutations()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [copie, setCopie] = useState<Role | null>(null)
  const choisir = (id: string | null) => {
    setSelectedId(id)
    setCopie(null)
  }
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)

  const soignantOptions = useMemo(
    () =>
      [...(soignants ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [soignants],
  )
  const selected =
    selectedId === NOUVEAU ? null : roles.find((r) => r.id === selectedId)

  return (
    <DashboardLayout>
      <div className="flex-1 min-h-0 bg-background p-6 rounded-lg flex flex-col w-full gap-4">
        <div className="flex justify-between items-center gap-3">
          <h1 className="h-9 flex items-center text-text-dark text-xl font-semibold">
            Rôles
          </h1>
          <div className="flex items-center gap-3">
            <VueSupprimesToggle
              showDeleted={showDeleted}
              onShowDeletedChange={(v) => {
                setShowDeleted(v)
                choisir(null)
              }}
              label="Rôles à afficher"
            />
            {!showDeleted && (
              <Button onClick={() => choisir(NOUVEAU)}>
                <Plus className="w-4 h-4" />
                Nouveau rôle
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-1 min-h-0 gap-6">
          <ul className="w-72 shrink-0 flex flex-col gap-1 overflow-y-auto">
            {isPending && <li className="text-sm">Chargement...</li>}
            {roles.map((role) => (
              <li
                key={role.id}
                className="flex items-center justify-between gap-2"
              >
                {showDeleted ? (
                  <>
                    <span className="truncate text-sm">{role.name}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreRole.mutate(role.id)}
                    >
                      Restaurer
                    </Button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`flex-1 text-left rounded-md px-2 py-1 text-sm cursor-pointer hover:bg-card ${selectedId === role.id ? 'bg-card font-semibold' : ''}`}
                      onClick={() => choisir(role.id)}
                    >
                      {role.name}
                      <span className="block text-xs text-text-light">
                        {role.memberCount} membre
                        {role.memberCount > 1 ? 's' : ''}
                      </span>
                    </button>
                    <Button
                      variant="icon-danger"
                      size="icon-md"
                      aria-label={`Supprimer le rôle ${role.name}`}
                      title={
                        role.memberCount > 0
                          ? explicationRefus(role.memberCount)
                          : 'Supprimer'
                      }
                      disabled={role.memberCount > 0}
                      onClick={() => setDeleteTarget(role)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>

          {!showDeleted && (selectedId === NOUVEAU || selected) && (
            <RoleEditor
              key={`${selectedId}-${copie?.id ?? ''}`}
              role={selected ?? null}
              copie={copie}
              autres={actifs}
              soignants={soignantOptions}
              onCreated={(cree) => choisir(cree.id)}
              onDuplicate={(source) => {
                setSelectedId(NOUVEAU)
                setCopie(source)
              }}
            />
          )}
        </div>

        <ConfirmDeleteForm
          open={!!deleteTarget}
          setOpen={(open) => {
            if (!open) {
              setDeleteTarget(null)
            }
          }}
          onConfirm={() => {
            if (deleteTarget) {
              deleteRole.mutate(deleteTarget.id)
              if (selectedId === deleteTarget.id) {
                choisir(null)
              }
            }
            setDeleteTarget(null)
          }}
          loading={deleteRole.isPending}
          title="Supprimer le rôle"
          description="Il n'est plus proposé aux membres. Il se restaure depuis l'onglet « Supprimés »."
        />
      </div>
    </DashboardLayout>
  )
}
