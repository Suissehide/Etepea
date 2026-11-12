import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { CONTENT, type Lang, type Page, SLUGS } from "./content";
import "./index.css";

const [, langPart, slug] = window.location.pathname.split("/");
const lang: Lang = langPart === "en" ? "en" : "fr";
const page: Page =
  (["privacy", "cookies"] as const).find((p) => SLUGS[p][lang] === slug) ??
  "home";

const t = CONTENT[lang];
document.documentElement.lang = lang;
document.title =
  page === "home" ? t.meta.title : `${t.legal[page].title} | Etepea`;
document
  .querySelector('meta[name="description"]')
  ?.setAttribute("content", t.meta.description);

const root = document.getElementById("root") as HTMLElement;
createRoot(root).render(
  <StrictMode>
    <App lang={lang} page={page} />
  </StrictMode>,
);
