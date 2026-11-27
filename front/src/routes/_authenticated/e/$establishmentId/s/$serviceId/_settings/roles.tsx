import { createFileRoute, redirect } from '@tanstack/react-router'
import { ChevronRight, Plus, Users } from 'lucide-react'
import { useState } from 'react'

import { ConfirmDeleteForm } from '@/components/custom/popup/confirmDeleteForm.tsx'
import { RoleEditor } from '@/components/custom/roles/roleEditor.tsx'
import { RolesOverview } from '@/components/custom/roles/rolesOverview.tsx'
import {
  countPermissions,
  membres,
  TOTAL_PERMISSIONS,
} from '@/components/custom/roles/roleText.ts'
import DashboardLayout from '@/components/dashboard.layout.tsx'
import { VueSupprimesToggle } from '@/components/settings/vueSupprimesToggle.tsx'
import { Button } from '@/components/ui/button.tsx'
import { can } from '@/hooks/useCan.ts'
import { cn } from '@/libs/utils.ts'
import { useRoleMutations, useRolesQuery } from '@/queries/useRoles.ts'
import type { Role } from '@/types/role.ts'
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
// Sélection par défaut : l'aperçu de tous les rôles, en lecture seule.
const APERCU = 'apercu'

function RolesSettings() {
  const [showDeleted, setShowDeleted] = useState(false)
  const { roles, isPending } = useRolesQuery(showDeleted)
  const { roles: actifs } = useRolesQuery(false)
  const { deleteRole, restoreRole } = useRoleMutations()
  const [selectedId, setSelectedId] = useState<string>(APERCU)
  const [copie, setCopie] = useState<Role | null>(null)
  // Le rôle rendu par la création, le temps que la liste se recharge.
  const [cree, setCree] = useState<Role | null>(null)
  const choisir = (id: string) => {
    setSelectedId(id)
    setCopie(null)
  }
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)

  const selected =
    selectedId === NOUVEAU
      ? null
      : (roles.find((r) => r.id === selectedId) ??
        (cree?.id === selectedId ? cree : undefined))

  return (
    <DashboardLayout>
      <div className="flex-1 min-h-0 bg-background rounded-lg flex flex-col w-full overflow-hidden">
        <div className="flex justify-between items-center gap-3 px-6 py-4 border-b border-border">
          <h1 className="h-9 flex items-center text-text-dark text-xl font-semibold">
            Rôles
          </h1>
          <div className="flex items-center gap-3">
            <VueSupprimesToggle
              showDeleted={showDeleted}
              onShowDeletedChange={(v) => {
                setShowDeleted(v)
                choisir(APERCU)
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

        <div className="flex flex-1 min-h-0">
          <aside className="w-72 shrink-0 flex flex-col gap-1 overflow-y-auto border-r border-border p-3.5">
            {!showDeleted && (
              <>
                <Button
                  variant="outline"
                  onClick={() => choisir(APERCU)}
                  aria-pressed={selectedId === APERCU}
                  className={cn(
                    'w-full justify-start gap-2 font-semibold shadow-sm',
                    selectedId === APERCU &&
                      'bg-primary/10 border-transparent text-primary shadow-none hover:text-primary',
                  )}
                >
                  <Users className="w-4 h-4" />
                  <span className="flex-1 text-left">Aperçu des rôles</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <hr className="my-2 mx-1 border-border" />
              </>
            )}
            {isPending && <p className="px-3 text-sm">Chargement...</p>}
            <ul className="flex flex-col gap-1">
              {roles.map((role) => (
                <li key={role.id}>
                  {showDeleted ? (
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="truncate text-sm">{role.name}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => restoreRole.mutate(role.id)}
                      >
                        Restaurer
                      </Button>
                    </div>
                  ) : (
                    <RoleItem
                      role={role}
                      selected={selectedId === role.id}
                      onSelect={() => choisir(role.id)}
                    />
                  )}
                </li>
              ))}
            </ul>
          </aside>

          {!showDeleted && selectedId === APERCU && (
            <RolesOverview roles={actifs} onOpen={(role) => choisir(role.id)} />
          )}
          {!showDeleted && (selectedId === NOUVEAU || selected) && (
            <RoleEditor
              key={`${selectedId}-${copie?.id ?? ''}`}
              role={selected ?? null}
              copie={copie}
              autres={actifs}
              onCreated={(role) => {
                setCree(role)
                choisir(role.id)
              }}
              onDuplicate={(source) => {
                setSelectedId(NOUVEAU)
                setCopie(source)
              }}
              onDelete={setDeleteTarget}
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
                choisir(APERCU)
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

// Un rôle de la liste : nom, membres, et la part des droits du catalogue qu'il accorde.
function RoleItem({
  role,
  selected,
  onSelect,
}: {
  role: Role
  selected: boolean
  onSelect: () => void
}) {
  const count = countPermissions(role)
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'w-full flex flex-col gap-1.5 rounded-lg px-3 py-2.5 text-left cursor-pointer hover:bg-primary/5',
        selected && 'bg-primary/10 hover:bg-primary/10',
      )}
    >
      <span className="flex items-baseline gap-2">
        <span
          className={cn(
            'flex-1 truncate text-[15px] text-text-dark',
            selected ? 'font-semibold' : 'font-medium',
          )}
        >
          {role.name}
        </span>
        <span className="text-xs text-text-light">
          {membres(role.memberCount)}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <span className="flex-1 h-1 rounded-full bg-border overflow-hidden">
          <span
            className={cn(
              'block h-full',
              selected ? 'bg-primary' : 'bg-[#94a3b8]',
            )}
            style={{ width: `${(100 * count) / TOTAL_PERMISSIONS}%` }}
          />
        </span>
        <span className="text-[11px] text-text-light">{count} droits</span>
      </span>
    </button>
  )
}
