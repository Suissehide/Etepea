-- Le type (ambulatoire, hospitalisation, téléphonique) passe du rendez-vous au créneau.
ALTER TABLE "SlotTemplate" ADD COLUMN "type" "AppointmentType";

-- Type majoritaire des rendez-vous du créneau ; à égalité, le premier dans l'ordre de l'énumération.
UPDATE "SlotTemplate" st
SET "type" = t."type"
FROM (
  SELECT DISTINCT ON (s."slotTemplateID") s."slotTemplateID", a."type"
  FROM "Appointment" a
  JOIN "Slot" s ON s."id" = a."slotID"
  WHERE a."type" IS NOT NULL
  GROUP BY s."slotTemplateID", a."type"
  ORDER BY s."slotTemplateID", COUNT(*) DESC, a."type"
) t
WHERE st."id" = t."slotTemplateID";

ALTER TABLE "Appointment" DROP COLUMN "type";
