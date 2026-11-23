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

Pour un parcours « premier créneau seulement », choisir le créneau qui évite un trou, pas le premier venu.

Hors périmètre :

- Les parcours pris en entier. Leurs trous viennent du modèle de planning.
- Les rendez-vous déjà posés : rien n'est déplacé.
- Un réglage par service.

À éviter : un patient qui se retrouve sans rendez-vous parce qu'aucun créneau idéal n'existe.

## Règle

Un créneau candidat reçoit un rang d'après les rendez-vous du patient le même jour :

1. Collé : même demi-journée (coupure à 13h, comme `isSlotAvailable`) et au plus 1h entre la fin de l'un et le début de l'autre.
2. Jour libre : le patient n'a aucun rendez-vous ce jour-là.
3. Trou : tout le reste (plus d'1h d'écart ou l'autre demi-journée).

On retient le meilleur rang, puis le plus tôt. S'il n'existe que des créneaux de rang 3, on prend le plus tôt : comportement actuel, validé par Léo.

Les candidats sont les créneaux libres de tous les cycles éligibles, pas seulement ceux du premier cycle.

Dans un créneau individuel, la tranche retenue est la tranche libre la plus proche d'un rendez-vous du patient ce jour-là, sinon la première comme aujourd'hui.

## Approches

- **A. Classer les candidats par rang** (retenue). Une fonction pure donne le rang, le tri s'applique aux trois endroits qui choisissent un créneau. Pas de migration, pas de changement d'API.
- **B. Refuser les créneaux à trou.** Écartée : crée des échecs d'inscription à traiter à la main.
- **C. Optimiser toute la semaine d'un coup** (réorganiser plusieurs rendez-vous). Écartée : déplace des rendez-vous déjà annoncés au patient, bien plus de code.

## Choix de Claude, à corriger au besoin

- Seuil d'1h et coupure à 13h en constantes dans le code.
- Fenêtre de recherche : jusqu'à la fin du parcours principal quand elle borne déjà l'optionnel (`notAfter`), sinon 14 jours après le premier créneau libre. Sans cette limite, un créneau « collé » dans trois mois gagnerait sur un créneau libre demain.
- La règle vaut pour tout parcours « premier créneau seulement », optionnel ou non : c'est le seul cas où un choix existe.
- Un jour libre (rang 2) passe avant un trou (rang 3).

## Laissé à l'implémentation

- Une seule fonction de choix partagée par `selectValidPathway`, `enrollOnPathway` et `previewEnrollment`, pour que l'aperçu annonce la date réellement retenue.
- Tests : un test unitaire de la fonction de rang (collé, jour libre, trou, repli sur le plus tôt, fenêtre) et un cas e2e reprenant l'exemple du mardi.
