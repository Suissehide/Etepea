export type Lang = "fr" | "en";

export const CONTACT_EMAIL = "contact@etepea.fr";

const img = (seed: string, w = 1600, h = 1000) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const IMAGES = {
  hero: img("etepea-care-team", 2400, 1400),
  pillA: img("etepea-calendar", 300, 160),
  pillB: img("etepea-group", 300, 160),
  planning: "/screens/planning.jpg",
  agenda: "/screens/agenda.jpg",
  suivi: "/screens/suivi.jpg",
  diagnostic: "/screens/patients.jpg",
  cta: img("etepea-light", 2400, 1200),
};

const fr = {
  meta: {
    title: "Etepea | Le logiciel des programmes d'éducation thérapeutique",
    description:
      "Etepea planifie, coordonne et suit vos programmes d'éducation thérapeutique du patient, de l'inclusion à la sortie.",
  },
  nav: {
    links: [
      ["Plateforme", "#plateforme"],
      ["Parcours", "#parcours"],
      ["Équipes", "#equipes"],
    ],
    cta: "Demander une démo",
  },
  hero: {
    title:
      "Le logiciel qui fait tourner votre programme d'éducation thérapeutique.",
    lead: "Parcours, séances, patients et diagnostics éducatifs réunis dans un seul outil, pensé avec les équipes de réadaptation.",
    primary: "Demander une démo",
    secondary: "Découvrir la plateforme",
  },
  manifesto:
    "Un programme d'ETP, ce sont des dizaines de séances collectives et individuelles, des intervenants aux agendas croisés, des patients qui avancent chacun à leur rythme. Etepea remplace les tableurs et les classeurs par une trame claire, déroulée sur l'année, que toute l'équipe partage.",
  bento: {
    title: "Tout le programme, sur un seul écran.",
    cards: {
      planning: {
        title: "Planning annuel",
        text: "Construisez la trame d'un parcours une fois, puis déroulez-la sur l'année. Duplication et déplacement en masse, semaines fermées, cycles de répétition.",
      },
      agenda: {
        title: "Agenda du jour",
        text: "Patients attendus, présences, accompagnants et transmissions.",
      },
      suivi: {
        title: "Suivi mensuel",
        text: "La participation de chaque patient, lue d'un coup d'œil.",
      },
      diagnostic: {
        title: "Dossiers patients et diagnostic éducatif",
        text: "Tous vos patients, leurs parcours et leur bilan éducatif partagé, avec des modèles qui n’activent que les champs utiles à votre service.",
      },
    },
  },
  inline: {
    before: "Construisez",
    middle: "la trame une fois, planifiez",
    after: "toute l'année.",
  },
  journey: {
    title: "Le parcours patient, de bout en bout.",
    steps: [
      {
        name: "Inclusion",
        text: "Identité, contexte social, décision ETP, orientation et objectif : le dossier se constitue dès l'entrée.",
        seed: "etepea-welcome",
      },
      {
        name: "Diagnostic",
        text: "Le bilan éducatif partagé, guidé par un modèle adapté à votre programme.",
        seed: "etepea-talk",
      },
      {
        name: "Séances",
        text: "Le patient rejoint les séances collectives et individuelles du parcours, sans double saisie.",
        seed: "etepea-workshop",
      },
      {
        name: "Suivi",
        text: "Présences, absences et motifs remontent automatiquement dans la vue de suivi.",
        seed: "etepea-review",
      },
      {
        name: "Sortie",
        text: "Date, motif, point final du parcours, et un programme PDF remis au patient.",
        seed: "etepea-outdoor",
      },
    ],
  },
  stack: {
    title: "Conçu pour un service de soins, pas pour un tableur.",
    cards: [
      {
        title: "Données cloisonnées",
        text: "Chaque établissement et chaque service ne voit que ses propres patients. Deux structures ne se croisent jamais.",
      },
      {
        title: "Des rôles précis",
        text: "Coordination, intervenants, secrétariat, lecture seule : chacun accède à ce dont il a besoin, et pas au-delà.",
      },
      {
        title: "Conflits signalés",
        text: "Une salle déjà occupée, un rendez-vous qui chevauche un autre : Etepea vous prévient avant que le patient ne le découvre.",
      },
      {
        title: "Journal d'activité",
        text: "Qui a créé, modifié ou supprimé quoi, et quand. La traçabilité sans effort.",
      },
    ],
  },
  roles: {
    title: "Chaque métier y trouve son écran.",
    prev: "Rôle précédent",
    next: "Rôle suivant",
    items: [
      {
        role: "Coordination",
        text: "Conçoit les modèles de parcours, construit le planning de l'année et pilote l'équipe.",
        seed: "etepea-coordination",
      },
      {
        role: "Intervenants",
        text: "Retrouvent leurs séances, l'agenda du jour, les dossiers et leurs pense-bêtes.",
        seed: "etepea-nurse",
      },
      {
        role: "Secrétariat",
        text: "Gère l'identité et les rendez-vous des patients, sans accès au contenu clinique.",
        seed: "etepea-reception",
      },
    ],
  },
  cta: {
    title: "Donnez à votre programme l'outil qu'il mérite.",
    text: "Une démonstration de trente minutes, sur vos propres parcours.",
    button: "Demander une démo",
  },
  footer: {
    tagline: "Le logiciel des programmes d'éducation thérapeutique du patient.",
    contact: "Contact",
    rights: "Tous droits réservés.",
  },
};

const en: typeof fr = {
  meta: {
    title: "Etepea | Software for therapeutic patient education programs",
    description:
      "Etepea plans, coordinates and tracks your therapeutic patient education programs, from enrolment to discharge.",
  },
  nav: {
    links: [
      ["Platform", "#plateforme"],
      ["Journey", "#parcours"],
      ["Teams", "#equipes"],
    ],
    cta: "Book a demo",
  },
  hero: {
    title: "The software that runs your therapeutic patient education program.",
    lead: "Pathways, sessions, patients and educational assessments in one place, built alongside rehabilitation teams.",
    primary: "Book a demo",
    secondary: "Explore the platform",
  },
  manifesto:
    "A patient education program means dozens of group and one-to-one sessions, practitioners with overlapping schedules, and patients who each move at their own pace. Etepea replaces spreadsheets and binders with one clear framework, rolled out across the year and shared by the whole team.",
  bento: {
    title: "The whole program, on a single screen.",
    cards: {
      planning: {
        title: "Yearly planning",
        text: "Design a pathway once, then roll it out over the year. Bulk duplicate and move sessions, block closed weeks, set repeat cycles.",
      },
      agenda: {
        title: "Daily agenda",
        text: "Expected patients, attendance, companions and handover notes.",
      },
      suivi: {
        title: "Monthly follow-up",
        text: "Every patient's attendance, readable at a glance.",
      },
      diagnostic: {
        title: "Patient records and educational assessment",
        text: "Every patient, their pathways and their shared educational assessment, with templates that only enable the fields your service needs.",
      },
    },
  },
  inline: {
    before: "Design",
    middle: "the pathway once, plan",
    after: "the whole year.",
  },
  journey: {
    title: "The patient journey, end to end.",
    steps: [
      {
        name: "Enrolment",
        text: "Identity, social context, program decision, referral and goal: the record builds up from day one.",
        seed: "etepea-welcome",
      },
      {
        name: "Assessment",
        text: "The shared educational assessment, guided by a template tailored to your program.",
        seed: "etepea-talk",
      },
      {
        name: "Sessions",
        text: "Patients join the pathway's group and individual sessions, with no double entry.",
        seed: "etepea-workshop",
      },
      {
        name: "Follow-up",
        text: "Attendance, absences and reasons flow straight into the follow-up view.",
        seed: "etepea-review",
      },
      {
        name: "Discharge",
        text: "Date, reason, pathway outcome, and a PDF program handed to the patient.",
        seed: "etepea-outdoor",
      },
    ],
  },
  stack: {
    title: "Built for a care department, not a spreadsheet.",
    cards: [
      {
        title: "Isolated data",
        text: "Each facility and each department only sees its own patients. Two organisations never overlap.",
      },
      {
        title: "Precise roles",
        text: "Coordinators, practitioners, front desk, read-only: everyone gets exactly what they need, nothing more.",
      },
      {
        title: "Conflicts flagged",
        text: "A room already booked, an overlapping appointment: Etepea warns you before the patient finds out.",
      },
      {
        title: "Activity log",
        text: "Who created, changed or deleted what, and when. Traceability without the effort.",
      },
    ],
  },
  roles: {
    title: "Every role gets its own screen.",
    prev: "Previous role",
    next: "Next role",
    items: [
      {
        role: "Coordinators",
        text: "Design pathway templates, build the yearly schedule and lead the team.",
        seed: "etepea-coordination",
      },
      {
        role: "Practitioners",
        text: "Find their sessions, today's agenda, patient records and their to-dos.",
        seed: "etepea-nurse",
      },
      {
        role: "Front desk",
        text: "Manage patient identity and appointments, without access to clinical content.",
        seed: "etepea-reception",
      },
    ],
  },
  cta: {
    title: "Give your program the tool it deserves.",
    text: "A thirty-minute demo, built on your own pathways.",
    button: "Book a demo",
  },
  footer: {
    tagline: "Software for therapeutic patient education programs.",
    contact: "Contact",
    rights: "All rights reserved.",
  },
};

export const CONTENT = { fr, en };
export const stepImage = (seed: string) => img(seed, 1200, 1400);
