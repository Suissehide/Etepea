import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, LocateFixed, Pencil, Route, Search, X } from 'lucide-react'
import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { PathwayTemplateApi } from '../../../api/pathwayTemplate.api.ts'
import { PATHWAY_TEMPLATE } from '../../../constants/process.constant.ts'
import { TOAST_SEVERITY } from '../../../constants/ui.constant.ts'
import {
  restoreForTenant,
  snapshotForTenant,
} from '../../../hooks/useTenantSwitch.ts'
import { useToast } from '../../../hooks/useToast.ts'
import { hexToRGBA } from '../../../libs/color.ts'
import {
  countSlotTemplates,
  pathwayIssues,
} from '../../../libs/pathwayChecks.ts'
import { cn } from '../../../libs/utils.ts'
import { usePathwayTemplateQueries } from '../../../queries/usePathwayTemplate.ts'
import type {
  PathwayTemplate,
  UpdatePathwayTemplateParams,
} from '../../../types/pathwayTemplate.ts'
import { Button } from '../../ui/button.tsx'
import { ColorPicker } from '../../ui/colorPicker.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
  PopupTrigger,
} from '../../ui/popup.tsx'
import { MultiSelect, Select } from '../../ui/select.tsx'
import { Switch } from '../../ui/switch.tsx'
import { ToggleGroup, ToggleGroupItem } from '../../ui/toggle-group.tsx'
import { SEGMENT, SEGMENTS } from '../Calendar/barreCalendrier.tsx'

type Patch = Partial<
  Pick<
    PathwayTemplate,
    | 'name'
    | 'color'
    | 'mainTag'
    | 'secondaryTags'
    | 'prerequisiteIDs'
    | 'motifRequired'
    | 'firstAppointmentOnly'
    | 'optional'
  >
>

/** Ce que l'API de mise à jour attend, à partir d'un modèle complet. */
export const toUpdateParams = (
  template: PathwayTemplate,
): UpdatePathwayTemplateParams => ({
  id: template.id,
  name: template.name,
  color: template.color,
  mainTag: template.mainTag,
  secondaryTags: template.secondaryTags ?? [],
  prerequisiteIDs: template.prerequisiteIDs ?? [],
  motifRequired: template.motifRequired,
  firstAppointmentOnly: template.firstAppointmentOnly,
  optional: template.optional,
})

const MODE_OPTIONS = [
  { value: 'all', label: 'Tous les RDV' },
  { value: 'first', label: 'Premier créneau' },
]

/**
 * Enregistrement immédiat d'une modification du tableau : fusion optimiste
 * dans la liste (les créneaux du modèle restent en place), retour arrière et
 * message d'erreur si l'API refuse. Pas de message de succès : le tableau
 * confirme lui-même chaque modification.
 */
function useSavePathwayTemplate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationKey: [PATHWAY_TEMPLATE.UPDATE],
    mutationFn: PathwayTemplateApi.update,
    onMutate: async (params: UpdatePathwayTemplateParams) => {
      await queryClient.cancelQueries({ queryKey: [PATHWAY_TEMPLATE.GET_ALL] })
      const previous = snapshotForTenant(queryClient, [
        PATHWAY_TEMPLATE.GET_ALL,
      ])
      queryClient.setQueryData(
        [PATHWAY_TEMPLATE.GET_ALL],
        (old: PathwayTemplate[] | undefined) =>
          old?.map((template) =>
            template.id === params.id ? { ...template, ...params } : template,
          ),
      )
      return { previous }
    },
    onError: (error, _, context) => {
      restoreForTenant(queryClient, context?.previous)
      toast({
        title: 'Modification du parcours non enregistrée',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: [PATHWAY_TEMPLATE.GET_ALL],
      })
    },
  })
}

type LastChange = { before: PathwayTemplate; label: string }

interface PathwayTemplatesSummaryProps {
  /** Sélectionne le parcours dans le planning, pour en voir les créneaux. */
  onShowInPlanning: (template: PathwayTemplate) => void
}

/** Résumé de tous les parcours, modifiable sur place, chaque changement enregistré aussitôt. */
export default function PathwayTemplatesSummary({
  onShowInPlanning,
}: PathwayTemplatesSummaryProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popup modal open={open} onOpenChange={setOpen}>
      <PopupTrigger asChild>
        <Button
          variant="gradient"
          size="icon"
          aria-label="Résumé des parcours"
          title="Résumé des parcours"
        >
          <Pencil className="w-4 h-4" />
        </Button>
      </PopupTrigger>
      <PopupContent size="xl" className="h-[85vh]">
        {open && (
          <SummaryContent
            onShowInPlanning={(template) => {
              setOpen(false)
              onShowInPlanning(template)
            }}
            onClose={() => setOpen(false)}
          />
        )}
      </PopupContent>
    </Popup>
  )
}

function SummaryContent({
  onShowInPlanning,
  onClose,
}: PathwayTemplatesSummaryProps & { onClose: () => void }) {
  const { pathwayTemplates } = usePathwayTemplateQueries()
  const save = useSavePathwayTemplate()
  const [query, setQuery] = useState('')
  const [onlyIssues, setOnlyIssues] = useState(false)
  const [last, setLast] = useState<LastChange | null>(null)
  const [flashID, setFlashID] = useState<string | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(flashTimer.current), [])

  const templates = pathwayTemplates ?? []
  const rows = useMemo(
    () =>
      templates.map((template) => ({
        template,
        issues: pathwayIssues(template, templates),
      })),
    [templates],
  )
  const toCheck = rows.filter((row) => row.issues.length > 0).length
  const shown = rows.filter(
    ({ template, issues }) =>
      (!onlyIssues || issues.length > 0) &&
      template.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const flash = (id: string) => {
    setFlashID(id)
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashID(null), 1200)
  }

  const handleChange = (
    template: PathwayTemplate,
    patch: Patch,
    label: string,
  ) => {
    save.mutate(toUpdateParams({ ...template, ...patch }))
    setLast({ before: template, label })
    flash(template.id)
  }

  const handleUndo = () => {
    if (!last) {
      return
    }
    save.mutate(toUpdateParams(last.before))
    flash(last.before.id)
    setLast(null)
  }

  return (
    <>
      <PopupHeader className="py-[18px]">
        <PopupTitle icon={Route}>Résumé des parcours</PopupTitle>
        <span className="ml-11 text-[13px] text-text-light">
          {`${templates.length} parcours · ${toCheck} à vérifier`}
        </span>
      </PopupHeader>

      <PopupBody className="flex flex-col min-h-0 flex-1 gap-3 pt-4 pb-0">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 w-72 h-9 px-2.5 border border-border rounded-md">
            <Search className="w-4 h-4 text-[#94a3b8]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un parcours"
              className="flex-1 min-w-0 bg-transparent text-sm outline-none"
            />
          </label>
          <ToggleGroup
            aria-label="Parcours à afficher"
            className={SEGMENTS}
            value={onlyIssues ? 'check' : 'all'}
            onValueChange={(value) => value && setOnlyIssues(value === 'check')}
          >
            <ToggleGroupItem value="all" className={cn(SEGMENT, 'h-[30px]')}>
              Tous
            </ToggleGroupItem>
            <ToggleGroupItem value="check" className={cn(SEGMENT, 'h-[30px]')}>
              À vérifier
              {toCheck > 0 && (
                <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-a-saisir text-white text-[11px] font-bold flex items-center justify-center">
                  {toCheck}
                </span>
              )}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex-1 min-h-0 overflow-auto border border-border rounded-[10px]">
          <table className="w-full text-[13px] border-collapse">
            <thead className="sticky top-0 z-[2] bg-[#f8fafc] text-xs font-semibold text-text-dark">
              <tr className="border-b border-border text-left">
                <th className="px-3 py-2.5 min-w-56">Parcours</th>
                <th className="px-2 py-2.5 w-24">Tag</th>
                <th className="px-2 py-2.5 min-w-44">Tags secondaires</th>
                <th className="px-2 py-2.5 w-40">Inscription</th>
                <th className="px-2 py-2.5 w-20 text-center">Optionnel</th>
                <th className="px-2 py-2.5 w-16 text-center">Motif</th>
                <th className="px-2 py-2.5 w-56">Dépend de</th>
                <th className="px-2 py-2.5 w-24">Créneaux</th>
                <th className="px-3 py-2.5 min-w-56">À vérifier</th>
                <th className="w-12">
                  <span className="sr-only">Voir dans le planning</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ template, issues }) => (
                <SummaryRow
                  key={template.id}
                  template={template}
                  issues={issues}
                  templates={templates}
                  isFlashing={flashID === template.id}
                  onChange={handleChange}
                  onShowInPlanning={onShowInPlanning}
                />
              ))}
            </tbody>
          </table>
          {shown.length === 0 && (
            <p className="m-0 py-8 text-center text-sm text-text-light">
              Aucun parcours à afficher.
            </p>
          )}
        </div>
      </PopupBody>

      <PopupFooter className="items-center justify-between">
        <span
          className={cn(
            'flex items-center gap-2 text-[13px]',
            last ? 'text-[#15803d]' : 'text-text-light',
          )}
        >
          {last ? (
            <>
              <Check className="w-3.5 h-3.5" />
              {`« ${last.before.name} » : ${last.label} — enregistré.`}
              <button
                type="button"
                onClick={handleUndo}
                className="cursor-pointer px-1 text-[13px] font-semibold text-primary hover:text-primary-dark"
              >
                Annuler
              </button>
            </>
          ) : (
            'Chaque modification est enregistrée aussitôt.'
          )}
        </span>
        <Button variant="outline" onClick={onClose}>
          Fermer
        </Button>
      </PopupFooter>
    </>
  )
}

/** Un champ texte qui n'enregistre qu'en quittant le champ (ou Entrée), jamais vide. */
function CommitInput({
  value,
  onCommit,
  className,
  style,
  'aria-label': ariaLabel,
}: {
  value: string
  onCommit: (value: string) => void
  className?: string
  style?: React.CSSProperties
  'aria-label': string
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const commit = () => {
    const next = draft.trim()
    if (!next) {
      setDraft(value)
    } else if (next !== value) {
      onCommit(next)
    }
  }
  return (
    <input
      value={draft}
      aria-label={ariaLabel}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur()
        }
        if (e.key === 'Escape') {
          setDraft(value)
        }
      }}
      className={cn(
        'h-[30px] px-1.5 rounded-[5px] border border-transparent bg-transparent outline-none hover:border-border-dark hover:bg-white focus:border-primary focus:bg-white',
        className,
      )}
      style={style}
    />
  )
}

function SecondaryTags({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (tags: string[], label: string) => void
}) {
  const [draft, setDraft] = useState('')
  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-0.5 rounded bg-muted py-0.5 pl-1.5 pr-0.5 text-[11px] text-text-dark"
        >
          {tag}
          <button
            type="button"
            aria-label={`Retirer le tag ${tag}`}
            onClick={() =>
              onChange(
                tags.filter((t) => t !== tag),
                `tag « ${tag} » retiré`,
              )
            }
            className="cursor-pointer flex items-center justify-center w-4 h-4 rounded hover:bg-border"
          >
            <X className="w-2.5 h-2.5 text-text-light" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        aria-label="Ajouter un tag secondaire"
        placeholder="+ tag"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          const tag = draft.trim()
          if (e.key !== 'Enter' || !tag) {
            return
          }
          if (!tags.includes(tag)) {
            onChange([...tags, tag], `tag « ${tag} » ajouté`)
          }
          setDraft('')
        }}
        className="w-16 h-[22px] px-1 rounded border border-dashed border-border-dark bg-transparent text-[11px] outline-none focus:border-primary"
      />
    </div>
  )
}

function SummaryRow({
  template,
  issues,
  templates,
  isFlashing,
  onChange,
  onShowInPlanning,
}: {
  template: PathwayTemplate
  issues: string[]
  templates: PathwayTemplate[]
  isFlashing: boolean
  onChange: (template: PathwayTemplate, patch: Patch, label: string) => void
  onShowInPlanning: (template: PathwayTemplate) => void
}) {
  const change = (patch: Patch, label: string) =>
    onChange(template, patch, label)
  const slots = countSlotTemplates(template)
  const slotDetail = [
    slots.collective > 0 && `${slots.collective} coll.`,
    slots.individual > 0 && `${slots.individual} indiv.`,
    `${slots.thematics} thém.`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <tr
      className={cn(
        'border-b border-muted align-middle transition-colors duration-500',
        isFlashing && 'bg-green-100',
      )}
    >
      <td className="px-2.5 py-2">
        <div className="flex items-center gap-2">
          <ColorPicker
            swatchOnly
            value={template.color}
            aria-label={`Couleur de ${template.name}`}
            onChange={(color) => change({ color }, 'couleur')}
          />
          <CommitInput
            value={template.name}
            aria-label="Nom du parcours"
            onCommit={(name) => change({ name }, 'nom')}
            className="flex-1 min-w-0 text-sm font-semibold text-foreground"
          />
        </div>
      </td>
      <td className="px-1.5 py-2">
        <CommitInput
          value={template.mainTag}
          aria-label="Tag principal"
          onCommit={(mainTag) => change({ mainTag }, 'tag principal')}
          className="w-20 text-[11px] font-bold"
          style={{ backgroundColor: hexToRGBA(template.color, 0.2) }}
        />
      </td>
      <td className="px-1.5 py-2">
        <SecondaryTags
          tags={template.secondaryTags ?? []}
          onChange={(secondaryTags, label) => change({ secondaryTags }, label)}
        />
      </td>
      <td className="px-1.5 py-2">
        {/* Largeur fixe : la sélection ne doit pas élargir la colonne. */}
        <div className="w-40">
          <Select
            options={MODE_OPTIONS}
            value={template.firstAppointmentOnly ? 'first' : 'all'}
            clearable={false}
            onValueChange={(value) =>
              change({ firstAppointmentOnly: value === 'first' }, 'inscription')
            }
          />
        </div>
      </td>
      <td className="px-1.5 py-2 text-center">
        <Switch
          aria-label={`${template.name} : parcours optionnel`}
          checked={template.optional}
          onCheckedChange={(optional) => change({ optional }, 'optionnel')}
        />
      </td>
      <td className="px-1.5 py-2 text-center">
        <Switch
          aria-label={`${template.name} : motif demandé`}
          checked={template.motifRequired}
          onCheckedChange={(motifRequired) =>
            change({ motifRequired }, 'motif')
          }
        />
      </td>
      <td className="px-1.5 py-2">
        <div className="w-52">
          <MultiSelect
            options={templates
              .filter((other) => other.id !== template.id)
              .map((other) => ({
                value: other.id,
                label: other.name,
                color: other.color,
              }))}
            value={template.prerequisiteIDs ?? []}
            onChange={(prerequisiteIDs) =>
              change({ prerequisiteIDs }, 'dépendances')
            }
            placeholder="Aucun"
          />
        </div>
      </td>
      <td className="px-2 py-2">
        <div
          className={cn(
            'font-semibold tabular-nums',
            slots.total === 0 && 'text-a-saisir-texte',
          )}
        >
          {slots.total}
        </div>
        {slots.total > 0 && (
          <div className="text-[11px] text-text-light">{slotDetail}</div>
        )}
      </td>
      <td className="px-3 py-2">
        {issues.length > 0 ? (
          <ul className="m-0 p-0 list-none flex flex-col gap-1">
            {issues.map((issue) => (
              <li
                key={issue}
                className="flex items-start gap-1.5 text-xs leading-snug text-a-saisir-texte"
              >
                <span className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full bg-a-saisir-fond text-[11px] font-bold">
                  !
                </span>
                {issue}
              </li>
            ))}
          </ul>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-[#15803d]">
            <Check className="w-3 h-3" />
            Rien à signaler
          </span>
        )}
      </td>
      <td className="pr-2 py-2 text-center">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label={`Voir ${template.name} dans le planning`}
          title="Voir dans le planning"
          onClick={() => onShowInPlanning(template)}
        >
          <LocateFixed className="w-4 h-4" />
        </Button>
      </td>
    </tr>
  )
}
