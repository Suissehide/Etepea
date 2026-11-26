import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import { defaultRolesInput } from '../../utils/default-roles'
import type { ServiceRole } from '../../utils/permissions'

// SQL brut dans ce fichier : les routes d'établissement n'ont pas de serviceId de tenant, que le garde exige sur ServiceRoleDef.
// Provisoire : la tâche 4 reçoit `roleId` de l'API et retire ce pont.
export const roleIdOf = async (
  client: Pick<PrimaTransactionClient, '$queryRaw'>,
  serviceId: string,
  preset: ServiceRole,
): Promise<string> => {
  const rows = await client.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "ServiceRoleDef"
    WHERE "serviceId" = ${serviceId} AND "preset" = ${preset}::"ServiceRole"`
  const id = rows[0]?.id
  if (!id) {
    throw new Error(`Rôle ${preset} introuvable pour le service ${serviceId}`)
  }
  return id
}

export const createDefaultRoles = async (
  client: Pick<PrimaTransactionClient, '$executeRaw'>,
  serviceId: string,
  establishmentId: string,
): Promise<void> => {
  for (const { name, preset, permissions } of defaultRolesInput()) {
    await client.$executeRaw`
      INSERT INTO "ServiceRoleDef" ("id", "establishmentId", "serviceId", "name", "preset", "permissions")
      VALUES ('c' || replace(gen_random_uuid()::text, '-', ''), ${establishmentId}, ${serviceId}, ${name}, ${preset}::"ServiceRole", ${permissions}::text[])`
  }
}
