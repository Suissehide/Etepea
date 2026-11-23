# Design : placer les rendez-vous sans trou dans la journée du patient

## Pourquoi

À l'ajout d'un parcours, un rendez-vous peut tomber loin des autres rendez-vous du patient le même jour. Exemple relevé : séance de 9h45 à 11h00 puis consultation infirmière à 13h30, le patient doit revenir l'après-midi.

## Ce qui existe

Dans `back/src/main/domain/patient.domain.ts` :

- Parcours pris en entier (`firstAppointmentOnly` faux) : tous les créneaux du cycle, aucun choix d'horaire.
- Parcours « premier créneau seulement » : `selectValidPathway` retient le premier cycle qui a un créneau libre, `enrollOnPathway` prend le premier créneau libre dans l'ordre chronologique.
- Créneau individuel : `getNextAvailableAppointment` prend la première tranche libre depuis le début du créneau.
- `previewEnrollment` reproduit ce choix pour l'aperçu.

## But

Pour un parcours optionnel, choisir un créneau qui évite un trou. S'il n'en existe pas, ne rien poser et le signaler, sauf si l'utilisateur a demandé de prendre le plus tôt.

Hors périmètre :

- Les parcours principaux. Leurs trous viennent du modèle de planning.
- Les rendez-vous déjà posés : rien n'est déplacé.
- Un réglage par service.

## Règle

Un créneau candidat reçoit un rang d'après les rendez-vous du patient le même jour :

1. Collé : même demi-journée (coupure à 13h, comme `isSlotAvailable`) et au plus 1h entre la fin de l'un et le début de l'autre.
2. Jour libre : le patient n'a aucun rendez-vous ce jour-là.
3. Trou : tout le reste (plus d'1h d'écart ou l'autre demi-journée).

On retient le meilleur rang, puis le plus tôt. Les candidats sont les créneaux libres de tous les cycles éligibles, pas seulement ceux du premier cycle.

Dans un créneau individuel, la tranche retenue est la tranche libre la plus proche d'un rendez-vous du patient ce jour-là, sinon la première comme aujourd'hui.

## Option « prendre le plus tôt » (décision de Léo)

Un second interrupteur dans le groupe « Parcours optionnels » de `pathwaySelector.tsx`, sous « Rendez-vous compris dans la durée du parcours principal », décoché par défaut.

- Décoché (défaut) : s'il n'existe que des créneaux de rang 3, l'inscription à ce parcours échoue. L'échec suit le circuit existant (`failedEnrollments`, `EnrollmentIssue`) avec le motif « Échec d'inscription à traiter à la main : aucun créneau sans trou pour "<parcours>" ». L'aperçu affiche le même motif avant validation.
- Coché : on prend le créneau le plus tôt, comme aujourd'hui, sans regarder les trous.

Le réglage voyage comme `optionalsWithinPrincipal` : un booléen optionnel dans le corps des trois routes (aperçu, création avec parcours, ajout de parcours). Absent, il vaut décoché.

## Approches

- **A. Classer les candidats par rang, échec si seul un trou reste, interrupteur pour revenir au plus tôt** (retenue). Une fonction pure donne le rang. Pas de migration.
- **B. Toujours se replier sur le plus tôt.** Proposée d'abord, écartée par Léo : un trou posé en silence n'est vu par personne.
- **C. Optimiser toute la semaine d'un coup** (réorganiser plusieurs rendez-vous). Écartée : déplace des rendez-vous déjà annoncés au patient, bien plus de code.

## Choix de Claude, à corriger au besoin

- Libellé de l'interrupteur : « Prendre le créneau le plus tôt, même avec un trou dans la journée ».
- Seuil d'1h et coupure à 13h en constantes dans le code.
- Fenêtre de recherche : jusqu'à la fin du parcours principal quand elle borne déjà l'optionnel (`notAfter`), sinon 14 jours après le premier créneau libre. Sans cette limite, un créneau « collé » dans trois mois gagnerait sur un créneau libre demain.
- La règle ne vaut que pour les parcours optionnels. Un parcours principal « premier créneau seulement » reste placé au plus tôt : un échec par défaut sur un principal bloquerait toute l'inscription.
- Optionnel pris en entier : le rang d'un cycle est le pire rang de ses créneaux, on retient le meilleur cycle. Si tous ont un trou, même échec.
- Un jour libre (rang 2) n'est pas un trou : il est accepté, après les créneaux collés.

## Laissé à l'implémentation

- Une seule fonction de choix partagée par `selectValidPathway`, `enrollOnPathway` et `previewEnrollment`, pour que l'aperçu annonce la date réellement retenue.
- Tests : un test unitaire de la fonction de rang (collé, jour libre, trou, repli sur le plus tôt, fenêtre) et un cas e2e reprenant l'exemple du mardi.
