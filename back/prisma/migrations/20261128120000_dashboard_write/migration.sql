-- Ajouter depuis le Dashboard : droit propre, accordé aux seuls rôles issus de COORDINATEUR.
UPDATE "ServiceRoleDef"
SET "permissions" = array_append("permissions", 'dashboard:write')
WHERE "preset" = 'COORDINATEUR' AND NOT ('dashboard:write' = ANY("permissions"));
