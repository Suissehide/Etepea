import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import dayjs from 'dayjs'

import type { PrismaClient as Client, Patient } from '../src/generated/client'
import { PrismaClient } from '../src/generated/client'
import { combineDateAndTime, toStartOfWeek } from '../src/main/utils/date'
import { seedArsIndicatorSet } from './seed/indicators'
import seedLocations from './seed/location'
import seedPathwayTemplates from './seed/pathwayTemplate'
import { seedEtpFields } from './seed/patient'
import seedPdfDesignPresets from './seed/pdfDesignPreset'
import seedSoignants from './seed/soignant'
import type { SeedTenant } from './seed/tenant'
import seedThematics from './seed/thematic'
import { hashPassword } from './seed/user'

// Usage : npm run seed:demo -- ["Nom de l'établissement"] [email du compte]
// Chaque lancement crée un NOUVEL établissement (un par essai) ; le compte est réutilisé s'il existe.
const NOM =
  process.argv[2] ??
  `Clinique de démonstration ${dayjs().format('DD/MM/YYYY HH:mm')}`
const EMAIL = (process.argv[3] ?? 'demo@etepea.fr').toLowerCase()
const MOT_DE_PASSE = process.env.DEMO_PASSWORD ?? 'Demo2026!'

// Aléatoire déterministe : deux démos lancées le même jour se ressemblent.
let graine = 20261105
const alea = () => {
  graine = (graine * 1664525 + 1013904223) % 2 ** 32
  return graine / 2 ** 32
}
const choisir = <T>(liste: readonly T[]): T =>
  liste[Math.floor(alea() * liste.length)] as T

const PRENOMS_F = [
  'Monique',
  'Catherine',
  'Sylvie',
  'Nathalie',
  'Isabelle',
  'Françoise',
  'Martine',
  'Christine',
  'Valérie',
  'Sandrine',
  'Brigitte',
  'Chantal',
  'Josiane',
  'Patricia',
  'Véronique',
  'Aïcha',
  'Fatima',
  'Danielle',
]
const PRENOMS_H = [
  'Jean-Pierre',
  'Michel',
  'Alain',
  'Philippe',
  'Patrick',
  'Bernard',
  'Christian',
  'Daniel',
  'Gérard',
  'Thierry',
  'Pascal',
  'Éric',
  'Laurent',
  'Didier',
  'Serge',
  'Mohamed',
  'Hervé',
  'Jacques',
]
const NOMS = [
  'Garcia',
  'Roux',
  'Fournier',
  'Girard',
  'Bonnet',
  'Dupont',
  'Lambert',
  'Fontaine',
  'Rousseau',
  'Vincent',
  'Muller',
  'Lefèvre',
  'Faure',
  'André',
  'Mercier',
  'Blanc',
  'Guérin',
  'Boyer',
  'Garnier',
  'Chevalier',
  'François',
  'Legrand',
  'Gauthier',
  'Perrin',
  'Robin',
  'Clément',
  'Morin',
  'Nicolas',
  'Henry',
  'Roussel',
  'Mathieu',
  'Gautier',
  'Masson',
  'Marchand',
  'Duval',
  'Denis',
  'Lemaire',
  'Brun',
  'Benali',
  'Nguyen',
]
const METIERS = [
  ['Retraité(e)', 'Retraite'],
  ['Retraité(e)', 'Retraite'],
  ['Artisan', 'En activité'],
  ['Aide à domicile', 'En activité'],
  ['Comptable', 'En activité'],
  ['Chauffeur routier', 'Arrêt maladie'],
  ['Agent administratif', 'En activité'],
  ['Agriculteur', 'En activité'],
  ['Sans emploi', 'Recherche d’emploi'],
] as const
const ETUDES = ['Sans diplôme', 'CAP', 'BEP', 'Bac', 'Bac+2', 'Bac+3', 'Bac+5']
const DIAGNOSTICS = [
  'CORONAROPATHIE',
  'CORONAROPATHIE',
  'AOMI',
  'AVC',
  'PREVENTION',
]
const ORIENTATIONS = [
  'ORIENTATION_PRO_SANTE_HOSPIT',
  'ORIENTATION_PRO_SANTE_CS',
  'ORIENTATION_PRO_SANTE_EXT',
  'VENUE_SPONTANEE',
]
const OBJECTIFS = [
  'Reprendre une activité physique régulière',
  'Arrêter de fumer',
  'Mieux comprendre mon traitement',
  'Perdre du poids',
  'Gérer mon stress',
  'Reprendre le travail sereinement',
]

const DUREE_RDV_INDIVIDUEL = 30
const PATIENTS_PAR_GROUPE = 6
const PATIENTS_SANS_PARCOURS = 6
const dejaPris = new Set<string>()

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

function creerPatient(prisma: Client, tenant: SeedTenant, entree: Date) {
  let femme: boolean
  let prenom: string
  let nom: string
  do {
    femme = alea() < 0.45
    prenom = choisir(femme ? PRENOMS_F : PRENOMS_H)
    nom = choisir(NOMS)
  } while (dejaPris.has(`${prenom} ${nom}`))
  dejaPris.add(`${prenom} ${nom}`)
  const [occupation, currentActivity] = choisir(METIERS)
  const diagnostic = choisir(DIAGNOSTICS)
  const slug = `${prenom}.${nom}`
    .normalize('NFD')
    .replace(/[^a-zA-Z.]/g, '')
    .toLowerCase()
  return prisma.patient.create({
    data: {
      establishmentId: tenant.establishmentId,
      firstName: prenom,
      lastName: nom.toUpperCase(),
      gender: femme ? 'female' : 'male',
      birthDate: dayjs('1945-01-01')
        .add(Math.floor(alea() * 365 * 40), 'day')
        .toDate(),
      phone1: `06${String(Math.floor(alea() * 1e8)).padStart(8, '0')}`,
      email: `${slug}@exemple.fr`,
      distance: `${2 + Math.floor(alea() * 45)} km`,
      educationLevel: choisir(ETUDES),
      occupation,
      currentActivity,
      createDate: entree,
      serviceFiles: {
        create: {
          serviceId: tenant.serviceId,
          entryDate: entree,
          clinicalData: { medicalDiagnosis: diagnostic },
          data: {
            careMode: choisir(['AMBU', 'AMBU', 'HDJ']),
            orientation: choisir(ORIENTATIONS),
            etpDecision: 'OUI',
            programType: diagnostic === 'AOMI' ? 'VIVA_AOMI' : 'VIVA',
            goal: choisir(OBJECTIFS),
          },
        },
      },
    },
  })
}

// Comme PathwayRepository.#recreerCreneaux : chaque créneau porte un clone de son créneau modèle.
async function instancierParcours(
  prisma: Client,
  tenant: SeedTenant,
  templateId: string,
  debut: Date,
  patients: Patient[],
  maintenant: Date,
) {
  const template = await prisma.pathwayTemplate.findUniqueOrThrow({
    where: { id: templateId },
    include: { slotTemplates: { include: { soignantLinks: true } } },
  })
  const pathway = await prisma.pathway.create({
    data: { ...tenant, startDate: debut, templateID: template.id },
  })
  for (const st of template.slotTemplates) {
    const jour = dayjs.utc(debut).add(st.offsetDays, 'day').toISOString()
    const startDate = combineDateAndTime(jour, st.startTime)
    const endDate = combineDateAndTime(jour, st.endTime)
    const { id: slotTemplateID } = await prisma.slotTemplate.create({
      data: {
        ...tenant,
        startTime: st.startTime,
        endTime: st.endTime,
        offsetDays: st.offsetDays,
        isIndividual: st.isIndividual,
        type: st.type,
        capacity: st.capacity,
        thematicId: st.thematicId,
        locationID: st.locationID,
        description: st.description,
        color: st.color,
        soignantLinks: {
          create: st.soignantLinks.map((l) => ({
            soignantId: l.soignantId,
            establishmentId: tenant.establishmentId,
          })),
        },
      },
    })
    const slot = await prisma.slot.create({
      data: {
        ...tenant,
        startDate,
        endDate,
        slotTemplateID,
        pathwayID: pathway.id,
      },
    })

    const passe = endDate < maintenant
    // serviceId déduit de la relation composite vers Appointment.
    const presence = () => ({
      establishmentId: tenant.establishmentId,
      convocationSent: true,
      status: passe
        ? alea() < 0.9
          ? ('yes' as const)
          : ('no' as const)
        : null,
    })
    if (!st.isIndividual) {
      await prisma.appointment.create({
        data: {
          ...tenant,
          startDate,
          endDate,
          thematicId: st.thematicId,
          slotID: slot.id,
          appointmentPatients: {
            create: patients.map((p) => ({ ...presence(), patientId: p.id })),
          },
        },
      })
      continue
    }
    // Créneau individuel : rendez-vous successifs tant que le créneau a de la place.
    let debutRdv = dayjs(startDate)
    for (const p of patients) {
      const finRdv = debutRdv.add(DUREE_RDV_INDIVIDUEL, 'minute')
      if (finRdv.toDate() > endDate) {
        break
      }
      await prisma.appointment.create({
        data: {
          ...tenant,
          startDate: debutRdv.toDate(),
          endDate: finRdv.toDate(),
          thematicId: st.thematicId,
          slotID: slot.id,
          appointmentPatients: { create: [{ ...presence(), patientId: p.id }] },
        },
      })
      debutRdv = finRdv
    }
  }
}

async function main() {
  console.log(`🌱 Établissement de démo « ${NOM} »`)
  const maintenant = new Date()
  const lundi = toStartOfWeek(maintenant)

  const establishment = await prisma.establishment.create({
    data: { name: NOM },
  })
  const service = await prisma.service.create({
    data: {
      establishmentId: establishment.id,
      name: 'Éducation thérapeutique',
    },
  })
  const tenant = { establishmentId: establishment.id, serviceId: service.id }

  await seedPdfDesignPresets(prisma)
  const soignants = await seedSoignants(prisma, tenant)
  const locations = await seedLocations(prisma, tenant)
  const thematics = await seedThematics(prisma, soignants, tenant)
  await seedEtpFields(prisma, tenant)
  await seedArsIndicatorSet(prisma, tenant)
  const templates = await seedPathwayTemplates(
    prisma,
    soignants,
    locations,
    thematics,
    tenant,
  )

  // Programmes de groupe de 6 semaines, décalés d'une semaine par paire : le planning est plein
  // de -4 à +6 semaines, avec des parcours finis, en cours et à venir.
  const groupes = templates.filter((t) => t.name.startsWith('Groupe'))
  console.log(
    `→ Instanciation de ${groupes.length} parcours et inscription des patients...`,
  )
  for (const [i, template] of groupes.entries()) {
    const debut = dayjs
      .utc(lundi)
      .add(Math.floor(i / 2) - 4, 'week')
      .toDate()
    const patients: Patient[] = []
    for (let n = 0; n < PATIENTS_PAR_GROUPE; n++) {
      patients.push(
        await creerPatient(
          prisma,
          tenant,
          dayjs(debut).subtract(10, 'day').toDate(),
        ),
      )
    }
    await instancierParcours(
      prisma,
      tenant,
      template.id,
      debut,
      patients,
      maintenant,
    )
  }
  // Adressés récemment, pas encore inscrits : de quoi montrer l'inscription en direct.
  for (let n = 0; n < PATIENTS_SANS_PARCOURS; n++) {
    await creerPatient(
      prisma,
      tenant,
      dayjs(maintenant).subtract(n, 'day').toDate(),
    )
  }

  const existant = await prisma.user.findUnique({ where: { email: EMAIL } })
  const user =
    existant ??
    (await prisma.user.create({
      data: {
        email: EMAIL,
        firstName: 'Compte',
        lastName: 'Démo',
        ...(({ hash, salt }) => ({ password: hash, salt }))(
          hashPassword(MOT_DE_PASSE),
        ),
      },
    }))
  await prisma.establishmentMembership.create({
    data: {
      userId: user.id,
      establishmentId: establishment.id,
      role: 'ADMIN',
      serviceMemberships: {
        create: [
          {
            serviceId: service.id,
            establishmentId: establishment.id,
            role: 'COORDINATEUR',
          },
        ],
      },
    },
  })

  const nbPatients =
    groupes.length * PATIENTS_PAR_GROUPE + PATIENTS_SANS_PARCOURS
  console.log(`✅ ${groupes.length} parcours, ${nbPatients} patients.`)
  console.log(
    existant
      ? `   Compte : ${EMAIL} (existant, mot de passe inchangé)`
      : `   Compte : ${EMAIL} / ${MOT_DE_PASSE}`,
  )
}

main()
  .catch((e) => {
    console.error('❌ Seed de démo en échec :', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
