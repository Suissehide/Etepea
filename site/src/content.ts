export type Lang = "fr" | "en";
export type Page = "home" | "privacy" | "cookies";

export const CONTACT_EMAIL = "contact@etepea.fr";

export const SLUGS: Record<Exclude<Page, "home">, Record<Lang, string>> = {
  privacy: { fr: "confidentialite", en: "privacy" },
  cookies: { fr: "cookies", en: "cookies" },
};

export const pagePath = (lang: Lang, page: Page) =>
  page === "home" ? `/${lang}/` : `/${lang}/${SLUGS[page][lang]}`;

const SCREENS = {
  planning: "/screens/planning.jpg",
  agenda: "/screens/agenda.jpg",
  suivi: "/screens/suivi.jpg",
  patients: "/screens/patients.jpg",
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
      ["Parcours patient", "#parcours"],
      ["Sécurité", "#securite"],
      ["Équipes", "#equipes"],
    ],
    cta: "Demander une démo",
  },
  hero: {
    label: "Éducation thérapeutique du patient",
    title: "Le logiciel qui fait tourner votre programme d'ETP.",
    lead: "Parcours, séances, patients et diagnostics éducatifs réunis dans un seul outil, pensé avec les équipes de réadaptation.",
    primary: "Demander une démo",
    secondary: "Découvrir la plateforme",
    screen: SCREENS.planning,
    trust: [
      "Données cloisonnées par service",
      "Comptes sur invitation",
      "Conçu avec des équipes de soins",
    ],
  },
  problem: {
    label: "Le constat",
    title: "Un programme d'ETP ne tient pas dans un tableur.",
    text: "Des dizaines de séances collectives et individuelles, des intervenants aux agendas croisés, des patients qui avancent chacun à leur rythme. Etepea remplace les tableurs et les classeurs par une trame claire, déroulée sur l'année, que toute l'équipe partage.",
    stats: [
      ["1 trame", "construite une fois puis déroulée sur toute l'année."],
      ["1 clic", "pour pointer la présence d'un patient à une séance."],
      ["0 doublon", "le patient rejoint ses séances sans double saisie."],
      ["4 rôles", "coordination, intervenants, secrétariat et lecture seule."],
    ],
  },
  platform: {
    label: "La plateforme",
    title: "Tout le programme dans un seul outil.",
    features: [
      {
        title: "Planning annuel",
        text: "Construisez la trame d'un parcours une fois, puis déroulez-la sur l'année.",
        points: [
          "Duplication et déplacement en masse",
          "Semaines fermées et cycles de répétition",
          "Export par soignant ou par période",
        ],
        screen: SCREENS.planning,
        focus: "70% 0%",
      },
      {
        title: "Agenda du jour",
        text: "Chaque matin, l'équipe sait qui vient, où et avec qui.",
        points: [
          "Patients attendus et places restantes",
          "Présences et accompagnants",
          "Transmissions entre intervenants",
        ],
        screen: SCREENS.agenda,
        focus: "0% 0%",
      },
      {
        title: "Suivi mensuel",
        text: "La participation de chaque patient se lit d'un coup d'œil.",
        points: [
          "Pointage d'une présence en un clic",
          "Absences et motifs remontés automatiquement",
          "Une vue par mois pour tout le service",
        ],
        screen: SCREENS.suivi,
        focus: "0% 0%",
      },
      {
        title: "Dossiers patients et diagnostic éducatif",
        text: "Tous vos patients, leurs parcours et leur bilan éducatif partagé.",
        points: [
          "Modèles de diagnostic adaptés à votre programme",
          "Fiche patient configurable par service",
          "Programme PDF remis au patient",
        ],
        screen: SCREENS.patients,
        focus: "0% 0%",
      },
    ],
  },
  journey: {
    label: "Le parcours patient",
    title: "De l'inclusion à la sortie, sans rien ressaisir.",
    step: "Étape",
    steps: [
      [
        "Inclusion",
        "Identité, contexte social, décision ETP, orientation et objectif : le dossier se constitue dès l'entrée.",
      ],
      [
        "Diagnostic",
        "Le bilan éducatif partagé, guidé par un modèle adapté à votre programme.",
      ],
      [
        "Séances",
        "Le patient rejoint les séances de son parcours principal et de ses parcours optionnels.",
      ],
      [
        "Suivi",
        "Présences, absences et motifs remontent automatiquement dans la vue de suivi.",
      ],
      [
        "Sortie",
        "Date, motif et point final du parcours, avec un programme PDF remis au patient.",
      ],
    ],
  },
  security: {
    label: "Sécurité",
    title: "Conçu pour un service de soins.",
    cards: [
      [
        "Données cloisonnées",
        "Chaque établissement et chaque service ne voit que ses propres patients. Deux structures ne se croisent jamais.",
      ],
      [
        "Des rôles précis",
        "Les comptes s'ouvrent sur invitation uniquement. Chacun accède à ce dont il a besoin, pas au-delà.",
      ],
      [
        "Conflits signalés",
        "Une salle déjà occupée, un rendez-vous qui en chevauche un autre : Etepea vous prévient avant que le patient ne le découvre.",
      ],
      [
        "Journal d'activité",
        "Qui a créé, modifié ou supprimé quoi et quand. La traçabilité sans effort.",
      ],
    ],
  },
  roles: {
    label: "Équipes",
    title: "Chaque métier y trouve son écran.",
    items: [
      [
        "Coordination",
        "Conçoit les modèles de parcours, construit le planning de l'année et pilote l'équipe.",
      ],
      [
        "Intervenants",
        "Retrouvent leurs séances, l'agenda du jour, les dossiers et leurs pense-bêtes.",
      ],
      [
        "Secrétariat",
        "Gère l'identité et les rendez-vous des patients, sans accès au contenu clinique.",
      ],
    ],
  },
  demo: {
    label: "Démonstration",
    title: "Trente minutes sur vos propres parcours.",
    text: "Dites-nous qui vous êtes. Nous revenons vers vous pour fixer un créneau.",
    fields: {
      firstName: "Prénom",
      lastName: "Nom",
      email: "E-mail professionnel",
      establishment: "Établissement",
      role: "Fonction",
      message: "Message (facultatif)",
    },
    consent: "J'accepte que ces informations servent à me recontacter.",
    consentLink: "Politique de confidentialité",
    submit: "Demander une démonstration",
    sending: "Envoi en cours",
    sent: "Merci, votre demande est bien partie. Nous vous répondons très vite.",
    error: "L'envoi n'a pas abouti. Vous pouvez nous écrire directement à",
  },
  footer: {
    tagline: "Le logiciel des programmes d'éducation thérapeutique du patient.",
    platform: "Plateforme",
    product: "Etepea",
    contact: "Contact",
    legal: "Informations",
    privacy: "Politique de confidentialité",
    cookies: "Gestion des cookies",
    rights: "Tous droits réservés.",
  },
  cookieNotice: {
    text: "Ce site ne dépose aucun cookie de suivi ni de publicité.",
    ok: "Compris",
    more: "En savoir plus",
  },
  legal: {
    back: "Retour à l'accueil",
    privacy: {
      title: "Politique de confidentialité",
      sections: [
        [
          "Ce que nous collectons",
          "Le site ne collecte des données que lorsque vous remplissez le formulaire de demande de démonstration : prénom, nom, adresse e-mail professionnelle, établissement, fonction et message éventuel.",
        ],
        [
          "À quoi servent ces données",
          "Ces informations servent uniquement à répondre à votre demande et à organiser la démonstration. Elles ne sont ni revendues ni utilisées à des fins publicitaires.",
        ],
        [
          "Où vont ces données",
          "Votre demande est transmise par e-mail à l'équipe Etepea. Elle n'est pas enregistrée dans une base de données du site.",
        ],
        [
          "Mesure d'audience",
          "Le site n'utilise aucun outil de mesure d'audience ni aucun traceur publicitaire.",
        ],
        [
          "Vos droits",
          `Vous pouvez demander l'accès à vos données, leur rectification ou leur suppression en écrivant à ${CONTACT_EMAIL}.`,
        ],
      ],
    },
    cookies: {
      title: "Gestion des cookies",
      sections: [
        [
          "Aucun cookie de suivi",
          "Ce site ne dépose aucun cookie publicitaire ou de mesure d'audience. Aucun consentement ne vous est donc demandé.",
        ],
        [
          "Ce qui est mémorisé dans votre navigateur",
          "Lorsque vous fermez le message d'information sur les cookies, ce choix est mémorisé dans votre navigateur pour ne plus l'afficher. Cette information ne quitte pas votre appareil.",
        ],
        [
          "Ressources externes",
          "Les polices et les images sont servies par le site lui-même. Aucune ressource n'est chargée depuis un service tiers.",
        ],
      ],
    },
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
      ["Patient journey", "#parcours"],
      ["Security", "#securite"],
      ["Teams", "#equipes"],
    ],
    cta: "Book a demo",
  },
  hero: {
    label: "Therapeutic patient education",
    title: "The software that runs your patient education program.",
    lead: "Pathways, sessions, patients and educational assessments in one place, built alongside rehabilitation teams.",
    primary: "Book a demo",
    secondary: "Explore the platform",
    screen: SCREENS.planning,
    trust: [
      "Data isolated per department",
      "Accounts by invitation only",
      "Built with care teams",
    ],
  },
  problem: {
    label: "The problem",
    title: "A patient education program does not fit in a spreadsheet.",
    text: "Dozens of group and one-to-one sessions, practitioners with overlapping schedules, patients who each move at their own pace. Etepea replaces spreadsheets and binders with one clear framework, rolled out across the year and shared by the whole team.",
    stats: [
      ["1 framework", "designed once then rolled out over the whole year."],
      ["1 click", "to record a patient's attendance at a session."],
      ["0 duplicates", "patients join their sessions with no double entry."],
      ["4 roles", "coordinators, practitioners, front desk and read-only."],
    ],
  },
  platform: {
    label: "The platform",
    title: "The whole program in a single tool.",
    features: [
      {
        title: "Yearly planning",
        text: "Design a pathway once, then roll it out over the year.",
        points: [
          "Bulk duplicate and move sessions",
          "Closed weeks and repeat cycles",
          "Export by practitioner or by period",
        ],
        screen: SCREENS.planning,
        focus: "70% 0%",
      },
      {
        title: "Daily agenda",
        text: "Every morning the team knows who is coming, where and with whom.",
        points: [
          "Expected patients and remaining places",
          "Attendance and companions",
          "Handover notes between practitioners",
        ],
        screen: SCREENS.agenda,
        focus: "0% 0%",
      },
      {
        title: "Monthly follow-up",
        text: "Every patient's attendance, readable at a glance.",
        points: [
          "Record attendance in one click",
          "Absences and reasons collected automatically",
          "One monthly view for the whole department",
        ],
        screen: SCREENS.suivi,
        focus: "0% 0%",
      },
      {
        title: "Patient records and educational assessment",
        text: "Every patient, their pathways and their shared educational assessment.",
        points: [
          "Assessment templates tailored to your program",
          "Patient record configurable per department",
          "PDF program handed to the patient",
        ],
        screen: SCREENS.patients,
        focus: "0% 0%",
      },
    ],
  },
  journey: {
    label: "The patient journey",
    title: "From enrolment to discharge, with nothing typed twice.",
    step: "Step",
    steps: [
      [
        "Enrolment",
        "Identity, social context, program decision, referral and goal: the record builds up from day one.",
      ],
      [
        "Assessment",
        "The shared educational assessment, guided by a template tailored to your program.",
      ],
      [
        "Sessions",
        "Patients join the sessions of their main pathway and of their optional pathways.",
      ],
      [
        "Follow-up",
        "Attendance, absences and reasons flow straight into the follow-up view.",
      ],
      [
        "Discharge",
        "Date, reason and pathway outcome, with a PDF program handed to the patient.",
      ],
    ],
  },
  security: {
    label: "Security",
    title: "Built for a care department.",
    cards: [
      [
        "Isolated data",
        "Each facility and each department only sees its own patients. Two organisations never overlap.",
      ],
      [
        "Precise roles",
        "Accounts are opened by invitation only. Everyone gets exactly what they need, nothing more.",
      ],
      [
        "Conflicts flagged",
        "A room already booked, an appointment overlapping another: Etepea warns you before the patient finds out.",
      ],
      [
        "Activity log",
        "Who created, changed or deleted what and when. Traceability without the effort.",
      ],
    ],
  },
  roles: {
    label: "Teams",
    title: "Every role gets its own screen.",
    items: [
      [
        "Coordinators",
        "Design pathway templates, build the yearly schedule and lead the team.",
      ],
      [
        "Practitioners",
        "Find their sessions, today's agenda, patient records and their to-dos.",
      ],
      [
        "Front desk",
        "Manages patient identity and appointments, without access to clinical content.",
      ],
    ],
  },
  demo: {
    label: "Demo",
    title: "Thirty minutes on your own pathways.",
    text: "Tell us who you are. We will get back to you to set a time.",
    fields: {
      firstName: "First name",
      lastName: "Last name",
      email: "Work email",
      establishment: "Facility",
      role: "Role",
      message: "Message (optional)",
    },
    consent: "I agree that this information is used to contact me.",
    consentLink: "Privacy policy",
    submit: "Request a demo",
    sending: "Sending",
    sent: "Thank you, your request is on its way. We will reply shortly.",
    error: "The request could not be sent. You can write to us directly at",
  },
  footer: {
    tagline: "Software for therapeutic patient education programs.",
    platform: "Platform",
    product: "Etepea",
    contact: "Contact",
    legal: "Information",
    privacy: "Privacy policy",
    cookies: "Cookie settings",
    rights: "All rights reserved.",
  },
  cookieNotice: {
    text: "This site sets no tracking or advertising cookies.",
    ok: "Got it",
    more: "Learn more",
  },
  legal: {
    back: "Back to home",
    privacy: {
      title: "Privacy policy",
      sections: [
        [
          "What we collect",
          "The site only collects data when you fill in the demo request form: first name, last name, work email address, facility, role and an optional message.",
        ],
        [
          "What the data is used for",
          "This information is only used to answer your request and to organise the demo. It is neither sold nor used for advertising.",
        ],
        [
          "Where the data goes",
          "Your request is sent by email to the Etepea team. It is not stored in a database on the site.",
        ],
        [
          "Audience measurement",
          "The site uses no analytics tool and no advertising tracker.",
        ],
        [
          "Your rights",
          `You can ask to access, correct or delete your data by writing to ${CONTACT_EMAIL}.`,
        ],
      ],
    },
    cookies: {
      title: "Cookie settings",
      sections: [
        [
          "No tracking cookies",
          "This site sets no advertising or analytics cookies. No consent is therefore requested.",
        ],
        [
          "What is stored in your browser",
          "When you close the cookie information message, that choice is stored in your browser so the message is not shown again. This information never leaves your device.",
        ],
        [
          "External resources",
          "Fonts and images are served by the site itself. Nothing is loaded from a third-party service.",
        ],
      ],
    },
  },
};

export const CONTENT = { fr, en };
export type Copy = typeof fr;
