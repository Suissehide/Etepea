import type { IocContainer } from '../types/application/ioc'
import type {
  ForbiddenWeekDomainInterface,
  ForbiddenWeekEntityDomain,
} from '../types/domain/forbiddenWeek.domain.interface'
import type { ForbiddenWeekRepositoryInterface } from '../types/infra/orm/repositories/forbiddenWeek.repository.interface'
import { toStartOfWeek } from '../utils/date'

class ForbiddenWeekDomain implements ForbiddenWeekDomainInterface {
  private readonly forbiddenWeekRepository: ForbiddenWeekRepositoryInterface

  constructor({ forbiddenWeekRepository }: IocContainer) {
    this.forbiddenWeekRepository = forbiddenWeekRepository
  }

  findAll(): Promise<ForbiddenWeekEntityDomain[]> {
    return this.forbiddenWeekRepository.findAll()
  }

  create(date: Date): Promise<ForbiddenWeekEntityDomain> {
    const startOfWeek = toStartOfWeek(date)
    return this.forbiddenWeekRepository.create({ startOfWeek })
  }

  async delete(id: string): Promise<{ startOfWeek: string }> {
    const deleted = await this.forbiddenWeekRepository.delete(id)
    return { startOfWeek: deleted.startOfWeek.toISOString().slice(0, 10) }
  }
}

export { ForbiddenWeekDomain }
