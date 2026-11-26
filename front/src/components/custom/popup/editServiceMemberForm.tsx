import { Check, Pencil, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useAppForm } from '../../../hooks/formConfig.tsx'
import { useGrantableRoles } from '../../../queries/useRoles.ts'
import { useServiceMemberMutations } from '../../../queries/useServiceMembers.ts'
import type { ServiceMember } from '../../../types/serviceMember.ts'
import { Button } from '../../ui/button.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
  PopupTrigger,
} from '../../ui/popup.tsx'

// MDS-17 : le role de CE service, et rien d'autre. Le rattachement a l'etablissement et les
// affectations aux autres services restent a l'administration (`members:manage`).
function EditServiceMemberForm({ member }: { member: ServiceMember }) {
  const [open, setOpen] = useState(false)
  const { setRole } = useServiceMemberMutations()
  const { roles } = useGrantableRoles()
  // Le rôle actuel reste affiché même supprimé ou hors des droits de l'appelant.
  const roleOptions = [
    ...roles.map((r) => ({ value: r.id, label: r.name })),
    ...(roles.some((r) => r.id === member.role.id)
      ? []
      : [{ value: member.role.id, label: member.role.name }]),
  ]

  const form = useAppForm({
    defaultValues: { roleId: member.role.id },
    onSubmit: ({ value }) => {
      setRole.mutate({ affectationId: member.id, roleId: value.roleId })
      setOpen(false)
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({ roleId: member.role.id })
    }
  }, [open, member, form])

  return (
    <Popup modal={true} open={open} onOpenChange={setOpen}>
      <PopupTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setOpen(true)}
          title="Changer le rôle dans le service"
        >
          <Pencil className="w-4 h-4" />
        </Button>
      </PopupTrigger>

      <PopupContent>
        <PopupHeader>
          <PopupTitle className="font-bold text-xl">
            Rôle dans le service
          </PopupTitle>
        </PopupHeader>

        <PopupBody>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await form.handleSubmit()
            }}
            className="space-y-4 max-w-md"
          >
            <p className="text-sm text-text-dark font-medium">
              {member.user.email}
            </p>

            <form.AppField name="roleId">
              {(field) => (
                <field.Select
                  label="Rôle"
                  options={roleOptions}
                  clearable={false}
                />
              )}
            </form.AppField>
          </form>
        </PopupBody>

        <PopupFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            <X className="w-4 h-4" />
            Annuler
          </Button>
          <Button
            variant="default"
            onClick={() => form.handleSubmit()}
            isLoading={setRole.isPending}
          >
            <Check className="w-4 h-4" />
            Enregistrer
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}

export default EditServiceMemberForm
