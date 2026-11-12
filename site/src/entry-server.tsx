import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import App from "./App";
import {
  CONTACT_EMAIL,
  CONTENT,
  LANGS,
  type Lang,
  PAGES,
  type Page,
  pagePath,
  pageTitle,
  SITE_URL,
} from "./content";

const esc = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");

const url = (lang: Lang, page: Page) => SITE_URL + pagePath(lang, page);

const jsonLd = (lang: Lang) =>
  JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Etepea",
        url: SITE_URL,
        logo: `${SITE_URL}/favicon.svg`,
        email: CONTACT_EMAIL,
      },
      {
        "@type": "SoftwareApplication",
        name: "Etepea",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: url(lang, "home"),
        inLanguage: lang,
        description: CONTENT[lang].meta.description,
      },
    ],
  }).replaceAll("<", "\\u003c");

const head = (lang: Lang, page: Page) => {
  const title = esc(pageTitle(lang, page));
  const description = esc(CONTENT[lang].meta.description);
  const image = `${SITE_URL}/screens/planning.jpg`;
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${url(lang, page)}" />`,
    ...LANGS.map(
      (l) => `<link rel="alternate" hreflang="${l}" href="${url(l, page)}" />`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${url("fr", page)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Etepea" />`,
    `<meta property="og:locale" content="${lang === "fr" ? "fr_FR" : "en_GB"}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url(lang, page)}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    ...(page === "home"
      ? [`<script type="application/ld+json">${jsonLd(lang)}</script>`]
      : []),
  ].join("\n    ");
};

export const routes = LANGS.flatMap((lang) =>
  PAGES.map((page) => ({
    lang,
    path: pagePath(lang, page),
    url: url(lang, page),
    head: head(lang, page),
    html: renderToString(
      <StrictMode>
        <App lang={lang} page={page} />
      </StrictMode>,
    ),
  })),
);

export { SITE_URL };
