export type Lang = "fr" | "en";
export type Page = "home" | "privacy" | "cookies";

export const CONTACT_EMAIL = "contact@etepea.fr";
export const SITE_URL = import.meta.env.VITE_SITE_URL ?? "https://etepea.fr";
export const LANGS: Lang[] = ["fr", "en"];
export const PAGES: Page[] = ["home", "privacy", "cookies"];

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
    title:
      "Etepea | Logiciel de gestion des programmes d'éducation thérapeutique (ETP)",
    description:
      "Etepea est le logiciel qui planifie, coordonne et suit vos programmes d'éducation thérapeutique du patient (ETP) : planning annuel, agenda, suivi des présences et diagnostic éducatif.",
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
    title: "Une trame pour toute votre année d'éducation thérapeutique.",
    lead: "Etepea est le logiciel des équipes d'ETP. Vous construisez la semaine type de chaque parcours. Etepea la déroule sur l'année, y inscrit vos patients et suit leur présence.",
    primary: "Demander une démo",
    secondary: "Voir la plateforme",
    note: "Comptes ouverts sur invitation. Données cloisonnées par service.",
    screen: SCREENS.planning,
    screenAlt: "Planning annuel d'un programme d'ETP dans Etepea",
    sceneAlt:
      "Animation : la trame de séances d'une année, sous forme de cubes",
  },
  manual: {
    title: "Ce que l'équipe arrête de faire à la main.",
    before: "Aujourd'hui",
    after: "Avec Etepea",
    rows: [
      [
        "Recopier le planning d'une semaine sur l'autre.",
        "La semaine type se répète seule, semaines fermées comprises.",
      ],
      [
        "Tenir une feuille de présence par atelier.",
        "Chaque séance a sa liste de patients attendus. Une présence se note en un clic.",
      ],
      [
        "Chercher qui vient ce matin et dans quelle salle.",
        "L'agenda du jour réunit les patients, les salles et les places restantes.",
      ],
      [
        "Ressaisir le même patient dans chaque tableau.",
        "Le patient est inscrit à son parcours. Ses séances en découlent.",
      ],
    ],
  },
  platform: {
    title: "Les écrans que l'équipe ouvre chaque jour.",
    features: [
      {
        name: "Planning",
        title: "Le planning de l'année",
        text: "Vous posez la semaine type d'un parcours, puis vous la déroulez sur les mois à venir.",
        points: [
          "Dupliquer ou déplacer plusieurs séances d'un coup",
          "Fermer des semaines et régler les cycles de répétition",
          "Exporter par soignant ou par période",
        ],
        screen: SCREENS.planning,
        focus: "70% 0%",
      },
      {
        name: "Agenda",
        title: "L'agenda du jour",
        text: "Le matin, chacun sait qui vient, où et avec qui.",
        points: [
          "Patients attendus et places restantes",
          "Présences et accompagnants",
          "Transmissions entre intervenants",
        ],
        screen: SCREENS.agenda,
        focus: "0% 0%",
      },
      {
        name: "Suivi",
        title: "Le suivi du mois",
        text: "La participation de chaque patient se lit d'un coup d'œil.",
        points: [
          "Pointer une présence en un clic",
          "Voir les absences et leurs motifs",
          "Une vue par mois pour tout le service",
        ],
        screen: SCREENS.suivi,
        focus: "0% 0%",
      },
      {
        name: "Patients",
        title: "Les dossiers et le diagnostic éducatif",
        text: "Chaque patient, ses parcours et son bilan éducatif partagé au même endroit.",
        points: [
          "Modèles de diagnostic adaptés à votre programme",
          "Fiche patient configurable par service",
          "Programme PDF à remettre au patient",
        ],
        screen: SCREENS.patients,
        focus: "0% 0%",
      },
    ],
  },
  journey: {
    title: "Le patient avance, son dossier suit.",
    step: "Étape",
    steps: [
      [
        "Inclusion",
        "Identité, contexte social, orientation et objectif : le dossier s'ouvre dès l'entrée.",
      ],
      [
        "Diagnostic",
        "Le bilan éducatif partagé se remplit avec un modèle adapté à votre programme.",
      ],
      [
        "Séances",
        "Le patient rejoint les séances de son parcours principal et de ses parcours optionnels.",
      ],
      [
        "Suivi",
        "Présences, absences et motifs remontent dans la vue de suivi.",
      ],
      [
        "Sortie",
        "Date, motif et bilan de fin de parcours, avec un programme PDF remis au patient.",
      ],
    ],
  },
  security: {
    title: "Des données de santé, traitées comme telles.",
    cards: [
      [
        "Chaque service chez soi",
        "Un établissement et un service ne voient que leurs propres patients. Deux structures ne se croisent jamais.",
      ],
      [
        "Des comptes sur invitation",
        "Personne ne s'inscrit seul. Chaque compte reçoit un rôle qui borne ce qu'il peut voir et modifier.",
      ],
      [
        "Les conflits signalés",
        "Une salle déjà prise ou deux rendez-vous qui se chevauchent : Etepea prévient avant que le patient ne le découvre.",
      ],
      [
        "Un journal d'activité",
        "Qui a créé, modifié ou supprimé quoi et quand. La trace existe sans que personne n'ait à la tenir.",
      ],
    ],
  },
  roles: {
    title: "Chacun voit ce qui le concerne.",
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
    title: "Voyez Etepea tourner sur vos propres parcours.",
    text: "Une démonstration de trente minutes. Dites-nous qui vous êtes et nous revenons vers vous pour fixer un créneau.",
    sceneAlt: "Animation : le logo Etepea assemblé en cubes",
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
    submit: "Demander une démo",
    sending: "Envoi en cours",
    sent: "Demande envoyée. Nous vous répondons très vite.",
    error: "La demande n'est pas partie. Réessayez ou écrivez-nous à",
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
          "La fréquentation du site est mesurée avec Umami, un outil libre installé sur notre propre serveur. Il ne dépose aucun cookie et ne permet pas de vous suivre d'un site à l'autre. Les statistiques sont anonymes et agrégées. Le site n'utilise aucun traceur publicitaire.",
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
          "Ce site ne dépose aucun cookie publicitaire ou de suivi. La mesure d'audience fonctionne sans cookie.",
        ],
        [
          "Ce qui est mémorisé dans votre navigateur",
          "Lorsque vous fermez le message d'information sur les cookies, ce choix est mémorisé dans votre navigateur pour ne plus l'afficher. Cette information ne quitte pas votre appareil.",
        ],
        [
          "Ressources externes",
          "Les polices et les images sont servies par le site lui-même. Le seul script externe est celui de la mesure d'audience, chargé depuis notre propre serveur Umami.",
        ],
      ],
    },
  },
};

const en: typeof fr = {
  meta: {
    title: "Etepea | Software to run therapeutic patient education programs",
    description:
      "Etepea is the software that plans, coordinates and tracks your therapeutic patient education programs: yearly planning, daily agenda, attendance follow-up and educational assessment.",
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
    title: "One framework for your whole year of patient education.",
    lead: "Etepea is the software for therapeutic patient education teams. You build the typical week of each pathway. Etepea rolls it out over the year, enrols your patients and tracks their attendance.",
    primary: "Book a demo",
    secondary: "See the platform",
    note: "Accounts by invitation only. Data isolated per department.",
    screen: SCREENS.planning,
    screenAlt: "Yearly planning of a patient education program in Etepea",
    sceneAlt: "Animation: a year of sessions laid out as a grid of cubes",
  },
  manual: {
    title: "What the team stops doing by hand.",
    before: "Today",
    after: "With Etepea",
    rows: [
      [
        "Copying the schedule from one week to the next.",
        "The typical week repeats by itself, closed weeks included.",
      ],
      [
        "Keeping one attendance sheet per workshop.",
        "Every session has its list of expected patients. Attendance takes one click.",
      ],
      [
        "Working out who is coming this morning and in which room.",
        "The daily agenda brings together patients, rooms and remaining places.",
      ],
      [
        "Typing the same patient into every spreadsheet.",
        "The patient is enrolled in a pathway. Their sessions follow from it.",
      ],
    ],
  },
  platform: {
    title: "The screens the team opens every day.",
    features: [
      {
        name: "Planning",
        title: "The yearly planning",
        text: "You lay out the typical week of a pathway, then roll it out over the coming months.",
        points: [
          "Duplicate or move several sessions at once",
          "Close weeks and set repeat cycles",
          "Export by practitioner or by period",
        ],
        screen: SCREENS.planning,
        focus: "70% 0%",
      },
      {
        name: "Agenda",
        title: "The daily agenda",
        text: "Every morning everyone knows who is coming, where and with whom.",
        points: [
          "Expected patients and remaining places",
          "Attendance and companions",
          "Handover notes between practitioners",
        ],
        screen: SCREENS.agenda,
        focus: "0% 0%",
      },
      {
        name: "Follow-up",
        title: "The monthly follow-up",
        text: "Every patient's attendance reads at a glance.",
        points: [
          "Record attendance in one click",
          "See absences and their reasons",
          "One monthly view for the whole department",
        ],
        screen: SCREENS.suivi,
        focus: "0% 0%",
      },
      {
        name: "Patients",
        title: "Records and educational assessment",
        text: "Every patient, their pathways and their shared educational assessment in one place.",
        points: [
          "Assessment templates tailored to your program",
          "Patient record configurable per department",
          "PDF program to hand to the patient",
        ],
        screen: SCREENS.patients,
        focus: "0% 0%",
      },
    ],
  },
  journey: {
    title: "The patient moves on, the record keeps up.",
    step: "Step",
    steps: [
      [
        "Enrolment",
        "Identity, social context, referral and goal: the record opens on day one.",
      ],
      [
        "Assessment",
        "The shared educational assessment is filled in with a template tailored to your program.",
      ],
      [
        "Sessions",
        "The patient joins the sessions of their main pathway and of their optional pathways.",
      ],
      [
        "Follow-up",
        "Attendance, absences and reasons flow into the follow-up view.",
      ],
      [
        "Discharge",
        "Date, reason and end-of-pathway review, with a PDF program handed to the patient.",
      ],
    ],
  },
  security: {
    title: "Health data, handled as such.",
    cards: [
      [
        "Every department on its own",
        "A facility and a department only see their own patients. Two organisations never overlap.",
      ],
      [
        "Accounts by invitation",
        "Nobody signs up alone. Each account gets a role that limits what it can see and change.",
      ],
      [
        "Conflicts flagged",
        "A room already booked or two overlapping appointments: Etepea warns you before the patient finds out.",
      ],
      [
        "An activity log",
        "Who created, changed or deleted what and when. The trail exists without anyone having to keep it.",
      ],
    ],
  },
  roles: {
    title: "Everyone sees what concerns them.",
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
    title: "See Etepea running on your own pathways.",
    text: "A thirty-minute demo. Tell us who you are and we will get back to you to set a time.",
    sceneAlt: "Animation: the Etepea logo assembled from cubes",
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
    submit: "Book a demo",
    sending: "Sending",
    sent: "Request sent. We will reply shortly.",
    error: "The request did not go through. Try again or write to us at",
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
          "Site traffic is measured with Umami, an open-source tool running on our own server. It sets no cookies and cannot follow you from one site to another. Statistics are anonymous and aggregated. The site uses no advertising tracker.",
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
          "This site sets no advertising or tracking cookies. Audience measurement works without cookies.",
        ],
        [
          "What is stored in your browser",
          "When you close the cookie information message, that choice is stored in your browser so the message is not shown again. This information never leaves your device.",
        ],
        [
          "External resources",
          "Fonts and images are served by the site itself. The only external script is the audience measurement one, loaded from our own Umami server.",
        ],
      ],
    },
  },
};

export const CONTENT = { fr, en };

export const pageTitle = (lang: Lang, page: Page) =>
  page === "home"
    ? CONTENT[lang].meta.title
    : `${CONTENT[lang].legal[page].title} | Etepea`;
export type Copy = typeof fr;
