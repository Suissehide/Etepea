import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useState } from "react";
import {
  CONTACT_EMAIL,
  CONTENT,
  IMAGES,
  type Lang,
  stepImage,
} from "./content";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Copy = (typeof CONTENT)["fr"];

const MOTION = "(prefers-reduced-motion: no-preference)";
const mailto = (subject: string) =>
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
const photo = "grayscale contrast-125 opacity-90";

export default function App({ lang }: { lang: Lang }) {
  const t = CONTENT[lang];
  return (
    <main className="w-full max-w-full overflow-x-hidden">
      <Nav t={t} lang={lang} />
      <Hero t={t} />
      <Manifesto text={t.manifesto} />
      <Platform t={t} />
      <Journey t={t} />
      <Stack t={t} />
      <Roles t={t} />
      <Cta t={t} />
      <Footer t={t} />
    </main>
  );
}

function Nav({ t, lang }: { t: Copy; lang: Lang }) {
  const other = lang === "fr" ? "en" : "fr";
  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav className="flex w-full max-w-4xl items-center gap-2 rounded-full border border-white/10 bg-ink/60 py-2 pr-2 pl-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <a
          href={`/${lang}/`}
          className="mr-auto flex items-center gap-2 font-semibold tracking-tight"
        >
          <LogoMark />
          etepea
        </a>
        <div className="hidden items-center md:flex">
          {t.nav.links.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-full px-4 py-2 text-sm text-white/70 transition-colors hover:text-white"
            >
              {label}
            </a>
          ))}
        </div>
        <a
          href={`/${other}/`}
          hrefLang={other}
          className="rounded-full px-3 py-2 text-sm font-medium text-white/70 uppercase transition-colors hover:text-white"
        >
          {other}
        </a>
        <a
          href={mailto(t.nav.cta)}
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-brand-light hover:text-white"
        >
          {t.nav.cta}
        </a>
      </nav>
    </header>
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

function LogoMark() {
  return (
    <svg viewBox="0 0 47 47" aria-hidden="true" className="size-4 shrink-0">
      {FAINT.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="13"
          height="13"
          rx="3"
          fill="currentColor"
          opacity="0.22"
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
        className="fill-brand-light"
      />
    </svg>
  );
}

function Hero({ t }: { t: Copy }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION, () => {
        gsap
          .timeline({ defaults: { ease: "expo.out", duration: 1.4 } })
          .from(".hero-bg", { scale: 1.15, duration: 2.4 })
          .from(".hero-in", { y: 40, opacity: 0, stagger: 0.12 }, "<0.2");
        gsap.to(".hero-bg", {
          yPercent: 12,
          ease: "none",
          scrollTrigger: {
            trigger: ref.current,
            start: "top top",
            scrub: true,
          },
        });
      });
    },
    { scope: ref },
  );
  return (
    <section
      ref={ref}
      className="grain relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 pt-28 pb-20"
    >
      <img
        src={IMAGES.hero}
        alt=""
        className={`hero-bg absolute inset-0 size-full object-cover ${photo}`}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(4,24,43,0.45)_0%,rgba(4,24,43,0.8)_70%,#04182b_100%)]" />
      <div className="absolute -bottom-40 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full bg-brand/30 blur-[120px]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center text-center">
        <h1 className="hero-in w-full text-[clamp(2.6rem,5.4vw,5.6rem)] leading-[1.02] font-medium tracking-tight text-balance">
          {t.hero.title}
        </h1>
        <p className="hero-in mt-8 max-w-2xl text-lg text-white/70 md:text-xl">
          {t.hero.lead}
        </p>
        <div className="hero-in mt-12 flex flex-col gap-3 sm:flex-row">
          <a
            href={mailto(t.hero.primary)}
            className="rounded-full bg-white px-8 py-4 font-medium text-ink transition-colors hover:bg-brand-light hover:text-white"
          >
            {t.hero.primary}
          </a>
          <a
            href="#plateforme"
            className="rounded-full border border-white/25 px-8 py-4 font-medium text-white transition-colors hover:bg-white/10"
          >
            {t.hero.secondary}
          </a>
        </div>
      </div>
    </section>
  );
}

function Manifesto({ text }: { text: string }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION, () => {
        gsap.fromTo(
          ".word",
          { opacity: 0.1 },
          {
            opacity: 1,
            stagger: 0.1,
            ease: "none",
            scrollTrigger: {
              trigger: ref.current,
              start: "top 70%",
              end: "bottom 45%",
              scrub: true,
            },
          },
        );
      });
    },
    { scope: ref },
  );
  return (
    <section ref={ref} className="px-4 py-32 md:py-48">
      <p className="mx-auto max-w-5xl text-[clamp(1.6rem,3vw,2.9rem)] leading-snug font-light tracking-tight">
        {[...text.matchAll(/\S+/g)].map((m) => (
          <span key={m.index} className="word">
            {m[0]}{" "}
          </span>
        ))}
      </p>
    </section>
  );
}

function Platform({ t }: { t: Copy }) {
  const c = t.bento.cards;
  return (
    <section
      id="plateforme"
      className="rounded-t-[2.5rem] bg-paper px-4 py-32 text-ink md:py-48"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-5xl text-[clamp(2.2rem,4.6vw,4.5rem)] leading-[1.08] font-medium tracking-tight">
          {t.inline.before}
          <Pill src={IMAGES.pillA} />
          {t.inline.middle}
          <Pill src={IMAGES.pillB} />
          {t.inline.after}
        </h2>
        <p className="mt-6 text-lg text-ink/60">{t.bento.title}</p>
        <div className="mt-16 grid grid-flow-dense auto-rows-[24rem] grid-cols-1 gap-4 md:grid-cols-3">
          <BentoCard
            className="md:col-span-2 md:row-span-2"
            src={IMAGES.planning}
            focus="62% 40%"
            {...c.planning}
            large
          />
          <BentoCard
            src={IMAGES.agenda}
            focus="70% 25%"
            zoom={1.9}
            {...c.agenda}
          />
          <BentoCard
            src={IMAGES.suivi}
            focus="35% 30%"
            zoom={1.9}
            {...c.suivi}
          />
          <BentoCard
            className="md:col-span-3"
            src={IMAGES.diagnostic}
            focus="60% 30%"
            {...c.diagnostic}
            wide
          />
        </div>
      </div>
    </section>
  );
}

function Pill({ src }: { src: string }) {
  return (
    <span
      className="mx-3 inline-block h-[0.8em] w-[1.9em] rounded-full bg-cover bg-center align-middle grayscale"
      style={{ backgroundImage: `url(${src})` }}
    />
  );
}

function BentoCard({
  title,
  text,
  src,
  focus,
  zoom = 1,
  className = "",
  large = false,
  wide = false,
}: {
  title: string;
  text: string;
  src: string;
  focus: string;
  zoom?: number;
  className?: string;
  large?: boolean;
  wide?: boolean;
}) {
  return (
    <article
      className={`group flex overflow-hidden rounded-3xl bg-ink text-white ${wide ? "flex-col md:flex-row" : "flex-col"} ${className}`}
    >
      <div
        className={`shrink-0 p-7 md:p-9 ${wide ? "md:w-2/5 md:self-center" : ""}`}
      >
        <h3
          className={`font-medium tracking-tight ${large ? "text-3xl md:text-4xl" : "text-2xl"}`}
        >
          {title}
        </h3>
        <p
          className={`mt-3 text-white/65 ${large ? "max-w-lg text-lg" : "max-w-md"}`}
        >
          {text}
        </p>
      </div>
      <div
        className={`relative min-h-0 flex-1 overflow-hidden rounded-tl-2xl border-t border-l border-white/10 bg-paper shadow-2xl ${wide ? "ml-7 md:mt-9 md:ml-0" : "ml-7 md:ml-9"}`}
      >
        <div
          className="absolute inset-0"
          style={{ transform: `scale(${zoom})`, transformOrigin: focus }}
        >
          <img
            src={src}
            alt=""
            loading="lazy"
            style={{ objectPosition: focus }}
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </div>
      </div>
    </article>
  );
}

function Journey({ t }: { t: Copy }) {
  const [active, setActive] = useState(0);
  return (
    <section id="parcours" className="relative px-4 py-32 md:py-48">
      <div className="absolute top-1/3 -left-40 h-[30rem] w-[30rem] rounded-full bg-brand/20 blur-[140px]" />
      <div className="relative mx-auto max-w-6xl">
        <h2 className="max-w-4xl text-[clamp(2.2rem,4.6vw,4.5rem)] leading-[1.08] font-medium tracking-tight">
          {t.journey.title}
        </h2>
        <div className="mt-16 flex flex-col gap-3 md:h-[34rem] md:flex-row">
          {t.journey.steps.map((step, i) => {
            const open = i === active;
            return (
              <button
                type="button"
                key={step.name}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                aria-expanded={open}
                className={`group relative h-80 overflow-hidden rounded-3xl text-left transition-[flex-grow] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] md:h-auto md:min-w-0 ${open ? "md:flex-[5]" : "md:flex-1"}`}
              >
                <img
                  src={stepImage(step.seed)}
                  alt=""
                  loading="lazy"
                  className={`absolute inset-0 size-full object-cover ${photo} transition-transform duration-700 ease-out group-hover:scale-105`}
                />
                <div
                  className={`absolute inset-0 transition-colors duration-700 ${open ? "bg-gradient-to-t from-ink via-ink/50 to-transparent" : "bg-ink/75"}`}
                />
                <div className="absolute inset-x-0 bottom-0 p-7">
                  <span className="text-sm text-brand-light tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3
                    className={`mt-1 text-2xl font-medium whitespace-nowrap ${open ? "" : "md:rotate-180 md:[writing-mode:vertical-rl]"}`}
                  >
                    {step.name}
                  </h3>
                  <p
                    className={`mt-3 max-w-sm text-white/75 transition-opacity duration-500 ${open ? "opacity-100 delay-300" : "opacity-100 md:opacity-0"}`}
                  >
                    {step.text}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Stack({ t }: { t: Copy }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION, () => {
        const cards = gsap.utils.toArray<HTMLElement>(".stack-card");
        cards.slice(0, -1).forEach((card, i) => {
          gsap.to(card, {
            scale: 0.92,
            opacity: 0.45,
            ease: "none",
            scrollTrigger: {
              trigger: cards[i + 1],
              start: "top bottom",
              end: "top 20%",
              scrub: true,
            },
          });
        });
      });
    },
    { scope: ref },
  );
  return (
    <section
      ref={ref}
      className="rounded-[2.5rem] bg-paper px-4 py-32 text-ink md:py-48"
    >
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1fr_1.3fr]">
        <h2 className="text-[clamp(2.2rem,4vw,4rem)] leading-[1.08] font-medium tracking-tight md:sticky md:top-32 md:self-start">
          {t.stack.title}
        </h2>
        <div className="flex flex-col gap-8">
          {t.stack.cards.map((card, i) => (
            <article
              key={card.title}
              className="stack-card sticky flex min-h-80 origin-top flex-col justify-between rounded-3xl border border-ink/5 bg-white p-9 shadow-xl shadow-ink/5 md:p-12"
              style={{ top: `${7 + i * 1.5}rem` }}
            >
              <span className="text-sm text-brand tabular-nums">
                {String(i + 1).padStart(2, "0")} /{" "}
                {String(t.stack.cards.length).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-3xl font-medium tracking-tight md:text-4xl">
                  {card.title}
                </h3>
                <p className="mt-4 max-w-md text-lg text-ink/60">{card.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Roles({ t }: { t: Copy }) {
  const ref = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const items = t.roles.items;
  const go = (step: number) =>
    setIndex((i) => (i + step + items.length) % items.length);

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION, () => {
        gsap.from(".role-text", { y: 24, opacity: 0, duration: 0.7 });
      });
    },
    { scope: ref, dependencies: [index] },
  );

  const current = items[index];
  return (
    <section id="equipes" ref={ref} className="px-4 py-32 md:py-48">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-[clamp(2.2rem,4.6vw,4.5rem)] leading-[1.08] font-medium tracking-tight">
          {t.roles.title}
        </h2>
        <div className="mt-16 grid items-center gap-12 md:grid-cols-[auto_1fr] md:gap-20">
          <div className="relative h-80 w-72 sm:w-96">
            {items.map((item, i) => {
              const offset = (i - index + items.length) % items.length;
              return (
                <img
                  key={item.role}
                  src={stepImage(item.seed)}
                  alt=""
                  className={`absolute top-0 h-80 w-56 rounded-3xl object-cover shadow-2xl shadow-black/40 transition-all duration-700 ease-out ${photo}`}
                  style={{
                    left: `${offset * 4.5}rem`,
                    zIndex: items.length - offset,
                    transform: `scale(${1 - offset * 0.08})`,
                    opacity: offset === 0 ? 1 : 0.5,
                  }}
                />
              );
            })}
          </div>
          <div>
            <div className="role-text" aria-live="polite">
              <p className="text-brand-light">{current.role}</p>
              <p className="mt-4 max-w-xl text-[clamp(1.5rem,2.6vw,2.4rem)] leading-snug font-light">
                {current.text}
              </p>
            </div>
            <div className="mt-10 flex gap-3">
              <Arrow label={t.roles.prev} onClick={() => go(-1)} flip />
              <Arrow label={t.roles.next} onClick={() => go(1)} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Arrow({
  label,
  onClick,
  flip = false,
}: {
  label: string;
  onClick: () => void;
  flip?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-12 place-items-center rounded-full border border-white/20 text-white transition-colors hover:bg-white hover:text-ink"
    >
      <svg
        viewBox="0 0 24 24"
        className={`size-5 ${flip ? "rotate-180" : ""}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  );
}

function Cta({ t }: { t: Copy }) {
  return (
    <section className="px-4 pb-32 md:pb-48">
      <div className="grain group relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] px-6 py-28 text-center md:py-40">
        <img
          src={IMAGES.cta}
          alt=""
          loading="lazy"
          className={`absolute inset-0 size-full object-cover ${photo} mix-blend-luminosity transition-transform duration-1000 ease-out group-hover:scale-105`}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-brand/90 via-ink/85 to-ink" />
        <div className="relative mx-auto max-w-5xl">
          <h2 className="text-[clamp(2.4rem,5.5vw,5.5rem)] leading-[1.02] font-medium tracking-tight text-balance">
            {t.cta.title}
          </h2>
          <p className="mt-6 text-lg text-white/75">{t.cta.text}</p>
          <a
            href={mailto(t.cta.button)}
            className="mt-12 inline-block rounded-full bg-white px-10 py-5 text-lg font-medium text-ink transition-colors hover:bg-ink hover:text-white"
          >
            {t.cta.button}
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer({ t }: { t: Copy }) {
  return (
    <footer className="border-t border-white/10 px-4 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 text-sm text-white/60 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-base font-semibold text-white">
            <LogoMark />
            etepea
          </p>
          <p className="mt-1">{t.footer.tagline}</p>
        </div>
        <div className="flex flex-wrap gap-6">
          {t.nav.links.map(([label, href]) => (
            <a key={href} href={href} className="hover:text-white">
              {label}
            </a>
          ))}
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">
            {t.footer.contact}
          </a>
        </div>
        <p>
          © {new Date().getFullYear()} Etepea. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
