import type { ServicePermission } from '../utils/permissions.ts'

export const PERMISSION_GROUPS = [
  'Quotidien',
  'Pilotage',
  'Administration',
  'Actions',
] as const

type PermissionGroup = (typeof PERMISSION_GROUPS)[number]

// Libellé de chaque clé du catalogue de service, dans l'écran « Rôles ».
export const PERMISSION_LABELS: Record<
  ServicePermission,
  { label: string; group: PermissionGroup }
> = {
  'dashboard:read': { label: 'Voir le Dashboard', group: 'Quotidien' },
  'agenda:read': { label: "Voir l'Agenda", group: 'Quotidien' },
  'patients:read': { label: 'Voir la liste des patients', group: 'Quotidien' },
  'suivi:read': { label: 'Voir le Suivi', group: 'Quotidien' },
  'tasks:read': {
    label: 'Voir les tâches et recevoir les notifications de séance',
    group: 'Quotidien',
  },
  'notifications:own': {
    label: 'Gérer ses propres notifications',
    group: 'Quotidien',
  },
  'planning:read': { label: 'Lire le planning', group: 'Quotidien' },
  'referentials:read': {
    label: 'Lire les listes de choix (thématiques, salles, soignants)',
    group: 'Quotidien',
  },
  'patient:read': { label: 'Ouvrir la fiche patient', group: 'Quotidien' },
  'activity:read': { label: "Voir l'Activité du service", group: 'Pilotage' },
  'stats:read': { label: "Voir les jeux d'indicateurs", group: 'Pilotage' },
  'planning:write': {
    label: 'Modifier les semaines types et créneaux',
    group: 'Administration',
  },
  'pathway-templates:write': {
    label: 'Modifier les modèles de parcours',
    group: 'Administration',
  },
  'thematics:write': {
    label: 'Gérer les thématiques',
    group: 'Administration',
  },
  'soignants:write': { label: 'Gérer les soignants', group: 'Administration' },
  'locations:write': { label: 'Gérer les salles', group: 'Administration' },
  'diagnostic-templates:write': {
    label: 'Gérer les diagnostics éducatifs',
    group: 'Administration',
  },
  'pdf-design:write': {
    label: 'Modifier le document patient',
    group: 'Administration',
  },
  'patient-form:write': {
    label: 'Modifier la fiche patient',
    group: 'Administration',
  },
  'stats:write': {
    label: 'Saisir et régler les indicateurs',
    group: 'Administration',
  },
  'service-members:manage': {
    label: "Gérer l'équipe du service",
    group: 'Administration',
  },
  'members:read': {
    label: 'Voir la liste des membres du service',
    group: 'Administration',
  },
  'service-journal:read': {
    label: "Lire le journal d'activité",
    group: 'Administration',
  },
  'consultations:read': {
    label: 'Lire le journal des consultations de dossiers',
    group: 'Administration',
  },
  'patient:create': { label: 'Ajouter un patient', group: 'Actions' },
  'patient:write': { label: 'Modifier un patient', group: 'Actions' },
  'patient:delete': { label: 'Supprimer un patient', group: 'Actions' },
  'appointment:create': { label: 'Créer un rendez-vous', group: 'Actions' },
  'appointment:write': {
    label: 'Modifier un rendez-vous',
    group: 'Actions',
  },
  'dashboard:write': {
    label: 'Ajouter depuis le Dashboard',
    group: 'Actions',
  },
  'clinical:read': { label: 'Lire les données cliniques', group: 'Actions' },
  'clinical:write': {
    label: 'Modifier les données cliniques',
    group: 'Actions',
  },
  'pdf:export': { label: 'Exporter en PDF', group: 'Actions' },
  'tasks:write': { label: 'Traiter les tâches', group: 'Actions' },
}
