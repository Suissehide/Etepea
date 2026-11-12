import type { Mail } from '../../types/infra/mail/mailer.interface'

// Contenu NEUTRE (MDS-35) : produit et établissement seulement, jamais de service, de
// pathologie ni de donnée patient — un e-mail se lit par-dessus l'épaule et se transfère.

export const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

export const layout = (
  paragraphs: string[],
  link: string,
  cta: string,
): string => `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1f2937">
  <h1 style="font-size:22px">etepe<span style="color:#2563eb">a</span></h1>
  ${paragraphs.map((p) => `<p>${p}</p>`).join('\n  ')}
  <p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none">${cta}</a></p>
  <p style="font-size:12px;color:#6b7280">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>${escapeHtml(link)}</p>
</div>`

export const invitationMail = ({
  to,
  link,
  establishmentName,
  soignantName,
}: {
  to: string
  link: string
  establishmentName?: string
  soignantName?: string
}): Mail => {
  const where = establishmentName ? ` pour ${establishmentName}` : ''
  const asWhat = soignantName ? `, en tant que ${soignantName}` : ''
  const intro = `Un accès à Etepea a été ouvert à votre nom${where}${asWhat}.`
  const validity =
    "Ce lien est personnel, à usage unique et valable 30 jours. Si vous n'attendiez pas cet e-mail, ignorez-le."
  return {
    to,
    subject: 'Votre accès à Etepea',
    text: `${intro}\n\nChoisissez votre mot de passe en ouvrant ce lien :\n${link}\n\n${validity}`,
    html: layout(
      [
        escapeHtml(intro),
        'Choisissez votre mot de passe pour vous connecter.',
        escapeHtml(validity),
      ],
      link,
      'Choisir mon mot de passe',
    ),
  }
}

export const passwordResetMail = ({
  to,
  link,
}: {
  to: string
  link: string
}): Mail => {
  const intro =
    'Une réinitialisation du mot de passe de votre compte Etepea a été demandée.'
  const validity =
    "Ce lien est à usage unique et valable 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé."
  return {
    to,
    subject: 'Réinitialisation de votre mot de passe Etepea',
    text: `${intro}\n\nChoisissez un nouveau mot de passe en ouvrant ce lien :\n${link}\n\n${validity}`,
    html: layout(
      [escapeHtml(intro), escapeHtml(validity)],
      link,
      'Choisir un nouveau mot de passe',
    ),
  }
}

export const memberAddedMail = ({
  to,
  link,
  establishmentName,
}: {
  to: string
  link: string
  establishmentName: string
}): Mail => {
  const intro = `Vous avez désormais accès à ${establishmentName} sur Etepea.`
  const how =
    'Connectez-vous avec votre adresse et votre mot de passe habituels.'
  return {
    to,
    subject: 'Nouvel accès sur Etepea',
    text: `${intro}\n\n${how}\n${link}`,
    html: layout([escapeHtml(intro), escapeHtml(how)], link, 'Se connecter'),
  }
}

export const demoRequestMail = (
  to: string,
  demo: {
    firstName: string
    lastName: string
    email: string
    establishment: string
    role: string
    message?: string
  },
): Mail => {
  const lines = [
    `Nom : ${demo.firstName} ${demo.lastName}`,
    `E-mail : ${demo.email}`,
    `Établissement : ${demo.establishment}`,
    `Fonction : ${demo.role}`,
    ...(demo.message ? [`Message : ${demo.message}`] : []),
  ]
  return {
    to,
    subject: `Demande de démo : ${demo.establishment}`,
    text: lines.join('\n'),
    html: lines.map((l) => `<p>${escapeHtml(l)}</p>`).join('\n'),
  }
}
