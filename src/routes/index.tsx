import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Calculator,
  Sparkles,
  TrendingUp,
  Boxes,
  AlertCircle,
  Clock,
  TrendingDown,
  Check,
  Quote,
  ArrowRight,
} from "lucide-react";
import dashboardImg from "@/assets/dashboard.png.asset.json";
import calculadoraImg from "@/assets/calculadora.png.asset.json";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <Calculator className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">Calculamus</span>
        </div>
        <Link to="/auth">
          <Button variant="ghost" size="sm">Entrar</Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-primary-soft via-background to-background">
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-10">
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Para pequenos negócios
              </span>
              <h1 className="mt-5 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
                Sabe quanto custa.<br />
                <span className="text-primary">Cobra o que vale.</span>
              </h1>
              <p className="mt-5 max-w-md text-lg text-muted-foreground">
                Calcula o custo real de cada produto — ingredientes, mão-de-obra, máquina e custos fixos —
                e descobre o preço justo para o teu negócio.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/auth">
                  <Button size="lg" className="rounded-full px-7 shadow-[var(--shadow-glow)]">
                    Começar grátis
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="rounded-full px-7">
                    Já tenho conta
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid gap-3">
              {[
                { icon: Boxes, title: "Custos fixos & ingredientes", text: "Renda, luz, materiais — tudo num sítio." },
                { icon: Calculator, title: "Mão-de-obra vs máquina", text: "Distingue tempo ativo e tempo de forno/máquina." },
                { icon: Sparkles, title: "Assistente IA", text: "Sugere o custo da decoração por ti." },
                { icon: TrendingUp, title: "Encomendas & lucro", text: "Aplica margem e recebe o preço final." },
              ].map((f) => (
                <div key={f.title} className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-primary-soft p-2.5 text-primary">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-semibold">{f.title}</h3>
                      <p className="text-sm text-muted-foreground">{f.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Ainda fazes orçamentos a olho?
          </h2>
          <p className="mt-3 text-muted-foreground">Soa-te familiar?</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: AlertCircle, text: "Não sabes ao certo quanto custa cada bolo" },
            { icon: Clock, text: "Perdes tempo a calcular preços manualmente" },
            { icon: TrendingDown, text: "No fim do mês, o lucro não bate certo" },
          ].map((p) => (
            <div key={p.text} className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <p.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-medium leading-snug">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-primary-soft/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Como funciona</h2>
            <p className="mt-3 text-muted-foreground">Em três passos simples.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { n: "1", title: "Adiciona os teus ingredientes e custos fixos", text: "Renda, luz, água, materiais. Tudo no sítio certo." },
              { n: "2", title: "Cria as tuas receitas na calculadora", text: "Quantidades, tempos e decoração — sabes o custo real." },
              { n: "3", title: "Gera encomendas e recebe o preço final com lucro incluído", text: "Aplica margem e tens o preço justo num clique." },
            ].map((s) => (
              <div key={s.n} className="relative rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary font-display text-xl font-bold text-primary-foreground shadow-[var(--shadow-glow)]">
                  {s.n}
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold leading-snug">Passo {s.n}: {s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Vê a app em ação</h2>
          <p className="mt-3 text-muted-foreground">Uma interface pensada para quem produz, não para contabilistas.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {[
            { src: dashboardImg.url, alt: "Dashboard do Calculamus", title: "Dashboard" },
            { src: calculadoraImg.url, alt: "Calculadora de custos", title: "Calculadora" },
          ].map((s) => (
            <div key={s.title} className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-lg">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b bg-muted/60 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-destructive/70" />
                <span className="h-3 w-3 rounded-full bg-warning/80" />
                <span className="h-3 w-3 rounded-full bg-success/80" />
                <div className="ml-3 hidden h-5 flex-1 rounded-md bg-background/80 sm:block" />
              </div>
              <div className="bg-primary-soft/20">
                <img
                  src={s.src}
                  alt={s.alt}
                  loading="lazy"
                  className="block h-auto w-full"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-primary-soft/40">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <Card className="relative overflow-hidden p-8 md:p-12">
            <Quote className="absolute right-6 top-6 h-16 w-16 text-primary/10" />
            <p className="font-display text-2xl font-medium leading-snug md:text-3xl">
              “Tornou-se muito mais fácil, intuitivo e rápido de fazer orçamentos.”
            </p>
            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary font-display text-lg font-bold text-primary-foreground">
                C
              </div>
              <div>
                <p className="font-semibold">Célia</p>
                <p className="text-sm text-muted-foreground">Dan&apos;s Bakery, Fermentelos</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Preços simples, sem surpresas
          </h2>
          <p className="mt-3 text-muted-foreground">Começa grátis. Faz upgrade quando precisares.</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Card className="space-y-5 p-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Grátis</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-5xl font-bold">€0</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Para começar a estruturar os teus custos.</p>
            </div>
            <ul className="space-y-2 text-sm">
              <PricingItem>Até 3 receitas guardadas</PricingItem>
              <PricingItem>Funcionalidades base</PricingItem>
              <PricingItem>Custos fixos e ingredientes</PricingItem>
            </ul>
            <Link to="/auth" className="block">
              <Button variant="outline" className="w-full rounded-full">Começar grátis</Button>
            </Link>
          </Card>

          <Card className="relative space-y-5 overflow-hidden border-primary p-7 shadow-lg">
            <div className="absolute right-5 top-5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              Recomendado
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Pro
              </p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-5xl font-bold">€9,99</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Para profissionais que querem escalar.</p>
            </div>
            <ul className="space-y-2 text-sm">
              <PricingItem><strong>Receitas ilimitadas</strong></PricingItem>
              <PricingItem>Encomendas</PricingItem>
              <PricingItem>Dashboard completo</PricingItem>
            </ul>
            <Link to="/auth" className="block">
              <Button className="w-full rounded-full" size="lg">Upgrade para Pro</Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 px-8 py-14 text-center shadow-[var(--shadow-glow)] md:py-20">
          <h2 className="font-display text-3xl font-bold tracking-tight text-primary-foreground md:text-5xl">
            Pronto para saber o que vale o teu trabalho?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/90">
            Junta-te a quem já cobra com confiança.
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="rounded-full px-8 text-base">
                Começar grátis <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Calculator className="h-3.5 w-3.5" />
            </div>
            <span className="font-display font-semibold">Calculamus</span>
          </div>
          <p>© {new Date().getFullYear()} Calculamus. Feito para pequenos negócios.</p>
        </div>
      </footer>
    </div>
  );
}

function PricingItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  );
}
