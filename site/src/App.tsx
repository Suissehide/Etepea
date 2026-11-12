import { type FormEvent, useEffect, useState } from "react";
import {
  CONTACT_EMAIL,
  CONTENT,
  type Copy,
  type Lang,
  type Page,
  pagePath,
} from "./content";
import Trame from "./Trame";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const H2 =
  "text-3xl leading-[1.12] font-medium tracking-tight text-balance md:text-[2.75rem]";
const BTN =
  "inline-flex items-center justify-center rounded-xl px-5 py-3 font-medium transition-colors";
const BTN_DARK = `${BTN} bg-ink text-white hover:-translate-y-0.5 hover:bg-brand active:translate-y-0`;
const BTN_LIGHT = `${BTN} border border-line bg-white hover:border-ink`;
const WRAP = "mx-auto w-full max-w-6xl px-4 sm:px-6";
const SECTION = "py-20 md:py-28";

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
            <Manual t={t} />
            <Platform t={t} />
            <Steering t={t} />
            <Stakeholders t={t} />
            <Security t={t} />
            <Onboarding t={t} />
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
  alt,
  focus = "0% 0%",
  className = "",
  ratio = "aspect-[16/10]",
  eager = false,
}: {
  src: string;
  alt: string;
  focus?: string;
  className?: string;
  ratio?: string;
  eager?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl bg-white shadow-[0_30px_90px_-35px_rgba(4,24,43,0.45)] ring-1 ring-ink/5 ${className}`}
    >
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        style={{ objectPosition: focus }}
        className={`${ratio} w-full object-cover`}
      />
    </div>
  );
}

function Hero({ t }: { t: Copy }) {
  const h = t.hero;
  return (
    <section className="relative overflow-hidden">
      <div className={`${WRAP} relative z-10 pt-14 lg:pt-24`}>
        <div className="lg:max-w-[34rem]">
          <h1 className="text-[clamp(2.5rem,5.2vw,4.4rem)] leading-[1.04] font-medium tracking-[-0.035em] text-balance">
            {h.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-mute md:text-xl lg:max-w-[27rem]">
            {h.lead}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#demo" className={BTN_DARK}>
              {h.primary}
            </a>
            <a href="#plateforme" className={BTN_LIGHT}>
              {h.secondary}
            </a>
          </div>
          <p className="mt-6 text-sm text-mute">{h.note}</p>
        </div>
      </div>
      <Trame
        variant="cycle"
        label={h.sceneAlt}
        labels={h.scene}
        className="h-[26rem] w-full lg:absolute lg:-top-12 lg:-right-10 lg:h-[50rem] lg:w-[62%]"
      />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6">
        <Screen
          src={h.screen}
          alt={h.screenAlt}
          className="rounded-b-none [mask-image:linear-gradient(#000_55%,transparent)] lg:mt-20"
          ratio="aspect-[16/8]"
          eager
        />
      </div>
    </section>
  );
}

function Manual({ t }: { t: Copy }) {
  const m = t.manual;
  return (
    <section className={SECTION}>
      <div className={WRAP}>
        <h2 className={`${H2} max-w-3xl`}>{m.title}</h2>
        <div className="mt-12 hidden grid-cols-2 gap-x-12 text-sm text-mute md:grid">
          <p>{m.before}</p>
          <p>{m.after}</p>
        </div>
        <ul className="mt-4 border-b border-line">
          {m.rows.map(([before, after]) => (
            <li
              key={before}
              className="grid gap-x-12 gap-y-2 border-t border-line py-6 text-lg md:grid-cols-2 md:py-7 md:text-xl"
            >
              <p className="text-mute">{before}</p>
              <p className="flex items-baseline gap-3 font-medium">
                <Cube />
                {after}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Platform({ t }: { t: Copy }) {
  const p = t.platform;
  const [active, setActive] = useState(0);
  return (
    <section id="plateforme" className={`${SECTION} overflow-hidden`}>
      <div className={WRAP}>
        <h2 className={`${H2} max-w-3xl`}>{p.title}</h2>
        <div
          role="tablist"
          className="mt-10 flex flex-wrap gap-x-9 gap-y-2 border-b border-line"
        >
          {p.features.map((f, i) => (
            <button
              key={f.name}
              type="button"
              role="tab"
              id={`tab-${i}`}
              aria-selected={i === active}
              aria-controls={`panel-${i}`}
              onClick={() => setActive(i)}
              className={`-mb-px border-b-2 pb-3 text-lg font-medium ${i === active ? "border-brand text-ink" : "border-transparent text-mute hover:text-ink"}`}
            >
              {f.name}
            </button>
          ))}
        </div>
        {p.features.map((f, i) => (
          <article
            key={f.name}
            role="tabpanel"
            id={`panel-${i}`}
            aria-labelledby={`tab-${i}`}
            hidden={i !== active}
            className="mt-12 grid items-center gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-14"
          >
            <div>
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
            <Screen
              src={f.screen}
              alt={f.title}
              focus={f.focus}
              className="lg:w-[125%]"
            />
          </article>
        ))}
      </div>
    </section>
  );
}

function Steering({ t }: { t: Copy }) {
  const s = t.steering;
  return (
    <section id="pilotage" className={SECTION}>
      <div className={`${WRAP} grid gap-12 lg:grid-cols-2 lg:gap-20`}>
        <div>
          <h2 className={H2}>{s.title}</h2>
          <p className="mt-6 max-w-lg text-lg text-mute">{s.text}</p>
        </div>
        <dl>
          {s.items.map(([title, text]) => (
            <div
              key={title}
              className="flex gap-4 border-t border-line py-6 last:border-b"
            >
              <Cube className="mt-2 bg-brand" />
              <div>
                <dt className="text-xl font-medium tracking-tight">{title}</dt>
                <dd className="mt-2 text-mute">{text}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Stakeholders({ t }: { t: Copy }) {
  const s = t.stakeholders;
  return (
    <section className="border-t border-line py-20 md:py-28">
      <div className={WRAP}>
        <h2 className={H2}>{s.title}</h2>
        <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {s.items.map(([who, text]) => (
            <li key={who} className="border-t border-ink pt-6">
              <h3 className="text-xl font-medium tracking-tight">{who}</h3>
              <p className="mt-3 text-mute">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Onboarding({ t }: { t: Copy }) {
  const j = t.onboarding;
  return (
    <section id="mise-en-place" className={SECTION}>
      <div className={WRAP}>
        <h2 className={`${H2} max-w-3xl`}>{j.title}</h2>
        <ol className="mt-14 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {j.steps.map(([name, text], i) => (
            <li key={name}>
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
              <p className="mt-5 text-sm text-mute">
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
    <section id="securite" className={`${SECTION} border-t border-line`}>
      <div className={`${WRAP} grid gap-12 lg:grid-cols-[2fr_3fr] lg:gap-20`}>
        <h2 className={`${H2} lg:sticky lg:top-28 lg:self-start`}>{s.title}</h2>
        <dl className="grid gap-x-10 sm:grid-cols-2">
          {s.cards.map(([title, text]) => (
            <div key={title} className="border-t border-ink/15 py-7">
              <dt className="text-xl font-medium tracking-tight">{title}</dt>
              <dd className="mt-3 text-mute">{text}</dd>
            </div>
          ))}
        </dl>
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
      if (response.ok) {
        (window as { umami?: { track: (event: string) => void } }).umami?.track(
          "demande-demo",
        );
      }
    } catch {
      setState("error");
    }
  };

  return (
    <section id="demo" className={`${SECTION} bg-tint`}>
      <div className={`${WRAP} grid gap-12 md:grid-cols-2 md:gap-20`}>
        <div>
          <h2 className={H2}>{d.title}</h2>
          <p className="mt-6 max-w-md text-lg text-mute">{d.text}</p>
          <Trame
            variant="logo"
            label={d.sceneAlt}
            className="mt-6 hidden h-64 max-w-sm md:block"
          />
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
            className="grid gap-4 self-start sm:grid-cols-2"
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
          <h2 className="text-xl font-medium tracking-tight">{title}</h2>
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
          <p>© Etepea. {f.rights}</p>
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
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(!localStorage.getItem(NOTICE_KEY)), []);
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
