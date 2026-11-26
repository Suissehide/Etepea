import { Check, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { InvitationSent } from '@/components/custom/invitationSent.tsx'
import { useAppForm } from '@/hooks/formConfig.tsx'
import { buildAccessLinkUrl } from '@/libs/accessLink.ts'
import { useRolesQuery } from '@/queries/useRoles.ts'
import { useServiceMemberMutations } from '@/queries/useServiceMembers.ts'
import { useSoignantQueries } from '@/queries/useSoignant.ts'
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

// MDS-17 : le coordinateur invite dans SON service. Ni service ni role d'etablissement a choisir
// — le back pose le premier depuis le tenant resolu, et le second est toujours « Membre ».
//
// DEUX ISSUES, ET LA POPUP LES DISTINGUE. Une adresse sans compte ici recoit un e-mail
// d'invitation (MDS-35) et son LIEN DE PREMIERE CONNEXION s'affiche ici UNE SEULE FOIS, pour la
// remise en main propre (c'est un mot de passe a usage unique) ; un compte deja rattache ici ou
// en poste dans un autre etablissement n'en recoit aucun — il a deja le sien. Rien d'autre n'est rendu par la route, a
// dessein : le nom stocke et l'identifiant d'un compte preexistant seraient des oracles
// d'existence (voir `inviteToService`, back).
function InviteServiceMemberForm() {
  const [open, setOpen] = useState(false)
  const { inviteMember } = useServiceMemberMutations()
  const { soignants } = useSoignantQueries()
  const { roles } = useRolesQuery()
  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name }))
  // Pré-sélection : le rôle issu du préréglage Intervenant, s'il existe encore.
  const defaultRoleId =
    roles.find((r) => r.preset === 'INTERVENANT')?.id ?? roles[0]?.id ?? ''
  const soignantOptions = useMemo(
    () =>
      [...(soignants ?? [])]
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        .map((s) => ({ value: s.id, label: s.name })),
    [soignants],
  )

  const form = useAppForm({
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      roleId: '',
      soignantId: '',
    },
    onSubmit: ({ value }) => {
      inviteMember.mutate({
        email: value.email,
        firstName: value.firstName || undefined,
        lastName: value.lastName || undefined,
        roleId: value.roleId,
        soignantId: value.soignantId || null,
      })
    },
  })

  const closeAndReset = () => {
    setOpen(false)
    inviteMember.reset()
  }

  useEffect(() => {
    if (open) {
      form.reset()
    }
  }, [open, form])

  useEffect(() => {
    if (open && !form.getFieldValue('roleId')) {
      form.setFieldValue('roleId', defaultRoleId)
    }
  }, [open, form, defaultRoleId])

  const invited = inviteMember.data

  return (
    <Popup
      modal={true}
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : closeAndReset())}
    >
      <PopupTrigger asChild>
        <Button variant="default" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Inviter
        </Button>
      </PopupTrigger>

      <PopupContent>
        <PopupHeader>
          <PopupTitle className="font-bold text-xl">
            {invited ? 'Invitation envoyée' : 'Inviter dans le service'}
          </PopupTitle>
        </PopupHeader>

        {invited ? (
          <>
            <PopupBody>
              <InvitationSent
                email={inviteMember.variables?.email ?? ''}
                link={
                  invited.accessLink
                    ? buildAccessLinkUrl(invited.accessLink.token)
                    : null
                }
                existingAccountMessage="Elle avait déjà un compte Etepea : elle accède au service avec son mot de passe habituel."
              />
            </PopupBody>
            <PopupFooter>
              <Button variant="default" onClick={closeAndReset}>
                <Check className="w-4 h-4" />
                Fermer
              </Button>
            </PopupFooter>
          </>
        ) : (
          <>
            <PopupBody>
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  await form.validate('submit')
                  await form.handleSubmit()
                }}
                className="space-y-4 max-w-md"
              >
                <form.AppField
                  name="email"
                  validators={{
                    onSubmit: ({ value }) =>
                      value ? undefined : "L'e-mail est nécessaire",
                  }}
                >
                  {(field) => (
                    <field.Input
                      label="E-mail"
                      type="email"
                      placeholder="personne@exemple.fr"
                    />
                  )}
                </form.AppField>

                <p className="text-xs text-text-light">
                  Si cette adresse a déjà un compte Etepea, elle est simplement
                  affectée à ce service. Sinon, un compte est créé et un lien de
                  première connexion s'affiche ici.
                </p>

                {/* Prénom et nom ne servent qu'au compte CRÉÉ : un compte existant garde
                le sien, jamais écrasé. */}
                <form.AppField name="lastName">
                  {(field) => <field.Input label="Nom" />}
                </form.AppField>

                <form.AppField name="firstName">
                  {(field) => <field.Input label="Prénom" />}
                </form.AppField>

                <form.AppField
                  name="roleId"
                  validators={{
                    onSubmit: ({ value }) =>
                      value ? undefined : 'Le rôle est nécessaire',
                  }}
                >
                  {(field) => (
                    <field.Select
                      label="Rôle dans le service"
                      options={roleOptions}
                      clearable={false}
                    />
                  )}
                </form.AppField>

                <form.AppField name="soignantId">
                  {(field) => (
                    <field.Select
                      label="Soignant"
                      options={soignantOptions}
                      placeholder="Aucun"
                      description="Le métier que la personne exerce dans ce service. Elle pourra le changer dans ses paramètres."
                    />
                  )}
                </form.AppField>
              </form>
            </PopupBody>

            <PopupFooter>
              <Button variant="outline" onClick={closeAndReset}>
                <X className="w-4 h-4" />
                Annuler
              </Button>
              <Button
                variant="default"
                onClick={() => form.handleSubmit()}
                isLoading={inviteMember.isPending}
              >
                <Check className="w-4 h-4" />
                Inviter
              </Button>
            </PopupFooter>
          </>
        )}
      </PopupContent>
    </Popup>
  )
}

export default InviteServiceMemberForm
