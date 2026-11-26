import type { IocContainer } from '../../../types/application/ioc'
import type {
  LegacyAppointmentEntityRepo,
  LegacyAppointmentInput,
  LegacyAppointmentRepositoryInterface,
} from '../../../types/infra/orm/repositories/legacyAppointment.repository.interface'
import type { ErrorHandlerInterface } from '../../../types/utils/error-handler'
import type { TenantContextInterface } from '../../../types/utils/tenant-context'
import type { PostgresPrismaClient } from '../postgres-client'

type Scope = { serviceId: string; establishmentId: string }

export const LEGACY_RDV_FEATURE = 'legacy-rdv'

class LegacyAppointmentRepository
  implements LegacyAppointmentRepositoryInterface
{
  private readonly prisma: PostgresPrismaClient
  private readonly errorHandler: ErrorHandlerInterface
  private readonly tenantContext: TenantContextInterface

  constructor({ postgresOrm, errorHandler, tenantContext }: IocContainer) {
    this.prisma = postgresOrm.prisma
    this.errorHandler = errorHandler
    this.tenantContext = tenantContext
  }

  private get scope() {
    return this.tenantContext.scope()
  }

  isEnabled(): Promise<boolean> {
    return this.#isEnabledFor(this.scope)
  }

  // Hors requête de tenant (appel de l'ancienne app) : mode système, borné au service visé.
  receive(target: Scope, input: LegacyAppointmentInput): Promise<boolean> {
    return this.tenantContext.runAsSystem(async () => {
      if (!(await this.#isEnabledFor(target))) {
        return false
      }
      await this.prisma.legacyAppointment.upsert({
        where: {
          serviceId_legacyId: {
            serviceId: target.serviceId,
            legacyId: input.legacyId,
          },
        },
        create: { ...input, ...target },
        update: input,
      })
      return true
    })
  }

  async #isEnabledFor({ serviceId, establishmentId }: Scope): Promise<boolean> {
    const service = await this.prisma.service.findUnique({
      where: { id_establishmentId: { id: serviceId, establishmentId } },
      select: { features: true },
    })
    const establishment = await this.prisma.establishment.findUnique({
      where: { id: establishmentId },
      select: { features: true },
    })
    return [
      ...(service?.features ?? []),
      ...(establishment?.features ?? []),
    ].includes(LEGACY_RDV_FEATURE)
  }

  findAll(): Promise<LegacyAppointmentEntityRepo[]> {
    return this.prisma.legacyAppointment.findMany({
      where: this.scope,
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    })
  }

  async setReported(
    id: string,
    reported: boolean,
  ): Promise<LegacyAppointmentEntityRepo> {
    try {
      return await this.prisma.legacyAppointment.update({
        where: { id_serviceId: { id, serviceId: this.scope.serviceId } },
        data: { reportedAt: reported ? new Date() : null },
      })
    } catch (err) {
      throw this.errorHandler.boomErrorFromPrismaError({
        entityName: 'LegacyAppointment',
        error: err,
      })
    }
  }
}

export { LegacyAppointmentRepository }
