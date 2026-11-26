import type { IocContainer } from '../types/application/ioc'
import type { NotificationDispatcherInterface } from '../types/domain/notification-dispatcher.interface'
import type {
  PathwayCreateEntityDomain,
  PathwayDomainInterface,
  PathwayEntityDomain,
  PathwayUpdateEntityDomain,
  PathwayWithTemplateAndSlotsDomain,
  RegeneratePathwaysResultDomain,
  TrackingPathwayDomain,
} from '../types/domain/pathway.domain.interface'
import type {
  PathwayRepositoryInterface,
  PathwayRestoreData,
} from '../types/infra/orm/repositories/pathway.repository.interface'
import type { PathwayTemplateRepositoryInterface } from '../types/infra/orm/repositories/pathwayTemplate.repository.interface'

class PathwayDomain implements PathwayDomainInterface {
  private readonly pathwayRepository: PathwayRepositoryInterface
  private readonly notificationDispatcher: NotificationDispatcherInterface
  private readonly pathwayTemplateRepository: PathwayTemplateRepositoryInterface

  constructor({
    pathwayRepository,
    pathwayTemplateRepository,
    notificationDispatcher,
  }: IocContainer) {
    this.notificationDispatcher = notificationDispatcher
    this.pathwayRepository = pathwayRepository
    this.pathwayTemplateRepository = pathwayTemplateRepository
  }

  findAll(): Promise<PathwayWithTemplateAndSlotsDomain[]> {
    return this.pathwayRepository.findAll()
  }

  findByID(pathwayID: string): Promise<PathwayEntityDomain> {
    return this.pathwayRepository.findByID(pathwayID)
  }

  findTracking(year: number, month: number): Promise<TrackingPathwayDomain[]> {
    return this.pathwayRepository.findTracking(year, month)
  }

  async create(
    pathwayCreateParams: PathwayCreateEntityDomain,
  ): Promise<PathwayEntityDomain> {
    // `templateID` n'a pas de clé composite en base (nullable) : on vérifie
    // que le modèle de parcours appartient au tenant en le chargeant par son
    // repository filtré, qui répond 404 si il appartient à un autre service.
    if (pathwayCreateParams.templateID) {
      await this.pathwayTemplateRepository.findByID(
        pathwayCreateParams.templateID,
      )
    }
    const pathwayInputParams = {
      ...pathwayCreateParams,
    }
    return await this.pathwayRepository.create(pathwayInputParams)
  }

  async update(
    pathwayID: string,
    pathwayUpdateParams: PathwayUpdateEntityDomain,
  ): Promise<PathwayEntityDomain> {
    // Voir create() : même vérification d'appartenance au tenant.
    if (pathwayUpdateParams.templateID) {
      await this.pathwayTemplateRepository.findByID(
        pathwayUpdateParams.templateID,
      )
    }
    return await this.pathwayRepository.update(pathwayID, pathwayUpdateParams)
  }

  async delete(pathwayID: string, userID: string): Promise<PathwayRestoreData> {
    const snapshots = await this.notificationDispatcher.snapshot(
      await this.pathwayRepository.findLiveAppointmentIDs(pathwayID),
    )
    const restoreData = await this.pathwayRepository.archive(pathwayID)
    this.notificationDispatcher.cancelled(userID, snapshots)
    return restoreData
  }

  regenerate(
    pathwayTemplateIDs: string[],
    fromDate: Date,
  ): Promise<RegeneratePathwaysResultDomain> {
    return this.pathwayRepository.regenerate(pathwayTemplateIDs, fromDate)
  }
}

export { PathwayDomain }
