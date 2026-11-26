-- Le rôle d une affectation vit dans ServiceRoleDef (roleId) ; l enum reste pour ServiceRoleDef.preset.
ALTER TABLE "ServiceMembership" DROP COLUMN "role";
