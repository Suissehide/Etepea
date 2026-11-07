import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'
import dayjs from 'dayjs'
import { Download, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useForbiddenWeekQueries } from '../../../../queries/useForbiddenWeek.ts'
import { usePatientPathwaysQuery } from '../../../../queries/usePatient.tsx'
import { useSourcesImages } from '../../../../queries/usePdfAsset.ts'
import { usePdfDesignQueries } from '../../../../queries/usePdfDesign.ts'
import { usePatientSlotsQuery } from '../../../../queries/useSlot.ts'
import { useThematicQueries } from '../../../../queries/useThematic.ts'
import { scopedStorageName } from '../../../../store/scoped-storage.ts'
import { useAuthStore } from '../../../../store/useAuthStore.ts'
import type { Patient } from '../../../../types/patient.ts'
import type { PdfDesignSummary } from '../../../../types/pdfDesignList.ts'
import type { Slot } from '../../../../types/slot.ts'
import { Button } from '../../../ui/button.tsx'
import { Select } from '../../../ui/select.tsx'
import { ToggleGroup, ToggleGroupItem } from '../../../ui/toggle-group.tsx'
import { assetIdsDe } from '../../pdf-design/assets.ts'
import ProgrammePDF from './programme.pdf.tsx'

// Ceux du service d'abord, puis les presets. Un BROUILLON n'apparait pas : il se compose dans
// les reglages du service, il ne part pas encore chez un patient. Exporte pour etre tenu par
// un test : c'est la seule chose qui empeche un design non termine de sortir chez un patient.
export const designsProposables = (
  designs: PdfDesignSummary[],
  presets: PdfDesignSummary[],
): PdfDesignSummary[] => [
  ...designs.filter((design) => !design.isDraft),
  ...presets,
]

// Le choix explicite, sinon le design par defaut du service, sinon le premier disponible —
// et les presets viennent apres les designs, donc « le premier disponible » est un preset des
// que le service n'a plus de design a lui. C'est ce qui fait qu'un service dont le design par
// defaut vient d'etre supprime continue de produire un PDF au lieu d'afficher « aucun design ».
// Exporte pour etre tenu par un test : ce repli est le Review Focus 3 de l'etape 2, et il ne
// se prouve pas depuis le back, qui ne sait rien de l'ordre de cette liste.
export const chooseDesign = (
  disponibles: PdfDesignSummary[],
  choisiId: string | null,
): PdfDesignSummary | undefined =>
  disponibles.find((design) => design.id === choisiId) ??
  disponibles.find((design) => design.isDefault) ??
  disponibles[0]

// Le dernier design choisi, par service : ses identifiants n'ont pas de sens ailleurs.
const designMemoKey = () =>
  scopedStorageName('programme-pdf-design', useAuthStore.getState().context)

const lireDernierDesign = (): string | null => {
  try {
    return localStorage.getItem(designMemoKey())
  } catch {
    return null
  }
}

// Seances a venir (defaut) ou programme complet depuis la premiere seance (MDS-78).
export type PorteeRdv = 'a-venir' | 'tous'

export const creneauxDuProgramme = (
  slots: Slot[] | undefined,
  patientId: string,
  portee: PorteeRdv,
  now: dayjs.Dayjs = dayjs(),
): Slot[] =>
  (slots ?? [])
    .filter((slot) =>
      slot.appointments?.some((appointment) =>
        appointment.appointmentPatients?.some(
          (ap) => ap.patient.id === patientId,
        ),
      ),
    )
    .filter((s) => portee === 'tous' || dayjs(s.startDate).isAfter(now))
    .sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)))

interface ProgrammePDFModalProps {
  patient: Patient
  onClose: () => void
  previewMode?: boolean // true = affiche le viewer, false = télécharge directement
}

export default function ProgrammePDFModal({
  patient,
  onClose,
  previewMode = true,
}: ProgrammePDFModalProps) {
  const { slots } = usePatientSlotsQuery(patient?.id)
  const { pathways = [] } = usePatientPathwaysQuery(patient.id)
  const { forbiddenWeeks } = useForbiddenWeekQueries()
  const { thematics } = useThematicQueries()
  const { presets, designs } = usePdfDesignQueries()

  // Le nom du service vient du contexte de tenant, pose par le layout de route.
  const serviceName = useAuthStore((state) => state.context?.serviceName) ?? ''

  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(
    lireDernierDesign,
  )

  const availableDesigns = useMemo<PdfDesignSummary[]>(
    () => designsProposables(designs, presets),
    [designs, presets],
  )

  const selectedDesign = useMemo(
    () => chooseDesign(availableDesigns, selectedDesignId),
    [availableDesigns, selectedDesignId],
  )

  const [portee, setPortee] = useState<PorteeRdv>('a-venir')

  const patientSlots = useMemo(
    () => (patient ? creneauxDuProgramme(slots, patient.id, portee) : []),
    [slots, patient, portee],
  )

  // Les semaines interdites signalent les fermetures du service entre deux
  // semaines du programme.
  const forbiddenWeekStarts = useMemo(
    () => (forbiddenWeeks ?? []).map((week) => week.startOfWeek),
    [forbiddenWeeks],
  )

  // Les thematiques sans consigne n'entrent pas dans la map : le calendrier
  // n'a ainsi qu'un seul cas a tester par creneau.
  const noticeByThematicId = useMemo(() => {
    const entries = (thematics ?? [])
      .filter((thematic) => thematic.pdfNotice?.trim())
      .map(
        (thematic) => [thematic.id, thematic.pdfNotice?.trim() ?? ''] as const,
      )
    return new Map(entries)
  }, [thematics])

  // Les octets des images deposees du design choisi : c'est ici que sort le VRAI PDF.
  const { sources, enAttente: imagesEnAttente } = useSourcesImages(
    selectedDesign ? assetIdsDe(selectedDesign.content) : [],
  )

  const fileName = `programme-${patient.lastName}-${patient.firstName}-${dayjs.utc().format('YYYY-MM-DD')}.pdf`

  const pdfDocument = useMemo(
    () =>
      selectedDesign ? (
        <ProgrammePDF
          patient={patient}
          upcomingSlots={patientSlots}
          pathways={pathways}
          design={selectedDesign.content}
          serviceName={serviceName}
          forbiddenWeekStarts={forbiddenWeekStarts}
          noticeByThematicId={noticeByThematicId}
          sources={sources}
        />
      ) : null,
    [
      patient,
      patientSlots,
      pathways,
      selectedDesign,
      serviceName,
      forbiddenWeekStarts,
      noticeByThematicId,
      sources,
    ],
  )

  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-xl w-[90vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">
            Aperçu du programme - {patient.lastName} {patient.firstName}
          </h2>
          <div className="flex items-center gap-4">
            <ToggleGroup
              aria-label="Rendez-vous à inclure"
              value={portee}
              onValueChange={(valeur) =>
                valeur && setPortee(valeur as PorteeRdv)
              }
            >
              <ToggleGroupItem value="a-venir">À venir</ToggleGroupItem>
              <ToggleGroupItem value="tous">Programme complet</ToggleGroupItem>
            </ToggleGroup>
            {availableDesigns.length > 1 && (
              <div className="w-56">
                <label htmlFor="programme-design" className="sr-only">
                  Design du document
                </label>
                <Select
                  id="programme-design"
                  clearable={false}
                  value={selectedDesign?.id ?? ''}
                  onValueChange={(value) => {
                    setSelectedDesignId(value)
                    try {
                      localStorage.setItem(designMemoKey(), value)
                    } catch {
                      // Stockage indisponible : le choix vaut pour cette ouverture seulement.
                    }
                  }}
                  options={availableDesigns.map((design) => ({
                    value: design.id,
                    label: design.name,
                  }))}
                />
              </div>
            )}
            {pdfDocument && (
              <PDFDownloadLink document={pdfDocument} fileName={fileName}>
                {({ loading }) => (
                  // `loading` ne parle que du blob, jamais des octets des images en vol — et
                  // le premier blob est rapide PRECISEMENT parce qu'il n'a aucune image a
                  // decoder. Sans `imagesEnAttente`, un clic dans la seconde remet au patient
                  // un programme sans le logo du service, sans aucun signe.
                  <Button
                    variant="default"
                    size="default"
                    disabled={loading || imagesEnAttente}
                  >
                    <Download className="h-4 w-4" />
                    {loading || imagesEnAttente
                      ? 'Génération...'
                      : 'Télécharger'}
                  </Button>
                )}
              </PDFDownloadLink>
            )}
            <Button variant="outline" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* PDF Viewer */}
        {previewMode && (
          <div className="flex-1 overflow-hidden">
            {pdfDocument ? (
              <PDFViewer width="100%" height="100%" showToolbar={false}>
                {pdfDocument}
              </PDFViewer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Aucun design de document disponible pour ce service.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
