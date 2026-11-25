import { useStore } from '@tanstack/react-form'
import { Check, Plus, X } from 'lucide-react'
import type React from 'react'
import { useEffect, useMemo, useState } from 'react'

import { SLOT_DURATION_OPTIONS } from '../../../constants/slot.constant.ts'
import {
  INTERNAL_HELP,
  NO_THEMATIC_ROLE,
  PDF_NOTICE_HELP,
  THEMATIC_ROLE_OPTIONS,
  type ThematicRole,
} from '../../../constants/thematic.constant.ts'
import { useAppForm } from '../../../hooks/formConfig.tsx'
import { findNameConflict } from '../../../libs/nameConflict.ts'
import { useSoignantQueries } from '../../../queries/useSoignant.ts'
import {
  useThematicMutations,
  useThematicQueries,
} from '../../../queries/useThematic.ts'
import type { Thematic } from '../../../types/thematic.ts'
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
import { NameConflictNotice } from '../form/nameConflictNotice.tsx'
import { ThematicRoleHelp } from '../thematicRoleHelp.tsx'

interface AddThematicFormProps {
  trigger?: React.ReactNode
  /** Montre la thématique existante dans la liste quand le nom tapé est déjà pris. */
  onShowExisting?: (name: string) => void
}

const thematicDetails = (thematic: Thematic) => [
  ...(thematic.duration ? [`${thematic.duration} min`] : []),
  ...thematic.soignants.map((s) => s.name),
]

function AddThematicForm({ trigger, onShowExisting }: AddThematicFormProps) {
  const [open, setOpen] = useState(false)
  const { createThematic, restoreThematic } = useThematicMutations()
  const { soignants } = useSoignantQueries()
  const { thematics } = useThematicQueries()
  const { thematics: archivedThematics } = useThematicQueries(true)

  const soignantOptions = useMemo(
    () =>
      [...(soignants ?? [])]
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        .map((s) => ({ value: s.id, label: s.name })),
    [soignants],
  )

  const form = useAppForm({
    defaultValues: {
      name: '',
      duration: 15,
      pdfNotice: '',
      role: NO_THEMATIC_ROLE,
      internal: false,
      soignantIDs: [] as string[],
    },
    onSubmit: ({ value }) => {
      createThematic.mutate(
        {
          name: value.name,
          duration: Number(value.duration),
          // Une consigne vide vaut « pas de consigne » : null plutot qu'une chaine vide.
          pdfNotice: value.pdfNotice.trim() || null,
          role:
            value.role === NO_THEMATIC_ROLE
              ? null
              : (value.role as ThematicRole),
          internal: value.internal,
          soignantIDs: value.soignantIDs,
        },
        { onSuccess: () => setOpen(false) },
      )
    },
  })

  useEffect(() => {
    if (open) {
      form.reset()
    }
  }, [open, form])

  const name = useStore(form.store, (state) => state.values.name)
  const conflict = findNameConflict(name, thematics, archivedThematics)
  const submit = async () => {
    if (!conflict) {
      await form.handleSubmit()
    }
  }

  return (
    <Popup modal={true} open={open} onOpenChange={setOpen}>
      <PopupTrigger asChild>
        {trigger ?? (
          <Button variant="default" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" />
            Nouvelle thématique
          </Button>
        )}
      </PopupTrigger>

      <PopupContent>
        <PopupHeader>
          <PopupTitle className="font-bold text-xl">
            Ajouter une thématique
          </PopupTitle>
        </PopupHeader>

        <PopupBody>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await form.validate('submit')
              await submit()
            }}
            className="space-y-4 max-w-md"
          >
            <form.AppField
              name="name"
              validators={{
                onSubmit: ({ value }) =>
                  value ? undefined : 'Le nom est nécessaire',
              }}
            >
              {(field) => <field.Input label="Nom" />}
            </form.AppField>

            <NameConflictNotice
              conflict={conflict}
              noun="Une thématique"
              feminine={true}
              details={thematicDetails}
              restoring={restoreThematic.isPending}
              onRestore={(thematic) =>
                restoreThematic.mutate(thematic.id, {
                  onSuccess: () => setOpen(false),
                })
              }
              onShowExisting={
                onShowExisting &&
                ((thematic) => {
                  setOpen(false)
                  onShowExisting(thematic.name)
                })
              }
            />

            <form.AppField name="duration">
              {(field) => (
                <field.Select
                  options={SLOT_DURATION_OPTIONS}
                  label="Durée par défaut"
                />
              )}
            </form.AppField>

            <form.AppField name="pdfNotice">
              {(field) => (
                <field.TextArea
                  label="Consigne affichée dans le programme PDF"
                  description={PDF_NOTICE_HELP}
                />
              )}
            </form.AppField>

            <form.AppField name="role">
              {(field) => (
                <field.Select
                  options={THEMATIC_ROLE_OPTIONS}
                  label="Rôle dans les indicateurs"
                  hint={<ThematicRoleHelp />}
                  clearable={false}
                />
              )}
            </form.AppField>

            <form.AppField name="internal">
              {(field) => (
                <field.Checkbox
                  label="Interne, sans patient"
                  description={INTERNAL_HELP}
                />
              )}
            </form.AppField>

            <form.AppField name="soignantIDs">
              {(field) => (
                <field.MultiSelect
                  label="Soignants"
                  options={soignantOptions}
                  placeholder="Sélectionner des soignants"
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
            isLoading={createThematic.isPending}
            disabled={!!conflict}
            title={conflict ? 'Nom déjà pris' : undefined}
            onClick={submit}
          >
            <Check className="w-4 h-4" />
            Ajouter
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}

export default AddThematicForm
