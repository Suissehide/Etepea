# Rôles configurables par service — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** remplacer les quatre rôles de service figés par des rôles en base, propres à chaque service, nommables et réglables permission par permission, avec un rôle par défaut sur chaque soignant et des soignants masqués par rôle.

**Architecture:** le code continue de ne tester que des permissions. Le rôle d'un membre devient une ligne `ServiceRoleDef` portant sa liste de permissions ; la résolution du tenant pose `servicePermissions` à la place de `serviceRole`, et `hasPermission` lit cette liste. Le catalogue des clés reste dans le code (back + copie front, test d'égalité existant).

**Tech Stack:** Prisma 7 / PostgreSQL, Fastify + Zod 4, Jest (back), React + TanStack Router/Query/Form, Vitest (front), Biome.

**Spec:** `docs/superpowers/specs/2026-11-26-roles-configurables-design.md`

**Hors de ce plan :** l'étape 5 de la spec (traçabilité, notification et restauration du planning) fera l'objet d'un plan séparé une fois celui-ci fusionné.

## Global Constraints

- Jour de la migration : **aucun compte ne gagne ni ne perd un droit** (les nouvelles clés découpées sont accordées exactement là où l'ancienne clé l'était).
- `ADMIN` d'établissement et octroi super-admin : toutes les permissions de service, sans ligne `ServiceRoleDef`.
- Rôles archivés (`archivedAt`), jamais supprimés en base ; dans l'UI : « Supprimer », « Supprimés », « Restaurer », jamais « Archiver ».
- Un rôle encore attribué à un membre ne peut pas être supprimé (409).
- Le rôle par défaut d'un soignant pré-remplit, il ne lie pas : le modifier ne touche aucun compte.
- Lint/format Biome uniquement, jamais `biome-ignore` ; commentaires d'une ligne ou rien.
- Textes visibles : pas de tiret cadratin, pas de « 03 · », pas de virgule avant « et ».
- Front : `tsc -p tsconfig.app.json` (jamais `tsc -p .`). Back : `npm run build` ne vérifie pas `src/test`.
- Tout nouveau modèle : `SERVICE_MODELS` + `MODEL_RELATIONS` (cardinalités) dans `infra/orm/tenant-guard.ts`, cas dans `src/test/e2e/isolation.test.ts`.
- Base e2e propre au worktree : `etepea_test_roles` (`.env.test.local`), à supprimer à la clôture.

## Review Focus

1. **Migration de données** : un service existant dont un membre est `LECTURE` doit retrouver exactement `READ_ALL + activity:read`. Le SQL écrit les listes à la main ; une divergence avec `DEFAULT_ROLE_PERMISSIONS` ne se verrait pas. → test e2e « migration à droits constants » (Tâche 2).
2. **Rôle d'un autre service** : `roleId` d'un service B envoyé sur une route du service A (invitation, changement de rôle, rôle par défaut d'un soignant) doit être refusé, pas accepté. → tests dans Tâches 4 et 8.
3. **Se retirer ses propres droits** : un membre qui gère les rôles sans être `ADMIN` n'existe pas (`roles:manage` est d'établissement), mais un coordinateur qui change *son propre* rôle doit rester refusé comme aujourd'hui (`assertNotSelf`). → test Tâche 4.
4. **Clé inconnue** : `permissions: ['patient:fly']` en écriture doit donner 400, et une clé retirée du catalogue plus tard ne doit pas faire planter `/me` (elle est ignorée à la lecture). → tests Tâche 7.
5. **Notifications et tâches** : les filtres `role !== 'LECTURE'` deviennent « a `tasks:read` » ; un rôle personnalisé sans `tasks:read` ne doit recevoir ni tâche ni notification de tâche. → test Tâche 3.

---

### Task 1: Catalogue des permissions et rôles par défaut

**Files:**
- Modify: `back/src/main/utils/permissions.ts`
- Modify: `front/src/utils/permissions.ts` (copie identique)
- Test: `back/src/test/unit/utils/permissions.test.ts`

**Interfaces:**
- Produces:
  - `SERVICE_PERMISSION_KEYS: readonly ServicePermission[]` — toutes les clés de service, nouvelles comprises : `pathway-templates:write`, `thematics:write`, `soignants:write`, `locations:write`, `diagnostic-templates:write`, `pdf-design:write`, `patient-form:write`, `patient:create`, `appointment:create`, `dashboard:read`, `agenda:read`, `patients:read`, `suivi:read`. `referentials:write` **disparaît** (remplacée par les six clés), le reste est conservé.
  - `type RolePreset = 'COORDINATEUR' | 'INTERVENANT' | 'SECRETARIAT' | 'LECTURE'` (remplace `ServiceRole`).
  - `DEFAULT_ROLE_PERMISSIONS: Record<RolePreset, readonly ServicePermission[]>` (remplace `SERVICE_PERMISSIONS`) ; `DEFAULT_ROLE_NAMES: Record<RolePreset, string>` = Coordinateur, Intervenant, Secrétariat, Lecture seule.
  - `ALL_SERVICE_PERMISSIONS = SERVICE_PERMISSION_KEYS`.
  - `type RoleSet = { servicePermissions: readonly ServicePermission[] | null; establishmentRole: EstablishmentRole | null }`.
  - `hasPermission(roles: RoleSet, permission: Permission): boolean` — branche service si la clé est dans `SERVICE_PERMISSION_KEYS`.
  - `parsePermissions(raw: readonly string[]): ServicePermission[]` — garde les clés connues, ignore les autres.
  - Nouvelle permission d'établissement `roles:manage` accordée à `ADMIN`.

- [ ] **Step 1: Écrire les tests**

```ts
it('accorde les nouvelles clés là où l’ancienne l’était', () => {
  for (const k of ['thematics:write','soignants:write','locations:write','diagnostic-templates:write','pdf-design:write','patient-form:write','pathway-templates:write'] as const)
    expect(DEFAULT_ROLE_PERMISSIONS.COORDINATEUR).toContain(k)
  expect(DEFAULT_ROLE_PERMISSIONS.INTERVENANT).toEqual(expect.arrayContaining(['patient:create','appointment:create']))
  expect(DEFAULT_ROLE_PERMISSIONS.SECRETARIAT).toEqual(expect.arrayContaining(['patient:create','appointment:create']))
  expect(DEFAULT_ROLE_PERMISSIONS.LECTURE).not.toContain('patient:create')
})
it('ouvre les quatre onglets du quotidien à chaque rôle par défaut', () => {
  for (const p of Object.values(DEFAULT_ROLE_PERMISSIONS))
    expect(p).toEqual(expect.arrayContaining(['dashboard:read','agenda:read','patients:read','suivi:read']))
})
it('lit la liste du rôle', () => {
  expect(hasPermission({ servicePermissions: ['agenda:read'], establishmentRole: 'MEMBER' }, 'agenda:read')).toBe(true)
  expect(hasPermission({ servicePermissions: ['agenda:read'], establishmentRole: 'MEMBER' }, 'suivi:read')).toBe(false)
  expect(hasPermission({ servicePermissions: null, establishmentRole: 'ADMIN' }, 'roles:manage')).toBe(true)
})
it('ignore une clé inconnue', () => {
  expect(parsePermissions(['agenda:read', 'patient:fly'])).toEqual(['agenda:read'])
})
```

Adapter les tests existants du fichier à la nouvelle forme de `RoleSet` ; le test d'égalité des deux copies reste tel quel.

- [ ] **Step 2: Lancer** `cd back && npx jest src/test/unit/utils/permissions.test.ts` → FAIL (exports absents).
- [ ] **Step 3: Implémenter** dans `back/src/main/utils/permissions.ts`, puis recopier à l'identique dans `front/src/utils/permissions.ts`. Le reste du dépôt ne compile plus : c'est attendu, les tâches 3 et 5 le réparent.
- [ ] **Step 4: Lancer** le test → PASS.
- [ ] **Step 5: Commit** `feat(roles): catalogue découpé et rôles par défaut`.

---

### Task 2: Schéma et migration à droits constants

**Files:**
- Modify: `back/prisma/schema.prisma`
- Create: `back/prisma/migrations/20261126120000_roles_configurables/migration.sql`
- Modify: `back/src/main/infra/orm/tenant-guard.ts`
- Modify: `back/src/test/e2e/setup/fixtures.ts`, `back/prisma/seed/user.ts`
- Test: `back/src/test/e2e/roles-migration.test.ts`, `back/src/test/e2e/isolation.test.ts`

**Interfaces:**
- Produces (Prisma) :
  - `ServiceRoleDef { id, establishmentId, serviceId, name, preset ServiceRole?, permissions String[], archivedAt DateTime?, createdAt; @@unique([id, serviceId]); @@index([serviceId]) }` (service model ; l'enum `ServiceRole` reste et sert de `preset`).
  - `ServiceRoleHiddenSoignant { roleId, soignantId, serviceId, establishmentId; @@id([roleId, soignantId]) }`, cascade sur les deux.
  - `ServiceMembership.roleId String` (FK composite `[roleId, serviceId]`, `onDelete: Restrict`), colonne `role` supprimée.
  - `Soignant.defaultRoleId String?`.
  - Fixtures : `createService` crée aussi les quatre rôles par défaut ; `MembershipFixture.services[].role: RolePreset` reste, le fixture le traduit en `roleId` du preset de ce service. Helper exporté `roleIdOf(serviceId: string, preset: RolePreset): Promise<string>`.
  - `defaultRolesData(serviceId, establishmentId)` dans `back/src/main/utils/default-roles.ts` : les quatre `{ name, preset, permissions }` tirés de `DEFAULT_ROLE_PERMISSIONS`. Utilisée par les fixtures, le seed et la création de service (Tâche 4).

- [ ] **Step 1: Écrire le test de migration** (unitaire : la base e2e est déjà migrée, on ne peut pas y rejouer l'avant). La migration crée les rôles par un `INSERT … SELECT` par preset ; le test relit le fichier, en extrait les quatre tableaux et les compare à `DEFAULT_ROLE_PERMISSIONS` :

```ts
it('la migration écrit exactement DEFAULT_ROLE_PERMISSIONS', () => {
  const sql = readFileSync(MIGRATION, 'utf8')
  for (const [preset, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS))
    expect(permissionsInsertedFor(sql, preset)).toEqual([...perms].sort())
})
```

`permissionsInsertedFor` cherche le bloc `-- preset:<PRESET>` et lit le littéral `ARRAY[...]` qui suit. (Fichier en `src/test/unit/infra/roles-migration.test.ts`, pas e2e.)

- [ ] **Step 2: Écrire le cas d'isolation** : un `ServiceRoleDef` du service B n'est ni lisible ni modifiable depuis A (`GET /roles` ne le renvoie pas, `PATCH /roles/:idDeB` → 404). Il passe au vert aux Tâches 4 (`GET`) et 7 (`PATCH`).
- [ ] **Step 3: Lancer** → FAIL.
- [ ] **Step 4: Écrire schéma et migration** : création des tables, `INSERT` des quatre rôles par service (un bloc commenté `-- preset:X` chacun), `UPDATE "ServiceMembership" SET "roleId" = …` par jointure sur `preset = role`, puis `NOT NULL` et suppression de `role`. Déclarer les deux modèles et leurs relations (cardinalités) dans `tenant-guard.ts`. `npm run prisma:generate`. Mettre à jour fixtures et seed.
- [ ] **Step 5: Lancer** `npx jest src/test/unit/infra/roles-migration.test.ts src/test/unit/infra/tenant-guard-schema.test.ts` → PASS.
- [ ] **Step 6: Commit** `feat(roles): rôles de service en base`.

---

### Task 3: Résolution du tenant, `/me`, tâches et notifications

**Files:**
- Modify: `back/src/main/domain/accessGrant.domain.ts`, `back/src/main/types/domain/accessGrant.domain.interface.ts`
- Modify: `back/src/main/types/utils/tenant-context.ts`, `back/src/main/utils/tenant-context.ts`
- Modify: `back/src/main/interfaces/http/fastify/plugins/tenant.plugin.ts`
- Modify: `back/src/main/interfaces/http/fastify/routes/patient.ts`, `back/src/main/domain/patient.domain.ts`
- Modify: `back/src/main/utils/me-mapper.ts`, `back/src/main/interfaces/http/fastify/schemas/me.schema.ts`
- Modify: `back/src/main/infra/orm/repositories/user.repository.ts` (include du rôle et des soignants masqués), `membership.repository.ts`
- Modify: `back/src/main/domain/task.domain.ts`, `back/src/main/services/notification.dispatcher.ts`, `back/src/main/infra/orm/repositories/notification-schedule.repository.ts`
- Test: `back/src/test/unit/utils/me-mapper.test.ts`, `back/src/test/unit/domain/accessGrant.domain.test.ts`, `back/src/test/e2e/taches.test.ts`

**Interfaces:**
- Consumes: `RoleSet`, `parsePermissions`, `ALL_SERVICE_PERMISSIONS` (Tâche 1) ; `roleIdOf` (Tâche 2).
- Produces:
  - `EffectiveMembership.services: { id: string; role: { id: string | null; name: string }; permissions: readonly ServicePermission[]; hiddenSoignantIds: string[] }[]` — `ADMIN`/octroi : `{ id: null, name: 'Administrateur' }`, `ALL_SERVICE_PERMISSIONS`, `[]`.
  - `Tenant.servicePermissions: readonly ServicePermission[] | null` remplace `serviceRole` ; `ServiceTenant.servicePermissions` non nul.
  - `/me` : chaque service porte `role: { id, name }`, `permissions: string[]`, `hiddenSoignantIds: string[]` à la place de `role: ServiceRole`.

- [ ] **Step 1: Tests** : me-mapper (un membre au rôle personnalisé `['agenda:read']` reçoit exactement ça ; un `ADMIN` reçoit toutes les clés et `role.id === null`) ; e2e tâches : un membre dont le rôle n'a pas `tasks:read` n'est pas assignable et ne reçoit pas la notification `TASK_DUE`.
- [ ] **Step 2: Lancer** → FAIL.
- [ ] **Step 3: Implémenter.** `role !== 'LECTURE'` devient « `permissions` contient `tasks:read` » (côté repository : `role: { permissions: { has: 'tasks:read' } }`).
- [ ] **Step 4: Lancer** `npm run build && npx jest src/test/unit && npm run test:e2e` (≈5 min, premier plan) → PASS. Les e2e qui envoient `role: 'X'` sur les routes de membres restent rouges jusqu'à la Tâche 4 : les noter, ne pas les corriger ici.
- [ ] **Step 5: Commit** `feat(roles): résolution par permissions du rôle`.

---

### Task 4: API des membres en `roleId`, création de service, liste des rôles

**Files:**
- Modify: `back/src/main/interfaces/http/fastify/schemas/serviceMembers.schema.ts`, `members.schema.ts`
- Modify: `back/src/main/interfaces/http/fastify/routes/serviceMembers.ts`, `members.ts`
- Modify: `back/src/main/domain/membership.domain.ts`, `types/domain/membership.domain.interface.ts`, `infra/orm/repositories/membership.repository.ts`
- Modify: `back/src/main/infra/orm/repositories/service.repository.ts` (création : quatre rôles + créateur sur le preset `COORDINATEUR`)
- Modify: `back/src/main/services/activity-log.subscriber.ts` (libellé = nom du rôle, plus la table `COORDINATEUR: 'Coordinateur'`)
- Create: `back/src/main/domain/serviceRole.domain.ts`, `infra/orm/repositories/serviceRole.repository.ts`, leurs interfaces, `schemas/serviceRole.schema.ts`, `routes/serviceRole.ts` ; enregistrer dans l'IoC et `tenant.routes.ts` (`/roles`)
- Test: `back/src/test/e2e/service-members.test.ts`, `members.test.ts`, `services.test.ts`, nouveau `roles.test.ts`

**Interfaces:**
- Produces:
  - `GET /e/:e/s/:s/roles` (`members:read`) → `{ id, name, preset, permissions, hiddenSoignantIds, memberCount, archivedAt }[]`, non supprimés par défaut, `?archived=true` pour les supprimés.
  - Corps : `role` → `roleId: cuid()` dans `inviteServiceMemberSchema`, `setServiceRoleSchema`, et pour chaque service des schémas d'établissement (`members.schema.ts`). Réponse membre : `role: { id, name }`.
  - `ServiceRoleRepository.findActiveInService(roleId: string): Promise<{ id: string } | null>` ; le domaine refuse (400 « Rôle inconnu dans ce service ») un `roleId` absent ou supprimé.

- [ ] **Step 1: Tests** : invitation avec le `roleId` d'un autre service → 400 ; avec un rôle supprimé → 400 ; un coordinateur qui change son propre rôle → refusé comme avant ; création de service → quatre rôles, créateur en Coordinateur ; `GET /roles` renvoie les quatre avec `memberCount`. Mettre à jour les e2e existants qui envoyaient `role: 'X'` via `roleIdOf`.
- [ ] **Step 2: Lancer** → FAIL.
- [ ] **Step 3: Implémenter.**
- [ ] **Step 4: Lancer** `npm run build && npm run lint && npm run test:e2e` → PASS (suite entière verte à partir d'ici).
- [ ] **Step 5: Commit** `feat(roles): membres attribués par roleId`.

---

### Task 5: Front branché sur les permissions du rôle

**Files:**
- Modify: `front/src/types/auth.ts`, `types/member.ts`, `types/serviceMember.ts`
- Modify: `front/src/utils/tenant-context.ts`, `hooks/useCan.ts`, `queries/useInbox.ts`
- Modify: `front/src/routes/_authenticated/e/$establishmentId/s/$serviceId/dashboard.tsx` (le test `serviceRole === 'COORDINATEUR'` devient `useCan(...)` sur la permission que l'écran utilise réellement)
- Create: `front/src/api/roles.api.ts`, `queries/useRoles.ts` (`useRolesQuery()`)
- Modify: `components/custom/popup/inviteServiceMemberForm.tsx`, `editServiceMemberForm.tsx`, `editMemberForm.tsx`, `createMemberAccountForm.tsx`, `adminServiceRole.tsx`, `components/custom/mesSoignants.tsx`, `columns/member.column.tsx`
- Delete: `SERVICE_ROLE_LABEL` / `SERVICE_ROLE_DESCRIPTION` de `constants/member.constant.ts`
- Test: tests front existants touchés (`grep -rl "serviceRole\|ServiceRole" front/src --include=*.test.*`, 39 fichiers) + `front/src/hooks/useCan.test.ts`

**Interfaces:**
- Consumes: `/me` et `GET /roles` (Tâches 3 et 4).
- Produces: `TenantContext.servicePermissions: readonly ServicePermission[] | null`, `hiddenSoignantIds: string[]` ; `can(context, permission)` inchangé en signature.

- [ ] **Step 1: Test** `useCan` : un contexte `{ servicePermissions: ['agenda:read'], establishmentRole: 'MEMBER' }` donne vrai pour `agenda:read`, faux pour `suivi:read`.
- [ ] **Step 2: Lancer** `cd front && npx vitest run src/hooks/useCan.test.ts` → FAIL.
- [ ] **Step 3: Implémenter** ; les sélecteurs de rôle listent `useRolesQuery()` du service concerné (pour l'écran d'établissement : une requête par service affiché).
- [ ] **Step 4: Lancer** `npx tsc -p tsconfig.app.json && npm run lint && npm test` → PASS.
- [ ] **Step 5: Commit** `feat(roles): front lit les permissions du rôle`.

---

### Task 6: Routes et écrans re-gardés par les clés découpées

**Files:**
- Modify (back, `config.permission`) : `routes/pathwayTemplate.ts` (écritures → `pathway-templates:write`), `thematic.ts` → `thematics:write`, `soignant.ts` → `soignants:write`, `location.ts` → `locations:write`, `diagnosticEducatifTemplate.ts` → `diagnostic-templates:write`, `pdfDesign.ts` + `pdfAsset.ts` → `pdf-design:write`, `serviceField.ts` + `serviceFieldCategory.ts` → `patient-form:write`, `serviceMembers.ts` (`/:id/soignant`) → `service-members:manage`, `patient.ts` (`POST /`) → `patient:create`, `appointment.ts` (`POST /`) → `appointment:create`
- Modify (front) : `navigation/navigation.ts` (Dashboard `dashboard:read`, Agenda `agenda:read`, Patients `patients:read`, Suivi `suivi:read`, chaque écran d'administration sur sa clé), `_settings.tsx` (`SETTINGS_PERMISSIONS`), le `beforeLoad` de chaque écran concerné, le bouton « Ajouter un patient » (`useCan('patient:create')` dans dashboard, patient/index, agenda, suivi), « Nouveau rendez-vous » de l'Agenda (`appointment:create`), `routes/.../_settings/planning.tsx` (édition des parcours théoriques sous `pathway-templates:write`, le reste sous `planning:write`)
- Test: `back/src/test/e2e/permissions.test.ts`, `front/src/navigation/navigation.test.ts` (ou le test de nav existant)

- [ ] **Step 1: Tests** e2e : un rôle `[...lectures, 'planning:write']` → `POST /slot-template` 201, `POST /pathway-template` 403 ; un rôle sans `patient:create` mais avec `patient:write` → `POST /patient` 403, `PATCH /patient/:id` 200 ; sans `appointment:create` → `POST /appointment` 403. Front : un contexte sans `suivi:read` ne voit pas l'onglet Suivi ; avec seulement `diagnostic-templates:write` le menu Administration ne montre que « Diagnostics éducatifs ».
- [ ] **Step 2: Lancer** → FAIL.
- [ ] **Step 3: Implémenter.** Chaque entrée de `navigation.ts` garde la **même** clé que le `beforeLoad` de son écran.
- [ ] **Step 4: Lancer** back `npm run build && npm run test:e2e`, front `npx tsc -p tsconfig.app.json && npm test` → PASS.
- [ ] **Step 5: Commit** `feat(roles): routes et onglets sur les clés découpées`.

---

### Task 7: Gestion des rôles (back)

**Files:**
- Modify: `back/src/main/domain/serviceRole.domain.ts`, `serviceRole.repository.ts`, `schemas/serviceRole.schema.ts`, `routes/serviceRole.ts`
- Modify: `back/src/main/utils/app-event-bus.ts`, `services/activity-log.subscriber.ts` (événements `role.created`, `role.updated`, `role.archived`, `role.restored`)
- Modify: front `constants` du vocabulaire du journal (contrat bilatéral, cf. `access-log-vocabulaire.test.ts`)
- Test: `back/src/test/e2e/roles.test.ts`, `isolation.test.ts`

**Interfaces:**
- Produces (toutes `roles:manage`, donc `ADMIN` seul) :
  - `POST /roles` `{ name: string(1..60), permissions: ServicePermission[], hiddenSoignantIds?: string[] }` → 201 rôle.
  - `PATCH /roles/:roleId` mêmes champs, optionnels.
  - `DELETE /roles/:roleId` → archive ; 409 « Rôle encore attribué à N membre(s) » si `memberCount > 0` ; 409 aussi s'il est rôle par défaut d'un soignant actif.
  - `POST /roles/:roleId/restore`.
  - Nom unique parmi les rôles non supprimés du service (409, même encart « nom déjà pris » que les référentiels).

- [ ] **Step 1: Tests** : clé inconnue → 400 ; coordinateur (non `ADMIN`) → 403 ; doublon de nom → 409 ; suppression d'un rôle attribué → 409 ; supprimer puis restaurer ; `hiddenSoignantIds` contenant un soignant d'un autre service → 400 ; ligne `role.updated` au journal avec le nom du rôle ; cas d'isolation de la Tâche 2 passe.
- [ ] **Step 2: Lancer** → FAIL.
- [ ] **Step 3: Implémenter.**
- [ ] **Step 4: Lancer** `npm run build && npm run lint && npm run test:e2e` → PASS.
- [ ] **Step 5: Commit** `feat(roles): créer, modifier, supprimer un rôle`.

---

### Task 8: Rôle par défaut du soignant

**Files:**
- Modify (back) : `schemas/soignant.schema.ts`, `domain/soignant.domain.ts`, `infra/orm/repositories/soignant.repository.ts` (`defaultRoleId` en lecture et écriture ; réponse de `PATCH` : `{ ...soignant, membersWithOtherRole: number }`)
- Modify (front) : `routes/.../_settings/soignant.tsx` (colonne « Rôle par défaut », sélecteur ; après enregistrement, si `membersWithOtherRole > 0`, toast « N compte(s) rattaché(s) gardent un autre rôle »), `inviteServiceMemberForm.tsx` et le rattachement soignant de `editServiceMemberForm.tsx` (choisir un soignant remplit `roleId` avec son `defaultRoleId` s'il en a un), `routes/.../_settings/members.tsx` + `columns` (badge « Rôle différent de {soignant} » quand `member.role.id !== soignant.defaultRoleId` et que ce dernier est non nul ; action « Appliquer le rôle par défaut » = `PATCH` rôle existant)
- Test: `back/src/test/e2e/soignant-role-defaut.test.ts`, `front/src/components/custom/popup/inviteServiceMemberForm.test.tsx`, test de la colonne membres

- [ ] **Step 1: Tests** : back : `defaultRoleId` d'un autre service → 400 ; changer le rôle par défaut ne modifie aucun `ServiceMembership.roleId` et renvoie `membersWithOtherRole` correct. Front : choisir le soignant « IDE SMCP » (défaut « Équipe SMCP ») dans l'invitation sélectionne « Équipe SMCP », qui reste modifiable ; badge affiché si et seulement si les rôles diffèrent ; aucun badge si le soignant n'a pas de rôle par défaut.
- [ ] **Step 2: Lancer** → FAIL.
- [ ] **Step 3: Implémenter.**
- [ ] **Step 4: Lancer** back e2e ciblé + front `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(roles): rôle par défaut du soignant`.

---

### Task 9: Écran « Rôles » et soignants masqués

**Files:**
- Create: `front/src/routes/_authenticated/e/$establishmentId/s/$serviceId/_settings/roles.tsx`, `front/src/constants/permissions.constant.ts` (`PERMISSION_LABELS: Record<ServicePermission, { label: string; group: 'Quotidien' | 'Pilotage' | 'Administration' | 'Actions' }>`)
- Modify: `front/src/navigation/navigation.ts` (entrée « Rôles », `roles:manage`, groupe Administration, description « Droits de chaque rôle du service »), `api/roles.api.ts`, `queries/useRoles.ts` (mutations create/update/delete/restore)
- Modify: `front/src/routes/.../dashboard.tsx` (filtre des soignants : `s.hidden || hiddenSoignantIds.includes(s.id)`, à côté du filtre existant lignes 125-135)
- Test: `front/src/routes/.../_settings/roles.test.tsx`, `front/src/constants/permissions.constant.test.ts`, test dashboard

- [ ] **Step 1: Tests** : `PERMISSION_LABELS` couvre exactement `SERVICE_PERMISSION_KEYS` (dans les deux sens) ; l'écran liste les rôles avec leur nombre de membres, coche/décoche une permission et enregistre, renomme, supprime (bouton désactivé avec explication si `memberCount > 0`), affiche les supprimés et « Restaurer » ; choisir des soignants masqués les envoie dans `hiddenSoignantIds`. Dashboard : un soignant présent dans `hiddenSoignantIds` n'apparaît pas dans la liste ni le filtre, un soignant absent apparaît.
- [ ] **Step 2: Lancer** → FAIL.
- [ ] **Step 3: Implémenter** dans le style des écrans de référentiels existants (`thematic.tsx` en référence) : X pour supprimer, onglet « Supprimés ».
- [ ] **Step 4: Lancer** `npx tsc -p tsconfig.app.json && npm run lint && npm test` → PASS.
- [ ] **Step 5: Vérifier dans le navigateur** (http://etepea.localhost:4270, compte du seed) : créer « Cadre de santé » selon le cas n°2 de la spec, l'attribuer à un compte de test, se connecter avec : onglets Suivi et Pilotage absents, Administration limitée à Planning, Diagnostics éducatifs, Fiche patient, Indicateurs ; pas de bouton « Ajouter un patient » ; Kiné 1 à 3 et APA absents du Dashboard.
- [ ] **Step 6: Commit** `feat(roles): écran Rôles et soignants masqués`.

---

### Clôture

- [ ] `graphify update .`
- [ ] Mettre à jour `docs/multi-tenant/habilitations.md` (rôles en base, catalogue découpé, `roles:manage`) et le commentaire d'en-tête de `back/CLAUDE.md` sur la matrice.
- [ ] Merger `main` dans la branche, relancer les deux suites, puis fusion `--ff-only` depuis le dépôt principal.
- [ ] Supprimer la base `etepea_test_roles`.
