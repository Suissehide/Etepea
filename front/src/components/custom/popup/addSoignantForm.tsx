import { useStore } from '@tanstack/react-form'
import { Check, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useAppForm } from '../../../hooks/formConfig.tsx'
import { findNameConflict } from '../../../libs/nameConflict.ts'
import {
  useSoignantMutations,
  useSoignantQueries,
} from '../../../queries/useSoignant.ts'
import {
  useThematicMutations,
  useThematicQueries,
} from '../../../queries/useThematic.ts'
import type { Soignant } from '../../../types/soignant.ts'
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

interface AddSoignantFormProps {
  /** Montre le soignant existant dans la liste quand le nom tapé est déjà pris. */
  onShowExisting?: (name: string) => void
}

const soignantDetails = (soignant: Soignant) => [
  ...(soignant.inactive ? ['Inactif'] : []),
  ...(soignant.hidden ? ['Masqué'] : []),
]

function AddSoignantForm({ onShowExisting }: AddSoignantFormProps) {
  const [open, setOpen] = useState(false)
  const { createSoignant, restoreSoignant } = useSoignantMutations()
  // Les inactifs comptent : leur nom est pris, ils sont seulement masqués des choix.
  const { allSoignants } = useSoignantQueries()
  const { soignants: archivedSoignants } = useSoignantQueries(true)
  const { thematics } = useThematicQueries()
  const { updateThematic } = useThematicMutations()

  const thematicOptions =
    thematics
      ?.slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      .map((t) => ({ value: t.id, label: t.name })) ?? []

  const form = useAppForm({
    defaultValues: {
      name: '',
      thematicIDs: [] as string[],
    },
    onSubmit: ({ value }) => {
      createSoignant.mutate(
        { name: value.name },
        {
          onSuccess: (createdSoignant) => {
            for (const thematicID of value.thematicIDs) {
              const thematic = thematics?.find((t) => t.id === thematicID)
              if (thematic) {
                updateThematic.mutate({
                  id: thematicID,
                  soignantIDs: [
                    ...thematic.soignants.map((s) => s.id),
                    createdSoignant.id,
                  ],
                })
              }
            }
          },
        },
      )
      setOpen(false)
    },
  })

  useEffect(() => {
    if (open) {
      form.reset()
    }
  }, [open, form])

  const name = useStore(form.store, (state) => state.values.name)
  const conflict = findNameConflict(name, allSoignants, archivedSoignants)
  const submit = async () => {
    if (!conflict) {
      await form.handleSubmit()
    }
  }

  return (
    <Popup modal={true} open={open} onOpenChange={setOpen}>
      <PopupTrigger asChild>
        <Button variant="default" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Nouveau soignant
        </Button>
      </PopupTrigger>

      <PopupContent>
        <PopupHeader>
          <PopupTitle className="font-bold text-xl">
            Ajouter un soignant
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
              noun="Un soignant"
              feminine={false}
              details={soignantDetails}
              restoring={restoreSoignant.isPending}
              onRestore={(item) =>
                restoreSoignant.mutate(item.id, {
                  onSuccess: () => setOpen(false),
                })
              }
              onShowExisting={
                onShowExisting &&
                ((item) => {
                  setOpen(false)
                  onShowExisting(item.name)
                })
              }
            />

            <form.AppField name="thematicIDs">
              {(field) => (
                <field.MultiSelect
                  label="Thématiques"
                  options={thematicOptions}
                  placeholder="Sélectionner des thématiques"
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
            disabled={!!conflict}
            title={conflict ? 'Nom déjà pris' : undefined}
            onClick={submit}
            isLoading={createSoignant.isPending}
          >
            <Check className="w-4 h-4" />
            Ajouter
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}

export default AddSoignantForm
