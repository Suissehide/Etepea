# Traçabilité, notification et restauration du planning — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** chaque modification du planning (`planning:write`) laisse une ligne au journal ; celle d'un non-administrateur notifie les `ADMIN` de l'établissement ; toute suppression se restaure depuis la notification ou le journal.

**Architecture:** quatre événements de bus génériques (`planning.created|updated|deleted|restored`, le type d'entité dans `entityType`) écrits par `ActivityLogSubscriber`, qui notifie ensuite les ADMIN (`PLANNING_CHANGED`) si l'auteur n'en est pas un. Les suppressions deviennent restaurables : créneau et parcours archivent au lieu de supprimer ; semaine interdite et cycle, petites lignes, sont recréés depuis un `restoreData` JSON posé sur la ligne de journal. Une seule route `POST /planning/restore/:activityLogId` rejoue la restauration selon `entityType`.

**Tech Stack:** Fastify + Zod + Prisma 7 (back), React + TanStack Query (front), Jest (e2e back sur base dédiée), Vitest (front), Biome.

**Spec:** `docs/superpowers/specs/2026-11-26-roles-configurables-design.md`, section « Traçabilité du planning (cas n°2) » et étape 5.

## Ce que la lecture du code a corrigé dans la spec

La spec suppose que « créneaux et modèles archivent au lieu de supprimer ». C'est faux aujourd'hui :

- `DELETE /slot/:id` supprime en dur. Le front n'archive (`PATCH archivedAt`) que les créneaux qui portent un patient et supprime les autres (`archiveOrDeleteSlots`, `_settings/planning.tsx`).
- `DELETE /pathway/:id` supprime en dur tous les créneaux du parcours, et donc, par cascade, **leurs rendez-vous avec patients**. Aucune notification d'annulation n'est envoyée.
- `ForbiddenWeek` et `PlanningCycle` sont supprimés en dur.
- Les routes `slot-template` (POST, PATCH, DELETE) ne servent qu'aux créneaux des parcours théoriques (mode édition), mais elles sont gardées par `planning:write`. Le cadre de santé du cas n°2 peut donc modifier les parcours théoriques par l'API, ce que la spec interdit.

## Global Constraints

- Journal : quatre actions seulement, `planning.created`, `planning.updated`, `planning.deleted`, `planning.restored` ; `entityType` ∈ `slot`, `pathway`, `forbiddenWeek`, `planningCycle`.
- Journal : on journalise **toutes** les modifications, administrateur compris. Seule la notification est réservée aux auteurs dont `establishmentRole !== 'ADMIN'` (lu dans `tenantContext.current()`).
- Notification `PLANNING_CHANGED` : destinataires = membres d'établissement `ADMIN` actifs (`user.deactivatedAt === null`), jamais l'auteur. Clé de préférence `planning` : application activée par défaut, e-mail désactivé par défaut.
- Dédoublonnage : une suppression = une notification (pas de `dedupeKey`). Les autres changements sont regroupés par auteur et par heure : `dedupeKey = planning:${actorId}:${YYYY-MM-DDTHH}` (UTC).
- Restauration : `POST /planning/restore/:activityLogId`, permission `planning:write`. Elle refuse avec 409 « Cette suppression a déjà été restaurée » si `restoredAt` est déjà posé, et avec 404 si la ligne n'est pas un `planning.deleted` du service courant.
- Libellés visibles : « Supprimer », jamais « Archiver » ; « Restaurer » ; pas de tiret cadratin, pas de virgule avant « et » (mémoire `textes-sans-tics-ia`).
- Biome uniquement, jamais `biome-ignore` ; commentaires d'une ligne au plus.
- Toute migration est datée du jour, avec un préfixe postérieur à `20261126140000`.

## Review Focus

1. Un parcours supprimé dont des créneaux portent des patients : les rendez-vous doivent rester visibles sur le Dashboard, les soignants reçoivent `APPOINTMENT_CANCELLED`, et la restauration rattache et désarchive ces créneaux. Testé en tâche 2 et en tâche 5.
2. Un créneau vide « supprimé » (désormais archivé) ne doit plus apparaître au Planning, ni compter dans les conflits back (`findConflicts`), ni être recopié par la copie de semaine. Testé en tâche 2.
3. Une rafale (suppression groupée de 20 créneaux, copie d'une semaine) donne 20 lignes de journal, 20 notifications de suppression, mais une seule notification pour les modifications. Testé en tâche 4.
4. Une semaine interdite recréée entre-temps, ou un nouveau cycle enregistré depuis, fait répondre 409 à la restauration, sans rien écraser. Une ligne restaurée deux fois en parallèle n'est restaurée qu'une fois. Testé en tâche 5.
5. Un super-admin entré par une autorisation temporaire est `ADMIN` effectif : il ne déclenche aucune notification, et n'en reçoit pas, puisqu'il n'a pas d'appartenance réelle. Testé en tâche 4.

---

### Task 1 : les créneaux des parcours théoriques passent sous `pathway-templates:write`

**Files:**
- Modify: `back/src/main/interfaces/http/fastify/routes/slotTemplate.ts` (POST `/`, PATCH, DELETE : `planning:write` → `pathway-templates:write`)
- Test: `back/src/test/e2e/roles-slot-template.test.ts` (nouveau)

**Interfaces:**
- Produces : aucun changement d'API, seulement la clé exigée.

- [ ] **Step 1 : écrire le test e2e qui échoue.** Créer un rôle de service avec `planning:read` et `planning:write`, sans `pathway-templates:write` (sur le modèle des fixtures de rôle des tests e2e existants). Avec un membre de ce rôle, vérifier que `POST /slot-template` → 403, `PATCH /slot-template/:id` → 403 et `DELETE /slot-template/:id` → 403. Le même membre doit toujours pouvoir faire `PATCH /slot/:id` (200). Un coordinateur doit toujours pouvoir faire `POST /slot-template` (200).
- [ ] **Step 2 : lancer le test, il doit échouer.** `npx jest src/test/e2e/roles-slot-template.test.ts` → FAIL (200 au lieu de 403).
- [ ] **Step 3 : changer les trois `config: { permission }`.**
- [ ] **Step 4 : relancer le test, il doit passer.** Lancer aussi `npx jest src/test/unit -t permission` → vert.
- [ ] **Step 5 : commit.** `fix(roles): créneaux des parcours théoriques gardés par pathway-templates:write`

### Task 2 : les suppressions du planning deviennent restaurables

**Files:**
- Modify: `back/src/main/domain/slot.domain.ts` : `delete` archive au lieu de supprimer, en appelant `slotRepository.update(id, { archivedAt: new Date() })`. Il garde les notifications d'annulation.
- Modify: `back/src/main/infra/orm/repositories/pathway.repository.ts` : `delete` devient `archive`.
- Modify: `back/src/main/domain/pathway.domain.ts` (+ son interface), la route `pathway.ts` DELETE.
- Modify: `back/src/main/domain/forbiddenWeek.domain.ts` et `planningCycle.domain.ts` : `delete` rend la ligne supprimée (pour le `restoreData` de la tâche 3).
- Test: `back/src/test/e2e/planning-suppression-restaurable.test.ts` (nouveau)

**Interfaces:**
- Produces :
  - `PathwayRepository.archive(pathwayID: string): Promise<PathwayRestoreData>`.
  - `PathwayRepository.restore(data: PathwayRestoreData): Promise<void>`. Ses tests vivent en tâche 5, mais il s'écrit ici, à côté d'`archive`.
  - Le type, défini dans `back/src/main/types/infra/orm/repositories/pathway.repository.interface.ts` :
    ```ts
    type PathwayRestoreData = {
      pathway: { id: string; startDate: string; templateID: string | null }
      slotIds: string[]
      priorities: { patientID: string; priority: number }[]
    }
    ```
  - `PathwayDomain.delete(pathwayID: string, userID: string): Promise<PathwayRestoreData>`.
  - `ForbiddenWeekDomain.delete(id) → { startOfWeek: string }` et `PlanningCycleDomain.delete() → { startOfWeek: string; weekCount: number } | null`.

- [ ] **Step 1 : écrire les tests e2e qui échouent.**
  - `DELETE /slot/:id` sur un créneau **vide** → 204, la ligne existe toujours avec `archivedAt` non nul.
  - `DELETE /pathway/:id` sur un parcours dont un créneau porte un patient → 204. Ensuite :
    - le rendez-vous existe toujours et son créneau a `archivedAt` non nul et `pathwayID` null ;
    - le parcours n'existe plus ;
    - les modèles clonés existent toujours ;
    - une notification `APPOINTMENT_CANCELLED` a été écrite pour le soignant de la séance (même attente que `notifications-creneaux.test.ts` pour un créneau archivé).
  - Les conflits de `GET /slot` ignorent un créneau archivé qui chevauche un autre créneau dans la même salle.
- [ ] **Step 2 : lancer les tests, ils doivent échouer.** `npx jest src/test/e2e/planning-suppression-restaurable.test.ts` → FAIL.
- [ ] **Step 3 : implémenter.** `PathwayRepository.archive` travaille dans une seule transaction :
  1. lire le parcours, ses créneaux non archivés et ses `patientPriorities` ;
  2. faire `slot.updateMany({ archivedAt: now })` sur ces créneaux ;
  3. supprimer le parcours (le `SetNull` détache les créneaux, la cascade retire les priorités, que le `restoreData` garde) ;
  4. **ne plus supprimer les modèles clonés**.

  `PathwayDomain.delete` prend un instantané des rendez-vous (`notificationDispatcher.snapshot`) avant d'archiver, puis appelle `cancelled(userID, snapshots)`, comme `SlotDomain.delete`. Si `findConflicts` compte les créneaux archivés, filtrer `archivedAt: null` là où il lit les créneaux.
- [ ] **Step 4 : relancer les tests, ils doivent passer.** Relancer aussi `creneau-archivage.test.ts`, `notifications-creneaux.test.ts` et `creneau-copie-parcours.test.ts` → verts.
- [ ] **Step 5 : commit.** `feat(planning): supprimer un créneau ou un parcours archive, rendez-vous conservés`

### Task 3 : les modifications du planning au journal

**Files:**
- Create: `back/prisma/migrations/20261126150000_planning_tracabilite/migration.sql`. La migration ajoute `ActivityLog.restoreData JSONB NULL` et `ActivityLog.restoredAt TIMESTAMP(3) NULL`, ainsi que la valeur `PLANNING_CHANGED` de l'enum `NotificationType` (servie en tâche 4, posée ici pour n'avoir qu'une migration).
- Modify: `back/prisma/schema.prisma`
- Modify: `back/src/main/utils/app-event-bus.ts` : ajouter les 4 événements.
- Modify: `back/src/main/services/activity-log.subscriber.ts` : ajouter `PLANNING_ACTIONS`, la boucle d'abonnement, `#decrire` pour `slot` et `pathway`, et `#log`, qui accepte et écrit `restoreData`.
- Modify: `back/src/main/infra/orm/repositories/activityLog.repository.ts` (+ interface) : `create` rend `{ id: string }`.
- Modify: les domaines et les routes émetteurs (liste au Step 3).
- Modify: `back/src/main/interfaces/http/fastify/schemas/activityLog.schema.ts` : ajouter `restoredAt: z.date().nullable()` à la réponse, **pas** `restoreData`.
- Modify: `back/src/test/e2e/activity-log-emissions-declarees.test.ts` : ajouter les 4 événements avec `{ genre: 'tenant-service' }`.
- Modify: `front/src/constants/activityLog.constant.ts`.
- Modify: `back/CLAUDE.md` (le vocabulaire passe de 23 à 27 valeurs).
- Test: `back/src/test/e2e/planning-journal.test.ts` (nouveau)

**Interfaces:**
- Produces :
  ```ts
  type PlanningEntity = 'slot' | 'pathway' | 'forbiddenWeek' | 'planningCycle'
  type PlanningEvent = {
    userID: string
    entityType: PlanningEntity
    entityID: string
    restoreData?: Record<string, unknown>
  }
  // AppEvents : 'planning.created' | 'planning.updated' | 'planning.deleted' | 'planning.restored' → PlanningEvent
  ```
  Côté journal, `ActivityLog.entityType` reçoit l'`entityType` de l'événement.

- [ ] **Step 1 : écrire le test e2e qui échoue (`planning-journal.test.ts`).** Pour chaque opération, vérifier la ligne écrite dans `GET /activity-log` (`action`, `entityType`, `entityID`, `detail` non vide) :

  | Opération | Ligne attendue |
  |---|---|
  | `POST /slot` | `planning.created`, `slot` |
  | `PATCH /slot/:id` (changement d'heure) | `planning.updated`, `slot` |
  | `PATCH /slot/:id` avec `archivedAt` | `planning.deleted`, `slot` |
  | `PATCH /slot/:id` avec `archivedAt: null` | `planning.restored`, `slot` |
  | `DELETE /slot/:id` | `planning.deleted`, `slot` |
  | `POST /pathway/instantiate` | `planning.created`, `pathway`, **une seule ligne** malgré N créneaux |
  | `DELETE /pathway/:id` | `planning.deleted`, `pathway` |
  | `POST /pathway/regenerate` | `planning.updated`, `pathway` |
  | `POST /forbidden-week` | `planning.created`, `forbiddenWeek` |
  | `DELETE /forbidden-week/:id` | `planning.deleted`, `forbiddenWeek` |
  | `PUT /planning-cycle` | `planning.updated`, `planningCycle` |
  | `DELETE /planning-cycle` | `planning.deleted`, `planningCycle` |

  Pour les suppressions, lire la ligne en base et vérifier que `restoreData` vaut :
  - `{ startOfWeek }` pour une semaine interdite ;
  - `{ startOfWeek, weekCount }` pour un cycle ;
  - `PathwayRestoreData` pour un parcours ;
  - rien pour un créneau (`entityID` suffit).

  Vérifier aussi que `restoreData` n'est pas dans la réponse HTTP.
- [ ] **Step 2 : lancer le test, il doit échouer.** `npx prisma migrate dev` sur la base du worktree, puis `npx jest src/test/e2e/planning-journal.test.ts` → FAIL.
- [ ] **Step 3 : implémenter les émissions.**
  - `SlotDomain.create`, `update` et `delete` (`create` reçoit `userID` depuis la route). Dans `update`, choisir l'action :
    - `archivedAt` passe de null à une date → `deleted` ;
    - il passe d'une date à null → `restored` ;
    - sinon → `updated`.
  - `PathwayDomain.create`, `update` et `delete`.
  - Le handler `instantiate` de `routes/pathway.ts` émet une fois à la fin, les créations internes n'émettent rien. Même chose pour `regenerate`, qui émet une fois avec `entityID` = les `pathwayTemplateIDs` joints par `,` et `detail` = « N parcours régénérés ».
  - `ForbiddenWeekDomain.create` et `delete`.
  - `PlanningCycleDomain.save` et `delete`.

  `detail` est fourni par l'émetteur pour `forbiddenWeek` (« semaine du DD/MM/YYYY ») et `planningCycle` (« N semaines à partir du DD/MM/YYYY »). Pour `slot` (date, heure, thématique) et `pathway` (nom du modèle, date de début), `#decrire` le calcule. Un créneau archivé reste lisible.
- [ ] **Step 4 : compléter le front.** Ajouter dans `ACTION_LABELS` : `'planning.created': 'Planning : ajout'`, `'planning.updated': 'Planning : modification'`, `'planning.deleted': 'Planning : suppression'`, `'planning.restored': 'Planning : restauration'`. Ajouter dans `TYPE_LABELS` : `slot: 'Créneau'`, `pathway: 'Parcours'`, `forbiddenWeek: 'Semaine interdite'`, `planningCycle: 'Cycle'`.
- [ ] **Step 5 : relancer les tests, ils doivent passer.** `planning-journal.test.ts`, `activity-log-emissions-declarees.test.ts`, `npx jest src/test/unit -t vocabulaire` (back) et `npx vitest run src/constants` (front) → verts.
- [ ] **Step 6 : commit.** `feat(planning): modifications du planning au journal d'activité`

### Task 4 : notification `PLANNING_CHANGED` aux administrateurs

**Files:**
- Modify: `back/src/main/utils/notification-prefs.ts` : ajouter la clé `planning` à `NOTIFICATION_PREF_KEYS` et `PLANNING_CHANGED: 'planning'` à `PREF_KEY_OF_TYPE`.
- Modify: `back/src/main/interfaces/http/fastify/schemas/notification.schema.ts`, `notification-prefs.schema.ts`.
- Modify: `back/src/main/infra/mail/notification-templates.ts` : sujet « Etepea : planning modifié ».
- Modify: `back/src/main/infra/orm/repositories/membership.repository.ts` (+ interface) : `findActiveAdminUserIds(): Promise<string[]>`.
- Modify: `back/src/main/services/notification.dispatcher.ts` (+ interface) : `planningChanged(...)`.
- Modify: `back/src/main/services/activity-log.subscriber.ts` : après `create`, appeler le dispatcher pour les `PLANNING_ACTIONS`.
- Test: `back/src/test/e2e/notifications-planning.test.ts` (nouveau)

**Interfaces:**
- Consumes : `ActivityLogRepository.create → { id }` et `PlanningEvent` (tâche 3).
- Produces :
  ```ts
  planningChanged(input: {
    actorId: string
    activityLogId: string
    action: 'planning.created' | 'planning.updated' | 'planning.deleted' | 'planning.restored'
    entityType: PlanningEntity
    detail: string | null
  }): void
  ```
  La notification porte la charge utile `{ actorId, activityLogId, action, entityType, detail }`.

- [ ] **Step 1 : écrire le test e2e qui échoue.**
  - Un membre non ADMIN avec `planning:write` fait `DELETE /forbidden-week/:id`. L'ADMIN actif reçoit une `PLANNING_CHANGED` dont `payload.action = 'planning.deleted'` et `payload.activityLogId` est l'id de la ligne. Un ADMIN désactivé ne reçoit rien, et l'auteur ne reçoit rien.
  - Le même membre fait trois `PATCH /slot/:id` dans l'heure : une seule notification de modification.
  - Deux `DELETE /slot/:id` : deux notifications de suppression.
  - Les mêmes actions faites par l'ADMIN : aucune notification, mais les lignes de journal existent.
  - Un ADMIN dont la préférence `app.planning` vaut `false` ne reçoit rien.
- [ ] **Step 2 : lancer le test, il doit échouer.** `npx jest src/test/e2e/notifications-planning.test.ts` → FAIL.
- [ ] **Step 3 : implémenter.**
  - Dans le souscripteur : `if (this.tenantContext.current().establishmentRole === 'ADMIN') return`, avant d'appeler le dispatcher.
  - Dans le dispatcher : `#write` avec les destinataires `findActiveAdminUserIds()`, moins l'auteur. Pas de `dedupeKey` si `action === 'planning.deleted'`, sinon la clé horaire des Global Constraints.
  - `findActiveAdminUserIds` interroge `establishmentMembership.findMany({ where: { ...establishmentScope, role: 'ADMIN', user: { deactivatedAt: null } }, select: { userId: true } })`.
- [ ] **Step 4 : relancer les tests, ils doivent passer.** Relancer aussi `notification-prefs.test.ts`, `notifications-mails.test.ts` et les tests unitaires de `notification-prefs` → verts.
- [ ] **Step 5 : commit.** `feat(notifications): les administrateurs sont prévenus des modifications du planning`

### Task 5 : restaurer une suppression

**Files:**
- Create: `back/src/main/domain/planningRestore.domain.ts` (+ `types/domain/planningRestore.domain.interface.ts`), enregistré dans `awilix-ioc-container.ts` et `types/application/ioc.ts`.
- Create: `back/src/main/interfaces/http/fastify/routes/planningRestore.ts`, enregistré dans `routes/tenant.routes.ts` avec le préfixe `/planning/restore`.
- Modify: `back/src/main/infra/orm/repositories/activityLog.repository.ts` (+ interface), qui gagne trois méthodes :
  - `findPlanningDeletion(id: string): Promise<{ id: string; entityType: string; entityID: string; restoreData: unknown; restoredAt: Date | null } | null>`, bornée à `establishmentId` + `serviceId` courants et `action = 'planning.deleted'` ;
  - `claimRestore(id: string): Promise<boolean>`, un `updateMany where restoredAt: null`, qui rend `count === 1` ;
  - `releaseRestore(id: string): Promise<void>`.
- Modify: `back/src/main/infra/orm/repositories/pathway.repository.ts` : `restore` (déclaré en tâche 2).
- Test: `back/src/test/e2e/planning-restauration.test.ts` (nouveau)

**Interfaces:**
- Consumes : `PathwayRestoreData` et `PathwayRepository.restore` (tâche 2), les lignes `planning.deleted` (tâche 3).
- Produces : `POST /e/:establishmentId/s/:serviceId/planning/restore/:activityLogId` → 204. `PlanningRestoreDomain.restore(activityLogId: string, userID: string): Promise<void>`.

- [ ] **Step 1 : écrire le test e2e qui échoue.**
  - Créneau supprimé, puis restauré → `archivedAt` null, ligne de journal `restoredAt` non nul, nouvelle ligne `planning.restored`.
  - Parcours supprimé avec un créneau réservé et une priorité patient, puis restauré :
    - le parcours a le même id ;
    - les créneaux sont rattachés (`pathwayID`) et désarchivés ;
    - la priorité est recréée.
    Si le patient a été supprimé entre-temps, sa priorité est ignorée sans erreur.
  - Semaine interdite supprimée puis restaurée → la ligne existe de nouveau. Si la même semaine a été recréée entre-temps → 409, et `restoredAt` reste null.
  - Cycle supprimé puis restauré → mêmes valeurs. Si un autre cycle a été enregistré depuis → 409 « Un autre cycle a été enregistré depuis ».
  - Deuxième restauration → 409 « Cette suppression a déjà été restaurée ». Deux appels simultanés (`Promise.all`) → un 204 et un 409.
  - Une ligne d'un autre service, ou une ligne `planning.updated` → 404.
  - Un membre sans `planning:write` → 403.
- [ ] **Step 2 : lancer le test, il doit échouer.** `npx jest src/test/e2e/planning-restauration.test.ts` → FAIL (404, route absente).
- [ ] **Step 3 : implémenter `restore`.**
  1. Lire la ligne : 404 si elle est absente. Puis `claimRestore` : 409 si elle rend `false`.
  2. Aiguiller selon `entityType`, dans un `try` :
     - `slot` → `slotDomain.update(entityID, { archivedAt: null }, userID)` (émet déjà `planning.restored`) ;
     - `pathway` → `pathwayRepository.restore`, avec `templateID` mis à null si le modèle n'existe plus ;
     - `forbiddenWeek` → `forbiddenWeekDomain.create` (une unicité violée remonte en 409 via `errorHandler`) ;
     - `planningCycle` → 409 si `planningCycleDomain.find()` rend un cycle, sinon `save`.
  3. En cas d'échec, `releaseRestore` puis relancer l'erreur.
  4. Hors `slot`, émettre `planning.restored`.

  `ActivityLog.update` sous contexte de tenant doit passer le garde : `where` porte `establishmentId`.
- [ ] **Step 4 : relancer les tests, ils doivent passer.** Relancer aussi `isolation.test.ts` et `npx jest src/test/unit/infra` → verts.
- [ ] **Step 5 : commit.** `feat(planning): restaurer une suppression du planning`

### Task 6 : front (suppression, journal, notification, préférences)

**Files:**
- Modify: `front/src/routes/_authenticated/e/$establishmentId/s/$serviceId/_settings/planning.tsx`. `archiveOrDeleteSlots` devient `archiveSlots` pour tous les créneaux, avec un seul toast « {N} créneau(x) supprimé(s) » + « Annuler ». La description de `ConfirmDeleteForm` passe à « Voulez-vous vraiment supprimer ce créneau ? Vous pourrez le restaurer depuis le journal. ».
- Modify: `front/src/components/custom/sheet/eventSheet.tsx` : passe par `archiveSlots`. Retirer `deleteSlot` de `useSlot.ts`, `SlotApi.delete` et `useSlotDelete.test.tsx` s'ils n'ont plus d'appelant.
- Create: `front/src/api/planningRestore.api.ts` : `restore(serviceId: string, activityLogId: string): Promise<void>`. L'URL se construit avec le `serviceId` de la ligne, pas avec le tenant courant, puisque le journal d'administration couvre tout l'établissement.
- Modify: `front/src/components/custom/journalActivite.tsx`. Bouton « Restaurer » sur les lignes `action === 'planning.deleted' && !restoredAt`, visible si `useCan('planning:write')`. Le journal d'administration est réservé à l'ADMIN, qui a tout. Après succès : invalidation du journal, du planning et des créneaux, puis toast « Suppression restaurée ». Un 409 affiche le message du back.
- Modify: `front/src/types/task.ts` (`PLANNING_CHANGED`, `PlanningChangedPayload`), `front/src/components/custom/inbox/notificationTypes.tsx`. Entrée avec l'icône `CalendarCog`, `kind: 'Planning modifié'`. Texte : « {auteur} : {libellé de l'action} {detail} ». CTA :
  - « Restaurer » si `action === 'planning.deleted'` (appelle `restore`, puis marque lue) ;
  - sinon « Voir le planning », avec la nouvelle cible `{ kind: 'planning' }` vers `_settings/planning`.
- Modify: `front/src/types/notificationPrefs.ts`, `front/src/components/settings/notificationPrefs.tsx` : ligne `planning`, libellé « Modifications du planning », sous-texte « Pour les administrateurs ».
- Test: `front/src/components/custom/journalActivite.test.tsx`, `front/src/components/custom/inbox/*.test.tsx` (selon la convention voisine), `useSlotArchive.test.tsx`.

**Interfaces:**
- Consumes : la route de restauration (tâche 5), `restoredAt` dans la réponse du journal (tâche 3), la charge utile `PLANNING_CHANGED` (tâche 4).

- [ ] **Step 1 : écrire les tests qui échouent.**
  - Le journal affiche « Restaurer » sur une ligne `planning.deleted` sans `restoredAt`, pas sur une ligne restaurée ni sur une `planning.updated`. Cliquer appelle `POST …/s/{serviceId}/planning/restore/{id}`.
  - La notification `PLANNING_CHANGED` de suppression montre « Restaurer » ; celle de modification montre « Voir le planning ».
  - Supprimer un créneau vide depuis le planning appelle `PATCH archivedAt`, jamais `DELETE`.
- [ ] **Step 2 : lancer les tests, ils doivent échouer.** `npx vitest run <fichiers>` → FAIL.
- [ ] **Step 3 : implémenter.**
- [ ] **Step 4 : relancer, tout doit passer.** `npx vitest run`, `npx tsc -p tsconfig.app.json --noEmit`, `npx biome check src` → verts.
- [ ] **Step 5 : vérifier dans le navigateur.** Sur `etepea.localhost:4270` :
  1. supprimer un créneau vide ;
  2. le voir dans le journal du service avec « Restaurer » ;
  3. restaurer ;
  4. le créneau réapparaît.

  Enregistrer avant de naviguer (mémoire `beforeunload-gele-chrome-mcp`).
- [ ] **Step 6 : commit.** `feat(planning): restaurer depuis le journal et la notification`

### Task 7 : documentation

**Files:**
- Modify: `docs/multi-tenant/habilitations.md` : `slot-template` relève de `pathway-templates:write`, et ajouter la route de restauration.
- Modify: `docs/superpowers/specs/2026-11-26-roles-configurables-design.md` : sous « Traçabilité du planning », remplacer la phrase sur l'archivage par l'état réel et les décisions de ce plan, en cinq lignes au plus.

- [ ] **Step 1 : mettre les deux documents à jour.**
- [ ] **Step 2 : commit.** `docs(planning): traçabilité et restauration du planning`

## Décisions prises au plan (à contester avant exécution)

- **Quatre actions génériques** plutôt que `planning.slotCreated`, etc. Le journal filtre déjà par type d'entité, et cela fait quatre libellés au lieu de treize.
- **Journal pour tous, notification pour les non-ADMIN.** La spec ne parle que des non-administrateurs. Journaliser aussi l'ADMIN ne coûte rien et complète la traçabilité.
- **Un créneau vide supprimé est archivé**, plus supprimé en dur. Les lignes s'accumulent ; une purge des créneaux vides archivés depuis plus de N mois s'ajoutera si le volume le demande.
- **`regenerate` reste sous `planning:write`** et laisse une ligne de journal. Les créneaux vides qu'il retire ne sont pas restaurables : c'est une régénération, pas une suppression faite par quelqu'un.
- **Une rafale de suppressions donne une notification par suppression**, pour garder un « Restaurer » par élément. Si c'est trop bruyant, il faudra une route de suppression groupée qui écrit une seule ligne.
