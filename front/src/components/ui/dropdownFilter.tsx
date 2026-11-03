import { Check, ChevronDown, Filter, type LucideIcon } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { Fragment } from 'react'

import { cn } from '../../libs/utils.ts'
import { Button } from './button'

export type DropdownFilterItem = {
  id: string
  label: string
  checked: boolean
  group?: string
  color?: string
  count?: number
}

/** Single action rendered above a separator at the top of the menu. */
export type DropdownFilterAction = {
  label: string
  icon?: LucideIcon
  onSelect: () => void
}

const DropdownFilter = ({
  filters,
  onFilterChange,
  triggerLabel = 'Filtres',
  TriggerIcon = Filter,
  headerAction,
  actif,
  compteur,
  titreCompteur,
}: {
  filters: DropdownFilterItem[]
  onFilterChange: (id: string, checked: boolean) => void
  triggerLabel?: string
  TriggerIcon?: LucideIcon
  headerAction?: DropdownFilterAction
  /** Fourni : déclencheur à chevron ; vrai, filtre mis en avant avec son compteur. */
  actif?: boolean
  compteur?: number
  titreCompteur?: string
}) => {
  const HeaderIcon = headerAction?.icon

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {actif === undefined ? (
          <Button
            variant="outline"
            size="default"
            className="font-normal rounded-lg"
          >
            <TriggerIcon size={16} />
            {triggerLabel}
          </Button>
        ) : (
          <Button
            variant="outline"
            title={actif ? titreCompteur : undefined}
            aria-label={actif ? `${triggerLabel}, ${titreCompteur}` : undefined}
            className={cn(
              // Au retour de la liste (Échap), un fond plutôt que l'anneau bleu.
              'gap-[7px] rounded-lg pr-2.5 pl-3 text-foreground focus-visible:bg-muted focus-visible:ring-0',
              actif &&
                'border-[#93c5fd] bg-blue-50 hover:bg-blue-100 focus-visible:bg-blue-100',
            )}
          >
            <TriggerIcon size={16} />
            {triggerLabel}
            {actif && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-[5px] text-xs font-bold text-white">
                {compteur}
              </span>
            )}
            <ChevronDown size={14} className="text-text-light" />
          </Button>
        )}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[220px] max-h-80 overflow-y-auto bg-primary-foreground rounded shadow-md border border-border p-2 z-50"
          align="end"
          sideOffset={5}
          collisionPadding={8}
        >
          {headerAction && (
            <>
              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault()
                  headerAction.onSelect()
                }}
                className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer outline-none hover:bg-primary/20 text-sm select-none"
              >
                {HeaderIcon && <HeaderIcon size={14} />}
                {headerAction.label}
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-2 h-px bg-border" />
            </>
          )}

          {filters.map((filter, index) => {
            const startsGroup =
              Boolean(filter.group) &&
              filter.group !== filters[index - 1]?.group

            return (
              <Fragment key={filter.id}>
                {startsGroup && (
                  <>
                    {index > 0 && (
                      <DropdownMenu.Separator className="my-2 h-px bg-border" />
                    )}
                    <DropdownMenu.Label className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-text-light select-none">
                      {filter.group}
                    </DropdownMenu.Label>
                  </>
                )}

                <DropdownMenu.CheckboxItem
                  checked={filter.checked}
                  onCheckedChange={(checked) =>
                    onFilterChange(filter.id, checked)
                  }
                  onSelect={(e) => e.preventDefault()}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded cursor-pointer outline-none',
                    'hover:bg-primary/20',
                  )}
                >
                  <div className="w-4 h-4 border border-primary rounded flex items-center justify-center">
                    {filter.checked && (
                      <Check
                        size={12}
                        strokeWidth={3}
                        className="text-primary"
                      />
                    )}
                  </div>
                  {filter.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: filter.color }}
                    />
                  )}
                  <span className="flex-1 text-sm select-none">
                    {filter.label}
                  </span>
                  {filter.count !== undefined && (
                    <span className="text-xs text-text-light tabular-nums">
                      {filter.count}
                    </span>
                  )}
                </DropdownMenu.CheckboxItem>
              </Fragment>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export default DropdownFilter
