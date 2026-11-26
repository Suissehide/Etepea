import type { EstablishmentRole } from '../types/auth.ts'

// Les deux rôles d'un membre sont distincts et se règlent séparément : celui
// de l'établissement (administrateur ou simple membre), et celui, propre à
// un service donné, porté par `serviceMemberships`. Partagé par les
// colonnes du tableau et par les formulaires d'ajout/modification.
export const ESTABLISHMENT_ROLE_LABEL: Record<EstablishmentRole, string> = {
  ADMIN: "Chef d'établissement",
  MEMBER: 'Membre',
}

// Ce que chaque rôle permet, affiché sous le champ de rôle des formulaires
// de membre.
// Référence : docs/multi-tenant/habilitations.md (et utils/permissions.ts).
export const ESTABLISHMENT_ROLE_DESCRIPTION: Record<EstablishmentRole, string> =
  {
    ADMIN:
      "Gère l'établissement : services, membres, journaux d'activité et d'accès. Tous les droits dans chaque service, même sans y être affecté.",
    MEMBER:
      "Aucun droit propre : n'accède qu'aux services auxquels il est affecté, selon le rôle choisi pour chacun.",
  }

// Rôle de service affiché, non modifiable, quand le rôle établissement est
// Chef d'établissement (tous les droits dans chaque service, sans rôle).
export const ADMIN_SERVICE_ROLE_LABEL = "Tous les droits (Chef d'établissement)"
export const ADMIN_SERVICE_ROLE_DESCRIPTION =
  "Le chef d'établissement a tous les droits dans chaque service : pas de rôle à choisir."
