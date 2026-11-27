import { useId } from 'react'

import {
  type PermissionCard as Card,
  isGranted,
  levelOf,
  NO_LEVEL,
  type PermissionRow,
  rowValue,
  withLevel,
} from '../../../constants/roleLayout.ts'
import { cn } from '../../../libs/utils.ts'
import { Switch } from '../../ui/switch.tsx'
import { ToggleGroup, ToggleGroupItem } from '../../ui/toggle-group.tsx'
import { SEGMENT, SEGMENTS } from '../Calendar/barreCalendrier.tsx'

type Props = {
  card: Card
  permissions: string[]
  initial: readonly string[]
  onChange: (permissions: string[]) => void
}

// Une carte de droits : un écran, ses interrupteurs et ses niveaux. Un point ambre signale une
// ligne modifiée mais pas encore enregistrée.
export function PermissionCard({
  card,
  permissions,
  initial,
  onChange,
}: Props) {
  const granted = card.rows.filter((row) => isGranted(row, permissions)).length
  return (
    <section className="break-inside-avoid mb-3.5 rounded-[10px] border border-border bg-background px-4 pt-3 pb-1.5">
      <header className="flex items-center gap-2 pb-1.5">
        <h3 className="flex-1 text-sm font-bold text-text-dark">
          {card.title}
        </h3>
        <span className="text-xs text-text-light">
          {granted}/{card.rows.length}
        </span>
      </header>
      {card.rows.map((row) => (
        <Row
          key={row.label}
          row={row}
          permissions={permissions}
          changed={rowValue(row, permissions) !== rowValue(row, initial)}
          onChange={onChange}
        />
      ))}
    </section>
  )
}

function Row({
  row,
  permissions,
  changed,
  onChange,
}: {
  row: PermissionRow
  permissions: string[]
  changed: boolean
  onChange: (permissions: string[]) => void
}) {
  const id = useId()
  const on = isGranted(row, permissions)
  return (
    <div className="flex items-center gap-3 py-2 border-t border-muted">
      <label
        htmlFor={row.kind === 'toggle' ? id : undefined}
        id={`${id}-label`}
        className={cn(
          'flex-1 text-sm',
          on ? 'text-text-dark' : 'text-text-light',
        )}
      >
        {row.label}
      </label>
      {changed && (
        <span
          title="Modifié, pas encore enregistré"
          className="w-2 h-2 shrink-0 rounded-full bg-a-saisir"
        />
      )}
      {row.kind === 'toggle' ? (
        <Switch
          id={id}
          checked={on}
          onCheckedChange={(checked) =>
            onChange(
              checked
                ? [...permissions, row.key]
                : permissions.filter((p) => p !== row.key),
            )
          }
        />
      ) : (
        <ToggleGroup
          aria-labelledby={`${id}-label`}
          className={SEGMENTS}
          value={levelOf(row, permissions)}
          onValueChange={(value) =>
            value && onChange(withLevel(row, permissions, value))
          }
        >
          {[NO_LEVEL, ...row.levels.map((l) => l.label)].map((label) => (
            <ToggleGroupItem
              key={label}
              value={label}
              className={cn(SEGMENT, 'h-7 px-2.5 text-xs whitespace-nowrap')}
            >
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
    </div>
  )
}
