import Boom from '@hapi/boom'
import dayjs from 'dayjs'

import type { IocContainer } from '../types/application/ioc'
import type { PlanningRestoreDomainInterface } from '../types/domain/planningRestore.domain.interface'
import type { ActivityLogRepositoryInterface } from '../types/infra/orm/repositories/activityLog.repository.interface'
import type { PathwayRestoreData } from '../types/infra/orm/repositories/pathway.repository.interface'
import type { AppEventBus } from '../utils/app-event-bus'

const jour = (date: string) => dayjs(date).format('DD/MM/YYYY')

const statusOf = (err: unknown) =>
  Boom.isBoom(err) ? err.output.statusCode : null

class PlanningRestoreDomain implements PlanningRestoreDomainInterface {
  private readonly activityLogRepository: ActivityLogRepositoryInterface
  private readonly pathwayRepository: IocContainer['pathwayRepository']
  private readonly slotDomain: IocContainer['slotDomain']
  private readonly forbiddenWeekDomain: IocContainer['forbiddenWeekDomain']
  private readonly planningCycleDomain: IocContainer['planningCycleDomain']
  private readonly appEventBus: AppEventBus

  constructor({
    activityLogRepository,
    pathwayRepository,
    slotDomain,
    forbiddenWeekDomain,
    planningCycleDomain,
    appEventBus,
  }: IocContainer) {
    this.activityLogRepository = activityLogRepository
    this.pathwayRepository = pathwayRepository
    this.slotDomain = slotDomain
    this.forbiddenWeekDomain = forbiddenWeekDomain
    this.planningCycleDomain = planningCycleDomain
    this.appEventBus = appEventBus
  }

  async restore(activityLogId: string, userID: string): Promise<void> {
    const line =
      await this.activityLogRepository.findPlanningDeletion(activityLogId)
    if (!line) {
      throw Boom.notFound('Suppression introuvable')
    }
    if (!(await this.activityLogRepository.claimRestore(line.id))) {
      throw Boom.conflict('Cette suppression a déjà été restaurée')
    }
    try {
      const detail = await this.#apply(line, userID)
      if (detail !== null) {
        this.appEventBus.emit('planning.restored', {
          userID,
          entityType: line.entityType as 'pathway',
          entityID: line.entityID,
          detail: detail || undefined,
        })
      }
    } catch (err) {
      await this.activityLogRepository.releaseRestore(line.id)
      throw err
    }
  }

  // Détail à journaliser ; '' sans détail, null quand rien à émettre ici.
  async #apply(
    line: { entityType: string; entityID: string; restoreData: unknown },
    userID: string,
  ): Promise<string | null> {
    switch (line.entityType) {
      case 'slot':
        try {
          // Déjà rétabli (Annuler du toast) : la ligne est seulement marquée restaurée.
          if (!(await this.slotDomain.findByID(line.entityID)).archivedAt) {
            return null
          }
          await this.slotDomain.update(
            line.entityID,
            { archivedAt: null },
            userID,
          )
        } catch (err) {
          throw statusOf(err) === 404
            ? Boom.notFound("Ce créneau n'existe plus")
            : err
        }
        return null
      case 'pathway': {
        const data = line.restoreData as PathwayRestoreData
        await this.pathwayRepository.restore(data)
        return ''
      }
      case 'forbiddenWeek': {
        const { startOfWeek } = line.restoreData as { startOfWeek: string }
        try {
          await this.forbiddenWeekDomain.create(new Date(startOfWeek))
        } catch (err) {
          throw statusOf(err) === 409
            ? Boom.conflict('Cette semaine est déjà interdite')
            : err
        }
        return `semaine du ${jour(startOfWeek)}`
      }
      case 'planningCycle': {
        const cycle = line.restoreData as {
          startOfWeek: string
          weekCount: number
        }
        if (await this.planningCycleDomain.find()) {
          throw Boom.conflict('Un autre cycle a été enregistré depuis')
        }
        await this.planningCycleDomain.save({
          startOfWeek: new Date(cycle.startOfWeek),
          weekCount: cycle.weekCount,
        })
        return `${cycle.weekCount} semaines à partir du ${jour(cycle.startOfWeek)}`
      }
      default:
        throw Boom.badRequest('Suppression non restaurable')
    }
  }
}

export { PlanningRestoreDomain }
