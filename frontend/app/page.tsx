import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ClipboardCheck,
  GitBranch,
  Map,
  MessagesSquare,
  Network,
  Sparkles,
} from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { CountUp } from "@/components/marketing/count-up";
import { HeroGraph } from "@/components/marketing/hero-graph";
import { Reveal, WordReveal } from "@/components/marketing/reveal";
import { ScrollProgress } from "@/components/marketing/scroll-progress";
import { SpotlightCard } from "@/components/marketing/spotlight-card";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/session";

export const metadata = {
  title: "SkillForge — from where you are to the role you want",
  description:
    "Assess what you actually know, see the gap to a target technology role, and get a roadmap that is computed, not guessed.",
};

/**
 * Public, and the only page that is. It renders the same whether or not the
 * gateway is up — a marketing page that 500s because a backend is restarting
 * is worse than one that assumes the visitor is signed out.
 */
async function signedIn(): Promise<boolean> {
  try {
    return (await getSessionUser()) !== null;
  } catch {
    return false;
  }
}

const STEPS = [
  {
    icon: ClipboardCheck,
    title: "Sit an assessment",
    body: "Fifteen sittings across eight areas, scored per skill rather than one overall mark. That breakdown is the input to everything below.",
  },
  {
    icon: Network,
    title: "See the gap",
    body: "Your target role's required skills as a prerequisite graph, each node coloured by what you have actually demonstrated.",
  },
  {
    icon: Map,
    title: "Get the roadmap",
    body: "The gap subgraph, topologically layered into phases. Order comes from the prerequisites, never from a model's opinion.",
  },
];

const FEATURES = [
  {
    icon: Network,
    title: "Skill Graph",
    body: "A prerequisite DAG over the whole tech taxonomy. Expand any node to see what it depends on.",
  },
  {
    icon: GitBranch,
    title: "Skill Tree",
    body: "The same data read as a tree, with you at the root — categories, subcategories, and every skill under them.",
  },
  {
    icon: ClipboardCheck,
    title: "Spaced repetition",
    body: "Every assessment result starts an FSRS schedule per skill, so proficiency decays the way memory does — and tells you when to come back.",
  },
  {
    icon: MessagesSquare,
    title: "Grounded assistant",
    accent: true,
    body: "Retrieval over a curated corpus, answers cited back to their source. Ask it what to learn next and why.",
  },
  {
    icon: Bot,
    title: "Career agent",
    accent: true,
    body: "Six tools over your real profile — it reads your skills, gaps and target role before it says anything.",
  },
  {
    icon: Map,
    title: "Computed, not guessed",
    body: "Phases come from a topological sort in the analyzer. The model writes the narration around them, nothing more.",
  },
];

const FIGURES: [number, string][] = [
  [124, "skills mapped"],
  [144, "prerequisite edges"],
  [15, "assessments"],
  [6, "agent tools"],
];

const MASTERY: [string, string][] = [
  ["Mastered", "bg-mastery-mastered-ring"],
  ["In progress", "bg-mastery-progress-ring"],
  ["Gap", "bg-mastery-gap-ring"],
  ["Locked", "bg-mastery-locked-ring"],
];

export default async function Home() {
  const authed = await signedIn();

  return (
    <div className="flex min-h-svh flex-col">
      <ScrollProgress />

      <header
        id="site-header"
        className="border-border/60 sticky top-0 z-40 border-b transition-shadow duration-300 [&[data-scrolled]]:shadow-sm"
      >
        <div className="bg-background/80 supports-[backdrop-filter]:bg-background/60 absolute inset-0 backdrop-blur-md" />
        <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <span className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md transition-transform duration-300 hover:rotate-12">
              <Sparkles className="size-4" />
            </span>
            <span className="font-heading text-lg font-semibold tracking-tight">
              SkillForge
            </span>
          </span>

          <nav className="flex items-center gap-2">
            <ThemeToggle showLabel={false} className="sm:hidden" />
            <ThemeToggle className="hidden sm:inline-flex" />
            {authed ? (
              <Button size="lg" className="sheen relative overflow-hidden" asChild>
                <Link href="/dashboard">
                  Open dashboard
                  <ArrowRight
                    data-icon="inline-end"
                    className="transition-transform duration-300 group-hover/button:translate-x-0.5"
                  />
                </Link>
              </Button>
            ) : (
              <>
                {/* Below `sm` the row is logo, theme and one call to
                    action. Sign in is still in the footer and one tap from
                    the register page. */}
                <Button variant="ghost" size="lg" className="hidden sm:inline-flex" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button size="lg" className="sheen relative overflow-hidden" asChild>
                  <Link href="/register">Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b">
          {/* Two soft washes behind the hero — the teal is the ring colour and
              the gold is --ai, the same pairing the graph views use. They
              drift on a half-minute cycle: slow enough that it reads as light
              rather than as movement. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="drift absolute inset-0 opacity-70 dark:opacity-25 [background:radial-gradient(60rem_28rem_at_15%_-10%,var(--color-teal-100),transparent_60%)]" />
            <div className="drift-slow absolute inset-0 opacity-70 [background:radial-gradient(45rem_24rem_at_92%_0%,var(--color-ai-dim),transparent_65%)]" />
          </div>

          <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
            <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]">
              <div>
                <Reveal>
                  <p className="border-border-strong/40 bg-card/60 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
                    <span className="bg-ai size-1.5 animate-pulse rounded-full" />
                    For students heading into technology
                  </p>
                </Reveal>

                <h1 className="mt-6 max-w-3xl text-4xl leading-[1.05] font-semibold text-balance sm:text-6xl">
                  <WordReveal
                    text="From where you are to the"
                    highlight="role you want."
                    highlightClassName="from-teal-700 via-teal-600 to-ai bg-linear-to-br bg-clip-text text-transparent dark:from-teal-300 dark:via-teal-400"
                  />
                </h1>

                <Reveal delay={420}>
                  <p className="text-muted-foreground mt-6 max-w-2xl text-lg text-pretty">
                    SkillForge measures what you actually know, maps it against
                    the role you are aiming at, and lays the difference out as
                    an ordered plan — with the prerequisites respected, because
                    a graph decides the order, not a language model.
                  </p>
                </Reveal>

                <Reveal delay={540}>
                  <div className="mt-9 flex flex-wrap items-center gap-3">
                    <Button
                      size="lg"
                      className="sheen relative h-11 overflow-hidden px-5 text-base"
                      asChild
                    >
                      <Link href={authed ? "/dashboard" : "/register"}>
                        {authed ? "Open dashboard" : "Create your account"}
                        <ArrowRight data-icon="inline-end" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-11 px-5 text-base"
                      asChild
                    >
                      <Link href={authed ? "/assessments" : "/login"}>
                        {authed ? "Take an assessment" : "Sign in"}
                      </Link>
                    </Button>
                  </div>
                </Reveal>
              </div>

              {/* The claim above, demonstrated. Same four mastery colours and
                  the same layering rule the app itself uses. */}
              <Reveal delay={200} className="hidden sm:block lg:pl-4">
                <HeroGraph />
                <p className="text-muted-foreground mt-4 text-center text-xs">
                  Two gaps, one still locked behind them. This is the graph, not
                  a picture of it.
                </p>
              </Reveal>
            </div>

            <dl className="mt-16 grid gap-8 border-t pt-10 sm:grid-cols-4">
              {FIGURES.map(([figure, label], i) => (
                <Reveal key={label} delay={i * 90}>
                  <dt className="font-mono text-4xl font-semibold tracking-tight tabular-nums">
                    <CountUp value={figure} />
                  </dt>
                  <dd className="text-muted-foreground mt-1 text-sm">{label}</dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
            <Reveal>
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Three steps, in this order
              </h2>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Each one reads the output of the last. Nothing here is a demo
                fixture — it is all your own rows.
              </p>
            </Reveal>

            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <Reveal as="li" key={step.title} delay={i * 110}>
                  <SpotlightCard className="group/step h-full p-6">
                    <span className="font-mono text-sm font-medium text-teal-600 tabular-nums dark:text-teal-400">
                      0{i + 1}
                    </span>
                    <step.icon className="text-foreground mt-4 size-5 transition-transform duration-300 group-hover/step:-translate-y-0.5 group-hover/step:scale-110" />
                    <h3 className="mt-3 text-base font-semibold">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground mt-2 text-sm text-pretty">
                      {step.body}
                    </p>
                  </SpotlightCard>
                </Reveal>
              ))}
            </ol>

            {/* The mastery language, learned once and used in all three views. */}
            <Reveal delay={120}>
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-dashed px-5 py-4 text-sm">
                <span className="text-muted-foreground">
                  Every node, everywhere, is one of four states:
                </span>
                {MASTERY.map(([label, dot], i) => (
                  <span
                    key={label}
                    className="group/state flex items-center gap-2"
                  >
                    <span
                      className={`size-2 rounded-full transition-transform duration-300 group-hover/state:scale-150 ${dot}`}
                      style={{ transitionDelay: `${i * 20}ms` }}
                    />
                    <span className="font-medium">{label}</span>
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section>
          <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
            <Reveal>
              <h2 className="text-2xl font-semibold sm:text-3xl">
                What is inside
              </h2>
            </Reveal>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, i) => (
                <Reveal key={feature.title} delay={(i % 3) * 90}>
                  <SpotlightCard className="group/feature h-full p-6">
                    <feature.icon
                      className={`size-5 transition-transform duration-300 group-hover/feature:-translate-y-0.5 group-hover/feature:scale-110 ${
                        feature.accent ? "text-ai" : "text-foreground"
                      }`}
                    />
                    <h3 className="mt-3 text-base font-semibold">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground mt-2 text-sm text-pretty">
                      {feature.body}
                    </p>
                  </SpotlightCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-t">
          <div
            aria-hidden
            className="drift pointer-events-none absolute inset-0 -z-10 opacity-50 dark:opacity-15 [background:radial-gradient(38rem_20rem_at_50%_120%,var(--color-teal-100),transparent_65%)]"
          />
          <div className="mx-auto w-full max-w-6xl px-6 py-16 text-center sm:py-20">
            <Reveal>
              <h2 className="text-2xl font-semibold text-balance sm:text-3xl">
                Find out what you are actually missing
              </h2>
              <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-pretty">
                Registration takes a minute, and the first assessment is ten
                questions.
              </p>
              <Button
                size="lg"
                className="sheen relative mt-8 h-11 overflow-hidden px-5 text-base"
                asChild
              >
                <Link href={authed ? "/assessments" : "/register"}>
                  {authed ? "Take an assessment" : "Get started"}
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm">
          <span>SkillForge</span>
          <span className="flex items-center gap-4">
            {[
              ["/privacy", "Privacy"],
              ["/terms", "Terms"],
              ["/login", "Sign in"],
              ["/register", "Register"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="hover:text-foreground relative transition-colors after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-0 after:bg-current after:transition-[width] after:duration-300 hover:after:w-full"
              >
                {label}
              </Link>
            ))}
          </span>
        </div>
      </footer>
    </div>
  );
}
