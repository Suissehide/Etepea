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
      ["Pilotage", "#pilotage"],
      ["Sécurité", "#securite"],
      ["Mise en place", "#mise-en-place"],
    ],
    cta: "Demander une démo",
  },
  hero: {
    title:
      "Vos programmes d'éducation thérapeutique, pilotés cycle après cycle",
    lead: "Etepea est le logiciel de gestion des programmes d'ETP pour les établissements de santé. Il remplace les **tableurs de planning** et les **feuilles de présence**, puis prépare vos **indicateurs ARS** à partir de ce que l'équipe saisit déjà.",
    primary: "Demander une démo",
    secondary: "Voir la plateforme",
    screen: SCREENS.planning,
    screenAlt: "Planning d'un programme d'ETP dans Etepea",
    sceneAlt:
      "Animation : un cycle de trois semaines de séances, puis sa répétition",
    scene: {
      days: ["Lun", "Mar", "Mer", "Jeu", "Ven"],
      cycle: "Cycle",
    },
  },
  manual: {
    title: "Ce que vos équipes arrêtent de faire à la main",
    before: "Aujourd'hui",
    after: "Avec Etepea",
    rows: [
      [
        "Recopier le planning d'un cycle sur le suivant.",
        "Le cycle se répète seul, semaines fermées comprises.",
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
        "Compter les séances à la main pour le rapport d'activité.",
        "Les indicateurs du service se remplissent au fil des saisies.",
      ],
    ],
  },
  platform: {
    title: "Les écrans que l'équipe ouvre chaque jour",
    features: [
      {
        name: "Planning",
        title: "Le planning du cycle",
        text: "Vous posez les semaines d'un cycle. Etepea **le répète** aussi longtemps que dure le programme.",
        points: [
          "Allonger ou raccourcir le cycle à tout moment",
          "Fermer des semaines sans casser la répétition",
          "Exporter par soignant ou par période",
        ],
        screen: SCREENS.planning,
        focus: "70% 0%",
      },
      {
        name: "Agenda",
        title: "L'agenda du jour",
        text: "Le matin, chacun sait **qui vient, où et avec qui**.",
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
        text: "La participation de chaque patient se lit **d'un coup d'œil**.",
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
        text: "Chaque patient, ses parcours et son **bilan éducatif partagé** au même endroit.",
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
  steering: {
    title: "Vos indicateurs se préparent pendant que l'équipe travaille",
    text: "Chaque séance planifiée, chaque présence pointée et chaque diagnostic éducatif alimentent les indicateurs du service. Au moment du rapport d'activité, **l'essentiel est déjà là**.",
    items: [
      [
        "La grille ARS, déjà prête",
        "Les indicateurs demandés par l'ARS sont **fournis d'origine**. Il reste à compléter ce qui ne se calcule pas.",
      ],
      [
        "Vos propres indicateurs",
        "Chaque service compose **ses jeux d'indicateurs** selon ce qu'il doit suivre.",
      ],
      [
        "Un export Excel",
        "Un jeu d'indicateurs s'exporte **sur la période de votre choix**.",
      ],
    ],
  },
  stakeholders: {
    title: "Ce que chacun y gagne",
    items: [
      {
        who: "Direction",
        gains: [
          "Une activité d'ETP enfin lisible",
          "Des indicateurs prêts pour le rapport à l'ARS",
          "Des accès tracés et des données cloisonnées",
        ],
      },
      {
        who: "Cadres et coordination",
        gains: [
          "Un planning qui se répète seul d'un cycle à l'autre",
          "Les conflits de salle signalés avant la séance",
          "Moins de temps passé à recopier et à compter",
        ],
      },
      {
        who: "Soignants et secrétariat",
        gains: [
          "L'agenda du jour avec les patients attendus",
          "Une présence pointée en un clic",
          "Le dossier éducatif au même endroit",
        ],
      },
      {
        who: "DSI et DPO",
        gains: [
          "Des données cloisonnées par établissement et par service",
          "Des comptes ouverts sur invitation, chacun avec son rôle",
          "Un journal des accès aux dossiers et un journal d'activité",
        ],
      },
    ],
  },
  security: {
    title: "Des données de santé, traitées comme telles",
    cards: [
      [
        "Chaque service chez soi",
        "Un établissement et un service ne voient que **leurs propres patients**. Deux structures ne se croisent jamais.",
      ],
      [
        "Des comptes sur invitation",
        "**Personne ne s'inscrit seul.** Chaque compte reçoit un rôle qui borne ce qu'il peut voir et modifier.",
      ],
      [
        "Un journal des accès aux dossiers",
        "Chaque consultation d'un dossier patient est tracée : **qui l'a ouvert et quand**.",
      ],
      [
        "Un journal d'activité",
        "**Qui a créé, modifié ou supprimé quoi** et quand. La trace existe sans que personne n'ait à la tenir.",
      ],
    ],
  },
  onboarding: {
    title: "De la démonstration au premier cycle",
    step: "Étape",
    steps: [
      [
        "Démonstration",
        "**Trente minutes** sur vos propres parcours, pour vérifier qu'Etepea colle à votre programme.",
      ],
      [
        "Paramétrage",
        "Vos services, vos parcours, vos modèles de diagnostic et les champs de votre fiche patient.",
      ],
      [
        "Invitation de l'équipe",
        "Chaque professionnel reçoit un compte avec le rôle qui lui correspond.",
      ],
      [
        "Premier cycle",
        "Les patients sont inscrits à leur parcours et les séances démarrent.",
      ],
    ],
  },
  demo: {
    title: "Voyez Etepea tourner sur vos propres parcours",
    text: "Une démonstration de **trente minutes**. Dites-nous qui vous êtes et nous revenons vers vous pour fixer un créneau.",
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
      ["Indicators", "#pilotage"],
      ["Security", "#securite"],
      ["Getting started", "#mise-en-place"],
    ],
    cta: "Book a demo",
  },
  hero: {
    title: "Your patient education programs, run cycle after cycle",
    lead: "Etepea is the management software for therapeutic patient education programs in healthcare facilities. It replaces **planning spreadsheets** and **attendance sheets**, then prepares your **regulatory indicators** from what the team already records.",
    primary: "Book a demo",
    secondary: "See the platform",
    screen: SCREENS.planning,
    screenAlt: "Planning of a patient education program in Etepea",
    sceneAlt: "Animation: a three-week cycle of sessions, then its repetition",
    scene: {
      days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      cycle: "Cycle",
    },
  },
  manual: {
    title: "What your teams stop doing by hand",
    before: "Today",
    after: "With Etepea",
    rows: [
      [
        "Copying the schedule from one cycle to the next.",
        "The cycle repeats by itself, closed weeks included.",
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
        "Counting sessions by hand for the activity report.",
        "The department's indicators fill in as the team works.",
      ],
    ],
  },
  platform: {
    title: "The screens the team opens every day",
    features: [
      {
        name: "Planning",
        title: "The cycle planning",
        text: "You lay out the weeks of a cycle. Etepea **repeats it** for as long as the program runs.",
        points: [
          "Lengthen or shorten the cycle at any time",
          "Close weeks without breaking the repetition",
          "Export by practitioner or by period",
        ],
        screen: SCREENS.planning,
        focus: "70% 0%",
      },
      {
        name: "Agenda",
        title: "The daily agenda",
        text: "Every morning everyone knows **who is coming, where and with whom**.",
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
        text: "Every patient's attendance reads **at a glance**.",
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
        text: "Every patient, their pathways and their **shared educational assessment** in one place.",
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
  steering: {
    title: "Your indicators get ready while the team works",
    text: "Every planned session, every recorded attendance and every educational assessment feeds the department's indicators. When the activity report is due, **most of it is already there**.",
    items: [
      [
        "The regulator's grid, ready to use",
        "The indicators requested by the French regional health agency (ARS) come **built in**. You only complete what cannot be computed.",
      ],
      [
        "Your own indicators",
        "Each department builds **its indicator sets** around what it has to track.",
      ],
      [
        "An Excel export",
        "An indicator set exports **over the period of your choice**.",
      ],
    ],
  },
  stakeholders: {
    title: "What everyone gets out of it",
    items: [
      {
        who: "Management",
        gains: [
          "Patient education activity you can finally read",
          "Indicators ready for the regulator's report",
          "Traced access and isolated data",
        ],
      },
      {
        who: "Nurse managers and coordinators",
        gains: [
          "A schedule that repeats by itself from one cycle to the next",
          "Room conflicts flagged before the session",
          "Less time spent copying and counting",
        ],
      },
      {
        who: "Practitioners and front desk",
        gains: [
          "Today's agenda with the expected patients",
          "Attendance recorded in one click",
          "The educational record in one place",
        ],
      },
      {
        who: "IT and data protection",
        gains: [
          "Data isolated per facility and per department",
          "Accounts opened by invitation, each with its role",
          "A record access log and an activity log",
        ],
      },
    ],
  },
  security: {
    title: "Health data, handled as such",
    cards: [
      [
        "Every department on its own",
        "A facility and a department only see **their own patients**. Two organisations never overlap.",
      ],
      [
        "Accounts by invitation",
        "**Nobody signs up alone.** Each account gets a role that limits what it can see and change.",
      ],
      [
        "A record access log",
        "Every time a patient record is opened, it is traced: **who opened it and when**.",
      ],
      [
        "An activity log",
        "**Who created, changed or deleted what** and when. The trail exists without anyone having to keep it.",
      ],
    ],
  },
  onboarding: {
    title: "From the demo to the first cycle",
    step: "Step",
    steps: [
      [
        "Demo",
        "**Thirty minutes** on your own pathways, to check that Etepea fits your program.",
      ],
      [
        "Setup",
        "Your departments, your pathways, your assessment templates and the fields of your patient record.",
      ],
      [
        "Inviting the team",
        "Each professional gets an account with the matching role.",
      ],
      [
        "First cycle",
        "Patients are enrolled in their pathway and sessions begin.",
      ],
    ],
  },
  demo: {
    title: "See Etepea running on your own pathways",
    text: "A **thirty-minute** demo. Tell us who you are and we will get back to you to set a time.",
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
