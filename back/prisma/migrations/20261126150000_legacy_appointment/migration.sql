-- Switchs de fonctionnalités par établissement et par service.
ALTER TABLE "Establishment" ADD COLUMN "features" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Service" ADD COLUMN "features" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Rendez-vous reçus de l'ancienne app, à reporter à la main.
CREATE TABLE "LegacyAppointment" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "legacyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT NOT NULL,
    "durationMinutes" INTEGER,
    "patientName" TEXT NOT NULL,
    "thematic" TEXT,
    "type" "AppointmentType",
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportedAt" TIMESTAMP(3),

    CONSTRAINT "LegacyAppointment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LegacyAppointment_serviceId_idx" ON "LegacyAppointment"("serviceId");
CREATE UNIQUE INDEX "LegacyAppointment_id_serviceId_key" ON "LegacyAppointment"("id", "serviceId");
CREATE UNIQUE INDEX "LegacyAppointment_serviceId_legacyId_key" ON "LegacyAppointment"("serviceId", "legacyId");
