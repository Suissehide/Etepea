import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { CONTENT, type Lang } from "./content";
import "./index.css";

const lang: Lang = window.location.pathname.startsWith("/en") ? "en" : "fr";
const { meta } = CONTENT[lang];
document.documentElement.lang = lang;
document.title = meta.title;
document
  .querySelector('meta[name="description"]')
  ?.setAttribute("content", meta.description);

const root = document.getElementById("root") as HTMLElement;
createRoot(root).render(
  <StrictMode>
    <App lang={lang} />
  </StrictMode>,
);
