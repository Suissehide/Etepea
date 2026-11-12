import type {
  ButtonStateMap,
  CalendarController,
  ViewApi,
} from '@fullcalendar/react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../../../libs/utils.ts'
import { Button } from '../../ui/button.tsx'
import { ToggleGroup, ToggleGroupItem } from '../../ui/toggle-group.tsx'

export type VueCalendrier = { type: string; libelle?: string }

/** Ce que la barre utilise du contrôleur : l'agenda, sans FullCalendar, fournit le sien. */
export type ControleurBarre = Pick<
  CalendarController,
  'prev' | 'next' | 'today'
> & {
  changeView?: CalendarController['changeView']
  view?: Pick<ViewApi, 'title' | 'type'>
  getButtonState: () => Pick<ButtonStateMap, 'prev' | 'next' | 'today'> &
    Partial<ButtonStateMap>
}

type Props = {
  controller: ControleurBarre
  /** Sans libellé, celui de la locale de FullCalendar. */
  vues?: VueCalendrier[]
  aujourdhui?: boolean
  onChoisirDate?: (cible: HTMLElement) => void
  className?: string
  /** Rendus entre le titre et les vues. */
  filtres?: ReactNode
}

export const SEGMENTS = 'gap-0.5 rounded-lg border-0 bg-muted p-[3px]'
/** Style segmenté des sélecteurs de vue de la page Planning. */
export const SEGMENT =
  'rounded-md text-text-light data-[state=on]:bg-white data-[state=on]:font-semibold data-[state=on]:text-foreground data-[state=on]:shadow-sm'

// La barre de FullCalendar, rendue avec nos composants : la v7 ne pose plus de classes à styler.
// Navigation et titre cliquable à gauche, filtres et vues à droite.
export function BarreCalendrier({
  controller,
  vues,
  aujourdhui = true,
  onChoisirDate,
  className,
  filtres,
}: Props) {
  const etat = controller.getButtonState()
  const vue = controller.view

  return (
    <div className={cn('flex items-center gap-2 px-7 pb-[18px]', className)}>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label={etat.prev.hint}
          disabled={etat.prev.isDisabled}
          onClick={() => controller.prev()}
        >
          <ChevronLeft className="size-4" />
        </Button>
        {aujourdhui && (
          <Button
            variant="outline"
            className="rounded-lg px-3 font-normal"
            disabled={etat.today.isDisabled}
            onClick={() => controller.today()}
          >
            {etat.today.text}
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          aria-label={etat.next.hint}
          disabled={etat.next.isDisabled}
          onClick={() => controller.next()}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      {onChoisirDate ? (
        <button
          type="button"
          aria-label="Choisir une date"
          onClick={(e) => onChoisirDate(e.currentTarget)}
          className="flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-lg font-semibold text-text-dark outline-none hover:bg-muted focus-visible:bg-muted"
        >
          {vue?.title}
          <ChevronDown className="size-4 text-text-light" />
        </button>
      ) : (
        <span className="px-2.5 text-lg font-semibold text-text-dark">
          {vue?.title}
        </span>
      )}
      <span className="flex-1" />
      {filtres && <div className="flex items-center gap-2">{filtres}</div>}
      {vues && (
        <>
          {filtres && <span className="h-6 w-px bg-border" />}
          <ToggleGroup
            className={SEGMENTS}
            value={vue?.type}
            onValueChange={(type) => type && controller.changeView?.(type)}
          >
            {vues.map(({ type, libelle }) => (
              <ToggleGroupItem
                key={type}
                value={type}
                className={cn(SEGMENT, 'h-[30px]')}
              >
                {libelle ?? etat[type]?.text ?? type}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </>
      )}
    </div>
  )
}
