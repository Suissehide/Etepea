import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import { type Lang, type Page, pageTitle, SLUGS } from "./content";
import "./index.css";

const [, langPart, slug] = window.location.pathname.split("/");
const lang: Lang = langPart === "en" ? "en" : "fr";
const page: Page =
  (["privacy", "cookies"] as const).find((p) => SLUGS[p][lang] === slug) ??
  "home";

document.documentElement.lang = lang;
document.title = pageTitle(lang, page);

// Mesure d'audience Umami : le script ignore tout autre domaine que la production.
const umami = document.createElement("script");
umami.defer = true;
umami.src = "https://umami.qwetle.fr/script.js";
umami.dataset.websiteId = "3f45cd25-d36e-4cc5-ad7e-58bc6dbcd6b3";
umami.dataset.domains = "etepea.fr,www.etepea.fr";
document.head.append(umami);

const root = document.getElementById("root") as HTMLElement;
const app = (
  <StrictMode>
    <App lang={lang} page={page} />
  </StrictMode>
);
// Pages pré-rendues au build : on hydrate. En dev la racine est vide.
if (root.hasChildNodes()) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
