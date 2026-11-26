-- AlterTable
ALTER TABLE "ServiceMembership" ADD COLUMN     "roleId" TEXT;

-- AlterTable
ALTER TABLE "Soignant" ADD COLUMN     "defaultRoleId" TEXT;

-- CreateTable
CREATE TABLE "ServiceRoleDef" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "preset" "ServiceRole",
    "permissions" TEXT[],
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRoleDef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRoleHiddenSoignant" (
    "roleId" TEXT NOT NULL,
    "soignantId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,

    CONSTRAINT "ServiceRoleHiddenSoignant_pkey" PRIMARY KEY ("roleId","soignantId")
);

-- Quatre rôles par défaut par service, aux droits des anciens presets.
-- preset:COORDINATEUR
INSERT INTO "ServiceRoleDef" ("id", "establishmentId", "serviceId", "name", "preset", "permissions")
SELECT 'c' || replace(gen_random_uuid()::text, '-', ''), s."establishmentId", s."id", 'Coordinateur', 'COORDINATEUR'::"ServiceRole", ARRAY['activity:read', 'agenda:read', 'appointment:create', 'appointment:write', 'clinical:read', 'clinical:write', 'consultations:read', 'dashboard:read', 'diagnostic-templates:write', 'locations:write', 'members:read', 'notifications:own', 'pathway-templates:write', 'patient-form:write', 'patient:create', 'patient:delete', 'patient:read', 'patient:write', 'patients:read', 'pdf-design:write', 'pdf:export', 'planning:read', 'planning:write', 'referentials:read', 'referentials:write', 'service-journal:read', 'service-members:manage', 'soignants:write', 'stats:read', 'stats:write', 'suivi:read', 'tasks:read', 'tasks:write', 'thematics:write']::TEXT[]
FROM "Service" s;

-- preset:INTERVENANT
INSERT INTO "ServiceRoleDef" ("id", "establishmentId", "serviceId", "name", "preset", "permissions")
SELECT 'c' || replace(gen_random_uuid()::text, '-', ''), s."establishmentId", s."id", 'Intervenant', 'INTERVENANT'::"ServiceRole", ARRAY['agenda:read', 'appointment:create', 'appointment:write', 'clinical:read', 'clinical:write', 'dashboard:read', 'members:read', 'notifications:own', 'patient:create', 'patient:read', 'patient:write', 'patients:read', 'pdf:export', 'planning:read', 'referentials:read', 'suivi:read', 'tasks:read', 'tasks:write']::TEXT[]
FROM "Service" s;

-- preset:SECRETARIAT
INSERT INTO "ServiceRoleDef" ("id", "establishmentId", "serviceId", "name", "preset", "permissions")
SELECT 'c' || replace(gen_random_uuid()::text, '-', ''), s."establishmentId", s."id", 'Secrétariat', 'SECRETARIAT'::"ServiceRole", ARRAY['agenda:read', 'appointment:create', 'appointment:write', 'dashboard:read', 'members:read', 'notifications:own', 'patient:create', 'patient:read', 'patient:write', 'patients:read', 'pdf:export', 'planning:read', 'referentials:read', 'suivi:read', 'tasks:read', 'tasks:write']::TEXT[]
FROM "Service" s;

-- preset:LECTURE
INSERT INTO "ServiceRoleDef" ("id", "establishmentId", "serviceId", "name", "preset", "permissions")
SELECT 'c' || replace(gen_random_uuid()::text, '-', ''), s."establishmentId", s."id", 'Lecture seule', 'LECTURE'::"ServiceRole", ARRAY['activity:read', 'agenda:read', 'dashboard:read', 'members:read', 'notifications:own', 'patient:read', 'patients:read', 'planning:read', 'referentials:read', 'suivi:read']::TEXT[]
FROM "Service" s;

-- Chaque affectation prend le rôle de son service qui porte son ancien preset.
UPDATE "ServiceMembership" sm SET "roleId" = r."id"
FROM "ServiceRoleDef" r
WHERE r."serviceId" = sm."serviceId" AND r."preset" = sm."role";

ALTER TABLE "ServiceMembership" ALTER COLUMN "roleId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ServiceRoleDef_serviceId_idx" ON "ServiceRoleDef"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRoleDef_id_serviceId_key" ON "ServiceRoleDef"("id", "serviceId");

-- CreateIndex
CREATE INDEX "ServiceRoleHiddenSoignant_serviceId_idx" ON "ServiceRoleHiddenSoignant"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceMembership_roleId_idx" ON "ServiceMembership"("roleId");

-- AddForeignKey
ALTER TABLE "ServiceRoleDef" ADD CONSTRAINT "ServiceRoleDef_serviceId_establishmentId_fkey" FOREIGN KEY ("serviceId", "establishmentId") REFERENCES "Service"("id", "establishmentId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRoleHiddenSoignant" ADD CONSTRAINT "ServiceRoleHiddenSoignant_roleId_serviceId_fkey" FOREIGN KEY ("roleId", "serviceId") REFERENCES "ServiceRoleDef"("id", "serviceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRoleHiddenSoignant" ADD CONSTRAINT "ServiceRoleHiddenSoignant_soignantId_serviceId_fkey" FOREIGN KEY ("soignantId", "serviceId") REFERENCES "Soignant"("id", "serviceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMembership" ADD CONSTRAINT "ServiceMembership_roleId_serviceId_fkey" FOREIGN KEY ("roleId", "serviceId") REFERENCES "ServiceRoleDef"("id", "serviceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Soignant" ADD CONSTRAINT "Soignant_defaultRoleId_serviceId_fkey" FOREIGN KEY ("defaultRoleId", "serviceId") REFERENCES "ServiceRoleDef"("id", "serviceId") ON DELETE RESTRICT ON UPDATE CASCADE;

