import { useStore } from '@tanstack/react-form'
import { Check, Plus, X } from 'lucide-react'
import type React from 'react'
import { useEffect, useState } from 'react'

import { useAppForm } from '../../../hooks/formConfig.tsx'
import { findNameConflict } from '../../../libs/nameConflict.ts'
import {
  useLocationMutations,
  useLocationQueries,
} from '../../../queries/useLocation.ts'
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

interface AddLocationFormProps {
  trigger?: React.ReactNode
  /** Montre la salle existante dans la liste quand le nom tapé est déjà pris. */
  onShowExisting?: (name: string) => void
}

function AddLocationForm({ trigger, onShowExisting }: AddLocationFormProps) {
  const [open, setOpen] = useState(false)
  const { createLocation, restoreLocation } = useLocationMutations()
  const { locations } = useLocationQueries()
  const { locations: archivedLocations } = useLocationQueries(true)

  const form = useAppForm({
    defaultValues: {
      name: '',
    },
    onSubmit: ({ value }) => {
      createLocation.mutate({ name: value.name })
      setOpen(false)
    },
  })

  useEffect(() => {
    if (open) {
      form.reset()
    }
  }, [open, form])

  const name = useStore(form.store, (state) => state.values.name)
  const conflict = findNameConflict(name, locations, archivedLocations)
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
            Nouvelle salle
          </Button>
        )}
      </PopupTrigger>

      <PopupContent>
        <PopupHeader>
          <PopupTitle className="font-bold text-xl">
            Ajouter une salle
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
              noun="Une salle"
              feminine={true}
              restoring={restoreLocation.isPending}
              onRestore={(item) =>
                restoreLocation.mutate(item.id, {
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
          </form>
        </PopupBody>

        <PopupFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            <X className="w-4 h-4" />
            Annuler
          </Button>
          <Button
            variant="default"
            isLoading={createLocation.isPending}
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

export default AddLocationForm
