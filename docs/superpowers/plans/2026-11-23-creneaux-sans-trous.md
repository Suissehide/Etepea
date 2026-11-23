# Créneaux sans trou : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un parcours optionnel se place sur un créneau qui ne crée pas de trou dans la journée du patient, sinon il part en échec d'inscription, sauf si l'utilisateur coche « prendre le plus tôt ».

**Architecture:** Une fonction pure donne le rang d'un créneau (collé, jour libre, trou). `findPathwayForTag` s'en sert pour réduire le parcours retenu au seul créneau choisi, ce qui laisse `enrollOnPathway` et `previewEnrollment` inchangés. Un booléen `optionalsAllowGaps` voyage comme `optionalsWithinPrincipal`.

**Tech Stack:** Fastify, Zod, Prisma, dayjs, Jest (back) ; React, Vitest (front) ; Biome.

**Spec:** `docs/superpowers/specs/2026-11-23-creneaux-sans-trous-design.md`

## Global Constraints

- Seuil collé : 60 minutes. Coupure de demi-journée : 13h (heure lue par `dayjs(x).hour()`, comme `isSlotAvailable`).
- Fenêtre sans `notAfter` : 14 jours après le premier candidat.
- Motif d'échec, mot pour mot : `Échec d'inscription à traiter à la main : aucun créneau sans trou pour "<tag>"`.
- Libellé : `Prendre le créneau le plus tôt, même avec un trou dans la journée`.
- La règle ne s'applique qu'aux parcours dont le modèle a `optional: true`, et seulement si `optionalsAllowGaps` n'est pas vrai.
- Biome, pas de `biome-ignore`, commentaires d'une ligne, pas de migration.

## Review Focus

- Patient sans aucun rendez-vous : tout est « jour libre », on prend le plus tôt, aucun échec.
- Optionnel demandé dans la même requête que son principal : il doit voir les rendez-vous du principal, à l'inscription comme à l'aperçu.
- Rendez-vous exactement à 60 minutes d'écart : collé.
- Créneau du matin finissant à 12h45 et rendez-vous à 13h15 : 30 minutes d'écart mais deux demi-journées, donc trou.
- Parcours principal « premier créneau seulement » : placement inchangé, interrupteur sans effet.

---

### Task 1 : rang d'un créneau

**Files:**
- Create: `back/src/main/utils/slot-gap.ts`
- Test: `back/src/test/unit/utils/slot-gap.test.ts`

**Interfaces:**
- Produces:
  - `type Interval = { startDate: Date; endDate: Date }`
  - `gapRank(candidate: Interval, appointments: Interval[]): 1 | 2 | 3`
  - `byGapThenDate<T extends Interval & { rank: number }>(a: T, b: T): number` (rang croissant, puis début croissant)

- [ ] **Step 1 : tests qui échouent**, un cas par ligne de Review Focus qui relève du rang, plus l'exemple de la photo : rendez-vous 09:45–11:00, candidat 13:30–14:15 → 3 ; candidat 11:00–11:45 → 1 ; candidat 12:00–12:30 (60 min) → 1 ; rendez-vous 12:00–12:45, candidat 13:15–13:45 → 3 ; aucun rendez-vous ce jour → 2 ; rendez-vous la veille seulement → 2.
- [ ] **Step 2 :** `npx jest -c src/test/jest.config.ts src/test/unit/utils/slot-gap.test.ts` → échec (module absent).
- [ ] **Step 3 :** implémenter. Rang 1 dès qu'un rendez-vous du même jour est dans la même demi-journée à 60 min au plus ; rang 2 si aucun rendez-vous le même jour ; sinon 3.
- [ ] **Step 4 :** même commande → vert.
- [ ] **Step 5 :** commit `feat(inscription): rang d'un créneau selon les trous de la journée`.

### Task 2 : choix du créneau dans le domaine et routes

**Files:**
- Modify: `back/src/main/domain/patient.domain.ts` (`findPathwayForTag`, `enrollPatientInTag`, `previewEnrollments`, `previewEnrollment`, `processEnrollments`, les deux `enroll*InPathways`)
- Modify: `back/src/main/types/domain/patient.domain.interface.ts`, `back/src/main/interfaces/http/fastify/schemas/patient.schema.ts`, `back/src/main/interfaces/http/fastify/routes/patient.ts`
- Test: `back/src/test/e2e/creneaux-sans-trous.test.ts`

**Interfaces:**
- Consumes: `gapRank`, `byGapThenDate` (Task 1).
- Produces: champ `optionalsAllowGaps?: boolean` dans le corps de `POST /patient/enroll`, `POST /patient/:patientID/enroll`, `POST /patient/enroll/preview` ; dernier paramètre de `previewEnrollments(pathways, patientID?, optionalsWithinPrincipal?, optionalsAllowGaps?)`.

- [ ] **Step 1 : e2e qui échoue.** Fixtures sur le modèle de `parcours-prerequis.test.ts` : un parcours principal avec une séance de groupe mardi 09:45–11:00, un parcours optionnel « premier créneau seulement » avec deux créneaux individuels (durée 45 min) mardi 13:30–14:15 et mercredi 11:00–11:45 d'un autre cycle, patient déjà inscrit au principal avec une séance mercredi 09:45–11:00 aussi. Assertions :
  - inscription par défaut → rendez-vous optionnel mercredi 11:00 ;
  - sans le créneau du mercredi → `failedEnrollments[0].reason` égal au motif exact, aucun rendez-vous créé, un `EnrollmentIssue` en base ;
  - même cas avec `optionalsAllowGaps: true` → rendez-vous mardi 13:30 ;
  - aperçu du cas d'échec → `startDate: null` et `reason` égal au motif ;
  - principal et optionnel dans la même requête pour un patient neuf → l'optionnel est collé à la séance du principal, et l'aperçu donne la même date ;
  - parcours principal « premier créneau seulement » avec trou → inscrit au plus tôt.
- [ ] **Step 2 :** lancer ce fichier seul → échec.
- [ ] **Step 3 : implémenter.**
  - Nouveau paramètre `allowGaps: boolean` de `findPathwayForTag`, propagé depuis `processEnrollments` et `previewEnrollments` (défaut `false`).
  - Dans `findPathwayForTag`, après `eligiblePathways`, si le modèle est optionnel et `!allowGaps` : construire les candidats, garder ceux dans la fenêtre, trier avec `byGapThenDate`, échec au motif exact si le meilleur est de rang 3, sinon renvoyer le parcours réduit au choix. Sinon `selectValidPathway` comme aujourd'hui.
  - Candidat « premier créneau seulement » : chaque créneau libre de chaque cycle éligible. Candidat « pris en entier » : chaque cycle disponible, rang = pire rang de ses créneaux, date = premier créneau.
  - Créneau individuel : la fenêtre du candidat est la tranche libre de meilleur rang (tranches alignées sur la durée depuis le début du créneau, comme `getNextAvailableAppointment`). Le créneau renvoyé porte cette tranche comme `startDate`/`endDate`, de sorte que `enrollInSlot` et l'aperçu la reprennent sans autre changement.
  - `previewEnrollments` ajoute les créneaux simulés de chaque parcours aux rendez-vous vus par les suivants.
- [ ] **Step 4 :** fichier e2e vert, puis `parcours-prerequis.test.ts` et `src/test/unit/domain/patient.domain.test.ts` verts (adapter ceux qui supposaient le plus tôt pour un optionnel en leur passant `optionalsAllowGaps: true`).
- [ ] **Step 5 :** `npm run build` et `npm run lint` dans `back/`, puis commit `feat(inscription): un optionnel évite les trous dans la journée du patient`.

### Task 3 : interrupteur côté front

**Files:**
- Modify: `front/src/components/custom/pathwaySelector.tsx`, `front/src/components/custom/popup/addPatientForm.tsx`, `front/src/components/custom/popup/addPatientToPathwayForm.tsx`, `front/src/api/patient.api.ts`, `front/src/types/patient.ts`
- Test: `front/src/components/custom/popup/addPatientToPathwayForm.test.tsx`

**Interfaces:**
- Consumes: champ `optionalsAllowGaps` (Task 2).
- Produces: `pathwayState.allowGaps: boolean`.

- [ ] **Step 1 : test qui échoue**, calqué sur celui de « Rendez-vous compris dans la durée du parcours principal » : l'interrupteur au libellé exact est décoché ; l'aperçu et l'inscription envoient `optionalsAllowGaps: false` ; après un clic, `true`.
- [ ] **Step 2 :** `npx vitest run src/components/custom/popup/addPatientToPathwayForm.test.tsx` → échec.
- [ ] **Step 3 :** état `allowGaps` (`useState(false)`) à côté de `withinPrincipal`, second `Switch` sous le premier, clé de requête et appel de l'aperçu, les deux formulaires.
- [ ] **Step 4 :** test vert, `npx tsc -p tsconfig.app.json --noEmit`, Biome.
- [ ] **Step 5 :** commit `feat(inscription): interrupteur pour prendre le créneau le plus tôt`.

### Task 4 : vérification

- [ ] Suites back unitaires et front complètes vertes.
- [ ] Dans le navigateur (front 4270) : ouvrir l'ajout de parcours d'un patient, vérifier l'interrupteur, l'aperçu du motif d'échec et l'aperçu de la date une fois coché.
- [ ] `graphify update .`, merger `main` dans le worktree, puis fusion sur `main`.
