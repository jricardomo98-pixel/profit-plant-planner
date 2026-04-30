import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Calculator, Sparkles, TrendingUp, Boxes } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-b from-primary-soft via-background to-background">
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

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <section className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
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
        </section>
      </main>
    </div>
  );
}
