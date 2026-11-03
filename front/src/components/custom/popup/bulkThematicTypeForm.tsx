import { Pencil, X } from 'lucide-react'
import { useState } from 'react'

import { APPOINTMENT_TYPE_OPTIONS } from '../../../constants/appointment.constant.ts'
import { thematicLabel } from '../../../libs/utils.ts'
import { useThematicQueries } from '../../../queries/useThematic.ts'
import type { Thematic } from '../../../types/thematic.ts'
import { Button } from '../../ui/button.tsx'
import { FormField } from '../../ui/formField.tsx'
import { Label } from '../../ui/label.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../../ui/popup.tsx'
import { Select } from '../../ui/select.tsx'

export type ThematicTypeChanges = {
  thematicId?: string | null
  type?: string | null
}

// Valeur de liste qui vide le champ ; '' reste « inchangé ».
const NONE = '__none__'
const fromChoice = (value: string) => (value === NONE ? null : value)

// Comme le formulaire d'un créneau : une thématique n'est proposée que si chaque créneau a un soignant qui la pratique.
export const commonThematics = (
  thematics: Thematic[],
  soignantIdsPerSlot: string[][],
) =>
  thematics.filter((thematic) =>
    soignantIdsPerSlot.every((soignantIds) =>
      thematic.soignants.some((soignant) => soignantIds.includes(soignant.id)),
    ),
  )

export function BulkThematicTypeForm({
  open,
  setOpen,
  soignantIdsPerSlot,
  onConfirm,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  soignantIdsPerSlot: string[][]
  onConfirm: (changes: ThematicTypeChanges) => void
}) {
  const { thematics } = useThematicQueries()
  const [thematicId, setThematicId] = useState('')
  const [type, setType] = useState('')
  const count = soignantIdsPerSlot.length
  const thematicOptions = [
    { value: NONE, label: 'Vide' },
    ...commonThematics(thematics ?? [], soignantIdsPerSlot)
      .map((t) => ({ value: t.id, label: thematicLabel(t) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr')),
  ]

  const close = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setThematicId('')
      setType('')
    }
  }

  return (
    <Popup modal open={open} onOpenChange={close}>
      <PopupContent>
        <PopupHeader>
          <PopupTitle className="font-bold text-xl">
            Modifier la thématique et le type
          </PopupTitle>
        </PopupHeader>

        <PopupBody className="flex flex-col gap-4">
          <p className="text-sm text-text-light">
            {count} créneau{count > 1 ? 'x' : ''} sélectionné
            {count > 1 ? 's' : ''}. « Vide » efface la valeur, « Inchangé » la
            conserve.
          </p>

          <FormField>
            <Label>Thématique</Label>
            <Select
              options={thematicOptions}
              placeholder="Inchangée"
              value={thematicId}
              onValueChange={setThematicId}
            />
          </FormField>

          <FormField>
            <Label>Type</Label>
            <Select
              options={[
                { value: NONE, label: 'Vide' },
                ...APPOINTMENT_TYPE_OPTIONS,
              ]}
              placeholder="Inchangé"
              value={type}
              onValueChange={setType}
            />
          </FormField>
        </PopupBody>

        <PopupFooter>
          <Button variant="outline" onClick={() => close(false)}>
            <X className="w-4 h-4" />
            Annuler
          </Button>
          <Button
            variant="default"
            disabled={!(thematicId || type)}
            onClick={() => {
              onConfirm({
                ...(thematicId && { thematicId: fromChoice(thematicId) }),
                ...(type && { type: fromChoice(type) }),
              })
              close(false)
            }}
          >
            <Pencil className="w-4 h-4" />
            Modifier
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
