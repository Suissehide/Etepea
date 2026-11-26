# Rôles configurables par service

Statut : proposition, à valider par Léo avant le plan d'implémentation.

## Objectif

Permettre à l'administrateur d'établissement de créer, renommer et régler les rôles **de chaque
service**, écran par écran et action par action. Ce qu'un rôle n'autorise pas n'est pas visible.

## Point de départ

- Le code ne teste jamais un rôle, seulement une permission : `config.permission` sur chaque route
  back (refus de démarrer sinon), `useCan()` et `NAVIGATION` côté front. Ce principe ne change pas.
- Ce qui change : la matrice rôle → permissions sort du code (`utils/permissions.ts`, dupliqué
  front) pour devenir une donnée par service.

## Modèle

```prisma
model ServiceRoleDef {
  id              String   @id @default(cuid())
  establishmentId String
  serviceId       String
  name            String
  permissions     String[]               // clés du catalogue, validées à l'écriture
  hiddenSoignants ServiceRoleHiddenSoignant[]
  archivedAt      DateTime?
  @@unique([serviceId, name])
}

model ServiceRoleHiddenSoignant {
  roleId     String
  soignantId String
  @@id([roleId, soignantId])
}
```

- **Le rôle appartient au compte** : `ServiceMembership.role` (enum) devient
  `ServiceMembership.roleId`. C'est la seule source des droits.
- **Le soignant porte un rôle par défaut** : `Soignant.defaultRoleId` (nullable). Quand on invite
  un membre ou qu'on le rattache à un soignant, le rôle du formulaire se remplit avec celui du
  soignant (« Équipe SMCP » pour IDE, Diététicienne, Pharmacienne et Aide-soignante SMCP, par
  exemple). Il reste modifiable avant d'enregistrer.
- Changer le rôle par défaut d'un soignant ne touche pas les comptes déjà rattachés : c'est un
  pré-remplissage, pas un lien. **L'écart est signalé** :
  - à l'enregistrement du soignant, un message indique combien de comptes gardent un autre rôle ;
  - dans l'écran Membres, un compte dont le rôle diffère du rôle par défaut de son soignant porte
    un badge « Rôle différent de Kiné 1 », avec une action « Appliquer le rôle par défaut ».
  Calculé à la lecture (comparaison `roleId` / `soignant.defaultRoleId`), rien de stocké.
- Migration : pour chaque service, création de quatre rôles **Coordinateur**, **Intervenant**,
  **Secrétariat**, **Lecture seule**, avec exactement les permissions actuelles (plus les nouvelles
  permissions issues des découpages ci-dessous, accordées là où l'ancienne l'était). Aucun compte
  ne perd ni ne gagne un droit le jour de la migration.
- Un nouveau service reçoit ces quatre rôles par défaut.
- Rôles archivés, pas supprimés (règle des référentiels). Un rôle encore attribué ne s'archive pas.
- `ADMIN` d'établissement et octroi super-admin : **toutes** les permissions de service, en dur
  (pas de ligne `ServiceRoleDef`). C'est le cas n°1, et ça empêche de s'enfermer dehors.

## Catalogue des permissions

Reste dans le code (le back doit connaître chaque clé). Les permissions actuelles sont conservées ;
celles qui couvrent trop large sont découpées :

| Avant | Après |
|---|---|
| `planning:write` | `pathway-templates:write` (parcours théoriques) + `planning:write` (le reste : créneaux, semaines types, cycle, semaines interdites, parcours patients) |
| `referentials:write` | `thematics:write`, `soignants:write`, `locations:write`, `diagnostic-templates:write`, `pdf-design:write`, `patient-form:write` |
| `patient:write` | `patient:create` (bouton « Ajouter un patient », Dashboard compris) + `patient:write` |
| `appointment:write` | `appointment:create` (« Nouveau RDV ») + `appointment:write` (présences, convocations, inscriptions) |
| *(aucune)* | `dashboard:read`, `agenda:read`, `patients:read`, `suivi:read` pour masquer un onglet entier |

Le rattachement d'un membre à un soignant (aujourd'hui `referentials:write`) passe sous
`service-members:manage`.

Chaque clé du catalogue porte un libellé et un groupe (Quotidien, Pilotage, Administration,
Actions) pour l'écran de réglage. Le front ne recopie plus la matrice : il reçoit la liste des
permissions effectives dans le contexte de `/me` et `useCan` la lit.

## Résolution

`request.tenant` porte `permissions: Set<Permission>` (celles du rôle, ou toutes pour un `ADMIN`).
`hasPermission` devient une lecture de cet ensemble pour les permissions de service ; les
permissions d'établissement gardent leur matrice statique (`ADMIN`/`MEMBER` ne changent pas).
Les hooks de filtrage clinique lisent le même ensemble.

## Soignants masqués

`hiddenSoignants` du rôle s'ajoute au filtre `Soignant.hidden` existant dans le Dashboard
(liste et filtre des soignants). La liste des soignants masqués arrive par `/me` et le filtre se
fait à l'affichage : c'est du confort de lecture, pas une donnée à protéger (les mêmes noms restent
visibles dans l'Agenda).
Portée : Dashboard uniquement, comme le demandent les cas n°2 et n°3. L'Agenda n'est pas concerné.

## Écran « Rôles »

Administration du service, réservé à l'`ADMIN` d'établissement (`roles:manage`, permission
d'établissement). Liste des rôles ; pour chacun : nom modifiable, cases à cocher par groupe,
soignants masqués, nombre de membres. Actions : créer, dupliquer, renommer, supprimer (archive).
Toute modification écrit `role.created|updated|archived` dans le journal d'activité.

L'écran Soignants gagne une colonne « Rôle par défaut ». L'écran Membres propose les rôles du
service au lieu des quatre valeurs fixes, pré-remplis depuis le soignant choisi.

## Traçabilité du planning (cas n°2)

Quand un membre **non administrateur** modifie le planning (`planning:write`) :

1. une ligne au journal d'activité (`planning.slotCreated`, `planning.slotUpdated`,
   `planning.slotArchived`, etc.) avec le détail lisible ;
2. une notification `PLANNING_CHANGED` aux `ADMIN` de l'établissement ;
3. pour une suppression, un bouton « Restaurer » depuis la notification et le journal. Possible
   parce que créneaux et modèles archivent au lieu de supprimer ; à vérifier entité par entité
   au plan, et à rendre archivable ce qui ne l'est pas encore.

Annuler une modification autre qu'une suppression : hors périmètre.

## Les cas de Léo, une fois configurés

Réglages faits dans l'écran, pas dans le code. Trois rôles, chacun mis par défaut sur les
soignants listés :

- **Cadre de santé** : `dashboard:read`, `agenda:read`, `patients:read`, `planning:write`,
  `diagnostic-templates:write`, `patient-form:write`, `stats:write` + lectures ; ni
  `patient:create` ni `appointment:create` ; soignants masqués : Kiné 1, 2, 3, APA.
- **IDE / Diététicienne / Pharmacienne / Aide-soignante SMCP** : Dashboard, Agenda, Patients,
  `patient:create`, `appointment:create` ; soignants masqués : Kiné 1, 2, 3.
- **Soignant SSR, IDE SSR, Kiné 1-3, APA** : base Intervenant, sans `patient:create`, avec
  `appointment:create`.

## Découpage en étapes

1. Rôles en base + migration à droits constants + `/me` qui expose les permissions + `useCan`
   branché dessus. Aucun changement visible.
2. Découpage du catalogue (tableau ci-dessus), routes et onglets re-gardés.
3. Écran « Rôles » et rôles proposés dans Membres.
4. Soignants masqués par rôle.
5. Traçabilité, notification et restauration du planning.

## Hors périmètre

- Rôles d'établissement configurables (`ADMIN`/`MEMBER` restent fixes).
- Copier un rôle d'un service à un autre (ajoutable plus tard si la saisie est répétitive).
- Annulation générique des modifications.
