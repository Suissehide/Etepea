import { type FormEvent, type ReactNode, useState } from "react";
import {
  CONTACT_EMAIL,
  CONTENT,
  type Copy,
  type Lang,
  type Page,
  pagePath,
} from "./content";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const H2 =
  "text-3xl leading-tight font-medium tracking-tight md:text-[2.75rem]";
const BTN =
  "inline-flex items-center justify-center rounded-xl px-5 py-3 font-medium transition-colors";
const BTN_DARK = `${BTN} bg-ink text-white hover:bg-brand`;
const BTN_LIGHT = `${BTN} border border-line bg-white hover:border-ink`;
const WRAP = "mx-auto w-full max-w-6xl px-4 sm:px-6";

export default function App({ lang, page }: { lang: Lang; page: Page }) {
  const t = CONTENT[lang];
  const home = page === "home" ? "" : pagePath(lang, "home");
  return (
    <>
      <Nav t={t} lang={lang} page={page} home={home} />
      <main>
        {page === "home" ? (
          <>
            <Hero t={t} />
            <Problem t={t} />
            <Platform t={t} />
            <Journey t={t} />
            <Security t={t} />
            <Roles t={t} />
            <Demo t={t} lang={lang} />
          </>
        ) : (
          <Legal t={t} lang={lang} page={page} />
        )}
      </main>
      <Footer t={t} lang={lang} page={page} home={home} />
      <CookieNotice t={t} lang={lang} />
    </>
  );
}

const FAINT = [
  [0, 0],
  [17, 0],
  [0, 17],
  [34, 17],
  [17, 34],
  [34, 34],
];

function Logo() {
  return (
    <span className="inline-flex items-center gap-[0.35em] text-xl font-semibold tracking-tight">
      <svg viewBox="0 0 47 47" aria-hidden="true" className="size-[0.9em]">
        {FAINT.map(([x, y]) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width="13"
            height="13"
            rx="3"
            fill="currentColor"
            opacity="0.18"
          />
        ))}
        <rect x="0" y="34" width="13" height="13" rx="3" fill="currentColor" />
        <rect x="17" y="17" width="13" height="13" rx="3" fill="currentColor" />
        <rect
          x="34"
          y="0"
          width="13"
          height="13"
          rx="3"
          className="fill-brand"
        />
      </svg>
      <span>
        etepe<span className="text-brand">a</span>
      </span>
    </span>
  );
}

function Cube({ className = "bg-brand" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-2.5 shrink-0 rounded-[3px] ${className}`}
    />
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm font-medium text-brand">
      <Cube />
      {children}
    </p>
  );
}

function Nav({
  t,
  lang,
  page,
  home,
}: {
  t: Copy;
  lang: Lang;
  page: Page;
  home: string;
}) {
  const other = lang === "fr" ? "en" : "fr";
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur">
      <nav className={`${WRAP} flex h-16 items-center gap-2`}>
        <a
          href={pagePath(lang, "home")}
          aria-label="Etepea"
          className="mr-auto"
        >
          <Logo />
        </a>
        <div className="hidden items-center md:flex">
          {t.nav.links.map(([label, href]) => (
            <a
              key={href}
              href={home + href}
              className="rounded-lg px-3 py-2 text-[0.95rem] text-mute transition-colors hover:text-ink"
            >
              {label}
            </a>
          ))}
        </div>
        <a
          href={pagePath(other, page)}
          hrefLang={other}
          className="rounded-lg px-3 py-2 text-sm font-medium text-mute uppercase transition-colors hover:text-ink"
        >
          {other}
        </a>
        <a href={`${home}#demo`} className={`${BTN_DARK} px-4 py-2 text-sm`}>
          {t.nav.cta}
        </a>
      </nav>
    </header>
  );
}

function Screen({
  src,
  focus = "0% 0%",
  className = "",
}: {
  src: string;
  focus?: string;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-line bg-white shadow-[0_40px_80px_-45px_rgba(37,99,235,0.45)] ${className}`}
    >
      <div className="flex gap-1.5 border-b border-line px-3.5 py-3">
        <Cube className="bg-line" />
        <Cube className="bg-line" />
        <Cube className="bg-brand" />
      </div>
      <img
        src={src}
        alt=""
        loading="lazy"
        style={{ objectPosition: focus }}
        className="aspect-[16/10] w-full object-cover"
      />
    </div>
  );
}

function Hero({ t }: { t: Copy }) {
  const h = t.hero;
  return (
    <section className="relative overflow-hidden">
      <div className="cubes absolute inset-0" />
      <div className={`${WRAP} relative pt-16 text-center md:pt-24`}>
        <div className="flex justify-center">
          <Label>{h.label}</Label>
        </div>
        <h1 className="mx-auto mt-5 max-w-4xl text-[clamp(2.4rem,5.4vw,4.25rem)] leading-[1.06] font-medium tracking-tight text-balance">
          {h.title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-mute md:text-xl">
          {h.lead}
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <a href="#demo" className={BTN_DARK}>
            {h.primary}
          </a>
          <a href="#plateforme" className={BTN_LIGHT}>
            {h.secondary}
          </a>
        </div>
        <ul className="mt-8 flex flex-col items-center justify-center gap-x-8 gap-y-2 text-sm text-mute sm:flex-row">
          {h.trust.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Cube />
              {item}
            </li>
          ))}
        </ul>
        <Screen src={h.screen} className="mx-auto mt-14 max-w-5xl" />
      </div>
    </section>
  );
}

function Problem({ t }: { t: Copy }) {
  const p = t.problem;
  return (
    <section className="py-24 md:py-32">
      <div
        className={`${WRAP} grid items-center gap-12 md:grid-cols-2 md:gap-20`}
      >
        <div className="reveal">
          <Label>{p.label}</Label>
          <h2 className={`${H2} mt-4`}>{p.title}</h2>
          <p className="mt-6 text-lg text-mute">{p.text}</p>
        </div>
        <ul className="reveal grid grid-cols-2 gap-3">
          {p.stats.map(([value, text], i) => (
            <li
              key={value}
              className={`flex aspect-square flex-col justify-between rounded-3xl p-5 sm:p-7 ${i === 1 ? "bg-brand text-white" : "bg-tint"}`}
            >
              <span className="text-2xl font-medium tracking-tight sm:text-4xl">
                {value}
              </span>
              <span
                className={`text-sm sm:text-base ${i === 1 ? "text-white/85" : "text-mute"}`}
              >
                {text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Platform({ t }: { t: Copy }) {
  const p = t.platform;
  return (
    <section id="plateforme" className="bg-tint py-24 md:py-32">
      <div className={WRAP}>
        <Label>{p.label}</Label>
        <h2 className={`${H2} mt-4 max-w-2xl`}>{p.title}</h2>
        <div className="mt-16 flex flex-col gap-20 md:gap-28">
          {p.features.map((f, i) => (
            <article
              key={f.title}
              className="reveal grid items-center gap-8 md:grid-cols-[2fr_3fr] md:gap-16"
            >
              <div className={i % 2 ? "md:order-2" : ""}>
                <h3 className="text-2xl font-medium tracking-tight md:text-3xl">
                  {f.title}
                </h3>
                <p className="mt-3 text-lg text-mute">{f.text}</p>
                <ul className="mt-6 flex flex-col gap-3">
                  {f.points.map((point) => (
                    <li key={point} className="flex items-baseline gap-3">
                      <Cube />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <Screen src={f.screen} focus={f.focus} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Journey({ t }: { t: Copy }) {
  const j = t.journey;
  return (
    <section id="parcours" className="py-24 md:py-32">
      <div className={WRAP}>
        <Label>{j.label}</Label>
        <h2 className={`${H2} mt-4 max-w-3xl`}>{j.title}</h2>
        <ol className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {j.steps.map(([name, text], i) => (
            <li
              key={name}
              className="reveal rounded-3xl border border-line p-6"
            >
              <div className="flex gap-1" aria-hidden="true">
                {j.steps.map(([other], k) => (
                  <Cube
                    key={other}
                    className={
                      k === i ? "bg-brand" : k < i ? "bg-ink" : "bg-line"
                    }
                  />
                ))}
              </div>
              <p className="mt-6 text-sm text-mute">
                {j.step} {i + 1}
              </p>
              <h3 className="mt-1 text-xl font-medium tracking-tight">
                {name}
              </h3>
              <p className="mt-3 text-[0.95rem] text-mute">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Security({ t }: { t: Copy }) {
  const s = t.security;
  return (
    <section id="securite" className="bg-ink py-24 text-white md:py-32">
      <div className={WRAP}>
        <p className="flex items-center gap-2 text-sm font-medium text-white/70">
          <Cube />
          {s.label}
        </p>
        <h2 className={`${H2} mt-4`}>{s.title}</h2>
        <ul className="mt-14 grid gap-3 sm:grid-cols-2">
          {s.cards.map(([title, text]) => (
            <li
              key={title}
              className="reveal rounded-3xl bg-white/[0.06] p-7 md:p-9"
            >
              <h3 className="text-xl font-medium tracking-tight md:text-2xl">
                {title}
              </h3>
              <p className="mt-3 text-white/70">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Roles({ t }: { t: Copy }) {
  const r = t.roles;
  return (
    <section id="equipes" className="py-24 md:py-32">
      <div className={WRAP}>
        <Label>{r.label}</Label>
        <h2 className={`${H2} mt-4`}>{r.title}</h2>
        <ul className="mt-14 grid gap-10 md:grid-cols-3">
          {r.items.map(([role, text]) => (
            <li key={role} className="reveal border-t border-ink pt-6">
              <h3 className="text-xl font-medium tracking-tight">{role}</h3>
              <p className="mt-3 text-mute">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const INPUT =
  "mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink transition-colors hover:border-mute";

function Field({
  name,
  label,
  type = "text",
  autoComplete,
  full = false,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  full?: boolean;
}) {
  return (
    <label className={`text-sm text-mute ${full ? "sm:col-span-2" : ""}`}>
      {label}
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        maxLength={160}
        className={INPUT}
      />
    </label>
  );
}

function Demo({ t, lang }: { t: Copy; lang: Lang }) {
  const d = t.demo;
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { consent: _, ...body } = Object.fromEntries(
      new FormData(event.currentTarget),
    );
    setState("sending");
    try {
      const response = await fetch(`${API_URL}/demo-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setState(response.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <section id="demo" className="bg-tint py-24 md:py-32">
      <div className={`${WRAP} grid gap-12 md:grid-cols-2 md:gap-20`}>
        <div>
          <Label>{d.label}</Label>
          <h2 className={`${H2} mt-4`}>{d.title}</h2>
          <p className="mt-6 text-lg text-mute">{d.text}</p>
        </div>
        {state === "sent" ? (
          <p
            role="status"
            className="flex items-center gap-3 self-start rounded-3xl bg-white p-8 text-lg"
          >
            <Cube />
            {d.sent}
          </p>
        ) : (
          <form
            onSubmit={submit}
            className="grid gap-4 rounded-3xl border border-line bg-white p-6 sm:grid-cols-2 sm:p-8"
          >
            <Field
              name="firstName"
              label={d.fields.firstName}
              autoComplete="given-name"
            />
            <Field
              name="lastName"
              label={d.fields.lastName}
              autoComplete="family-name"
            />
            <Field
              name="email"
              label={d.fields.email}
              type="email"
              autoComplete="email"
              full
            />
            <Field
              name="establishment"
              label={d.fields.establishment}
              autoComplete="organization"
            />
            <Field
              name="role"
              label={d.fields.role}
              autoComplete="organization-title"
            />
            <label className="text-sm text-mute sm:col-span-2">
              {d.fields.message}
              <textarea
                name="message"
                rows={3}
                maxLength={2000}
                className={INPUT}
              />
            </label>
            <input
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />
            <label className="flex items-baseline gap-2.5 text-sm text-mute sm:col-span-2">
              <input name="consent" type="checkbox" required />
              <span>
                {d.consent}{" "}
                <a
                  href={pagePath(lang, "privacy")}
                  className="text-ink underline"
                >
                  {d.consentLink}
                </a>
              </span>
            </label>
            <button
              type="submit"
              disabled={state === "sending"}
              className={`${BTN_DARK} disabled:opacity-60 sm:col-span-2`}
            >
              {state === "sending" ? d.sending : d.submit}
            </button>
            {state === "error" && (
              <p role="alert" className="text-sm text-red-700 sm:col-span-2">
                {d.error}{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
                  {CONTACT_EMAIL}
                </a>
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}

function Legal({
  t,
  lang,
  page,
}: {
  t: Copy;
  lang: Lang;
  page: Exclude<Page, "home">;
}) {
  const doc = t.legal[page];
  return (
    <article className={`${WRAP} max-w-3xl py-16 md:py-24`}>
      <a
        href={pagePath(lang, "home")}
        className="text-sm text-mute hover:text-ink"
      >
        ← {t.legal.back}
      </a>
      <h1 className="mt-6 text-4xl font-medium tracking-tight md:text-5xl">
        {doc.title}
      </h1>
      {doc.sections.map(([title, text]) => (
        <section key={title} className="mt-10">
          <h2 className="flex items-center gap-2.5 text-xl font-medium tracking-tight">
            <Cube />
            {title}
          </h2>
          <p className="mt-3 text-lg text-mute">{text}</p>
        </section>
      ))}
    </article>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[][] }) {
  return (
    <div>
      <h2 className="text-sm font-medium text-mute">{title}</h2>
      <ul className="mt-4 flex flex-col gap-2.5">
        {links.map(([label, href]) => (
          <li key={href}>
            <a href={href} className="transition-colors hover:text-brand">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Footer({
  t,
  lang,
  page,
  home,
}: {
  t: Copy;
  lang: Lang;
  page: Page;
  home: string;
}) {
  const f = t.footer;
  const other = lang === "fr" ? "en" : "fr";
  return (
    <footer className="border-t border-line py-14">
      <div className={WRAP}>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-mute">{f.tagline}</p>
          </div>
          <FooterColumn
            title={f.product}
            links={[
              ...t.nav.links.map(([label, href]) => [label, home + href]),
              [t.nav.cta, `${home}#demo`],
            ]}
          />
          <FooterColumn
            title={f.contact}
            links={[[CONTACT_EMAIL, `mailto:${CONTACT_EMAIL}`]]}
          />
          <FooterColumn
            title={f.legal}
            links={[
              [f.privacy, pagePath(lang, "privacy")],
              [f.cookies, pagePath(lang, "cookies")],
            ]}
          />
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-sm text-mute">
          <p>
            © {new Date().getFullYear()} Etepea. {f.rights}
          </p>
          <a
            href={pagePath(other, page)}
            hrefLang={other}
            className="hover:text-ink"
          >
            {other === "en" ? "English" : "Français"}
          </a>
        </div>
      </div>
    </footer>
  );
}

const NOTICE_KEY = "etepea-cookie-notice";

function CookieNotice({ t, lang }: { t: Copy; lang: Lang }) {
  const [open, setOpen] = useState(() => !localStorage.getItem(NOTICE_KEY));
  if (!open) {
    return null;
  }
  const close = () => {
    localStorage.setItem(NOTICE_KEY, "1");
    setOpen(false);
  };
  return (
    <aside className="fixed inset-x-4 bottom-4 z-50 rounded-2xl border border-line bg-white p-5 text-sm shadow-xl sm:right-auto sm:w-80">
      <p>{t.cookieNotice.text}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={close}
          className={`${BTN_DARK} px-3.5 py-1.5`}
        >
          {t.cookieNotice.ok}
        </button>
        <a
          href={pagePath(lang, "cookies")}
          className={`${BTN_LIGHT} px-3.5 py-1.5`}
        >
          {t.cookieNotice.more}
        </a>
      </div>
    </aside>
  );
}
