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

const umamiId = import.meta.env.VITE_UMAMI_WEBSITE_ID;
if (umamiId) {
  const script = document.createElement("script");
  script.defer = true;
  script.src = "https://umami.qwetle.fr/script.js";
  script.dataset.websiteId = umamiId;
  document.head.append(script);
}

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
