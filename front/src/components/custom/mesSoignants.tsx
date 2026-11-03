import { Building2, CircleCheck, Info, Lock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { AuthApi } from '../../api/auth.api.ts'
import { ServiceMembersApi } from '../../api/serviceMembers.api.ts'
import { SERVICE_ROLE_LABEL } from '../../constants/member.constant.ts'
import { TOAST_SEVERITY } from '../../constants/ui.constant.ts'
import { useToast } from '../../hooks/useToast.ts'
import { cn } from '../../libs/utils.ts'
import { useAuthStore } from '../../store/useAuthStore.ts'
import type { ServiceRole, User } from '../../types/auth.ts'
import { defaultTenantContext } from '../../utils/tenant-context.ts'
import { SoignantDuServiceSelect } from './soignantDuServiceSelect.tsx'

export type Affectation = {
  establishmentId: string
  establishmentName: string
  serviceId: string
  serviceName: string
  role: ServiceRole
  soignantId: string | null
}

// Les vraies affectations du compte (ni coordinateur implicite, ni octroi).
export const affectationsDe = (user: User | null | undefined): Affectation[] =>
  (user?.establishments ?? []).flatMap((e) =>
    e.services
      .filter((s) => s.affecte)
      .map((s) => ({
        establishmentId: e.id,
        establishmentName: e.name,
        serviceId: s.id,
        serviceName: s.name,
        role: s.role,
        soignantId: s.soignantId ?? null,
      })),
  )

const ROLE_CLASS: Partial<Record<ServiceRole, string>> = {
  COORDINATEUR: 'bg-[#dbeafe] text-[#1147bb]',
  INTERVENANT: 'bg-[#dcfce7] text-[#15803d]',
}

const GRILLE =
  'sm:grid sm:grid-cols-[minmax(0,1fr)_150px_minmax(0,1.3fr)] sm:gap-4'

// Le soignant (métier du service) que le compte incarne dans chacun de ses services, enregistré dès qu'il change.
export function MesSoignants({
  affectations,
  user,
}: {
  affectations: Affectation[]
  user: User | null | undefined
}) {
  const updateUser = useAuthStore((state) => state.update)
  const { toast } = useToast()
  const [valeurs, setValeurs] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(affectations.map((a) => [a.serviceId, a.soignantId])),
  )
  const [enCours, setEnCours] = useState<string | null>(null)
  const [enregistre, setEnregistre] = useState<string | null>(null)
  const minuteur = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(minuteur.current), [])

  if (affectations.length === 0) {
    return null
  }
  const actuel = user ? defaultTenantContext(user)?.serviceId : undefined
  const groupes = new Map<string, Affectation[]>()
  for (const a of affectations) {
    groupes.set(a.establishmentId, [
      ...(groupes.get(a.establishmentId) ?? []),
      a,
    ])
  }

  const changer = async (a: Affectation, soignantId: string | null) => {
    const precedent = valeurs[a.serviceId] ?? null
    setValeurs((v) => ({ ...v, [a.serviceId]: soignantId }))
    setEnCours(a.serviceId)
    try {
      await ServiceMembersApi.setOwnSoignant({
        establishmentId: a.establishmentId,
        serviceId: a.serviceId,
        soignantId,
      })
      clearTimeout(minuteur.current)
      setEnregistre(a.serviceId)
      minuteur.current = setTimeout(() => setEnregistre(null), 1800)
      updateUser(await AuthApi.me())
    } catch (error) {
      setValeurs((v) => ({ ...v, [a.serviceId]: precedent }))
      toast({
        title: "Erreur lors de l'enregistrement du soignant",
        message: error instanceof Error ? error.message : undefined,
        severity: TOAST_SEVERITY.ERROR,
      })
    } finally {
      setEnCours(null)
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-sm text-text-light text-pretty">
        Votre <b className="text-text-dark">métier</b> apparaît sur le planning
        et dans les rendez-vous ; vous pouvez le changer. Votre{' '}
        <b className="text-text-dark">accès</b> définit ce que vous pouvez faire
        dans le service ; seul un administrateur peut le modifier.
      </p>

      {[...groupes.values()].map((services) => (
        <section
          key={services[0].establishmentId}
          className="flex flex-col gap-2"
          aria-label={services[0].establishmentName}
        >
          <div className="flex items-center gap-2 px-0.5">
            <Building2 className="h-4 w-4 text-text-dark" />
            <span className="text-[15px] font-bold text-foreground">
              {services[0].establishmentName}
            </span>
            <span className="text-[13px] text-text-light">
              {services.length} service{services.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="bg-white border border-border rounded-[10px] overflow-hidden">
            <div
              className={cn(
                'hidden px-4 py-2 bg-input border-b border-border text-xs font-semibold text-text-light',
                GRILLE,
              )}
            >
              <span>Service</span>
              <span>Accès</span>
              <span>Mon métier</span>
            </div>
            {services.map((a, i) => (
              <div
                key={a.serviceId}
                className={cn(
                  'flex flex-wrap items-center gap-2 px-4 py-2.5',
                  GRILLE,
                  i > 0 && 'border-t border-muted',
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-[15px] font-semibold text-foreground truncate">
                    {a.serviceName}
                  </span>
                  {a.serviceId === actuel && (
                    <span className="shrink-0 text-[11px] font-semibold px-[7px] py-0.5 rounded-full bg-[#dbeafe] text-[#1147bb]">
                      Actuel
                    </span>
                  )}
                </span>
                <span
                  title="Attribué par un administrateur"
                  className={cn(
                    'justify-self-start h-[26px] px-2.5 rounded-full text-[13px] font-semibold flex items-center gap-1.5',
                    ROLE_CLASS[a.role] ?? 'bg-muted text-muted-foreground',
                  )}
                >
                  <Lock className="h-[13px] w-[13px]" />
                  {SERVICE_ROLE_LABEL[a.role]}
                </span>
                <div className="flex items-center gap-2 min-w-0 basis-full">
                  <div className="flex-1 min-w-0">
                    <SoignantDuServiceSelect
                      establishmentId={a.establishmentId}
                      serviceId={a.serviceId}
                      value={valeurs[a.serviceId] ?? null}
                      onChange={(soignantId) => changer(a, soignantId)}
                      label={`Mon métier dans ${a.serviceName}`}
                      labelClassName="sr-only"
                      placeholder="Choisir mon métier…"
                      className="h-[38px] bg-white"
                      disabled={enCours === a.serviceId}
                    />
                  </div>
                  <CircleCheck
                    aria-label={
                      enregistre === a.serviceId ? 'Enregistré' : undefined
                    }
                    aria-hidden={enregistre !== a.serviceId}
                    className={cn(
                      'h-4 w-4 shrink-0 text-[#15803d] transition-opacity',
                      enregistre === a.serviceId ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <span className="text-[13px] text-text-light flex items-center gap-1.5">
        <Info className="h-3.5 w-3.5 shrink-0" />
        Pour rejoindre un autre service ou changer d'accès, contactez un
        administrateur de l'établissement.
      </span>
    </div>
  )
}
