import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Planos — Calculamus" },
      { name: "description", content: "Escolhe o plano certo para o teu negócio. Começa grátis ou faz upgrade para Pro com receitas ilimitadas." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-soft/30 via-background to-background">
      <header className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 md:px-6">
        <Link to="/app">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-lg font-bold leading-none">Planos e preços</h1>
          <p className="text-xs text-muted-foreground">Escolhe o que faz sentido para o teu negócio</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 md:px-6">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl font-bold md:text-5xl">Cresce sem limites</h2>
          <p className="mt-3 text-muted-foreground">Começa grátis. Faz upgrade quando precisares de mais.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="space-y-5 p-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Free</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-5xl font-bold">€0</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Para começar a estruturar os teus custos.</p>
            </div>

            <ul className="space-y-2 text-sm">
              <Feature>Até 3 receitas guardadas</Feature>
              <Feature>Calculadora de custos completa</Feature>
              <Feature>Encomendas e clientes</Feature>
              <Feature>Custos fixos e materiais</Feature>
            </ul>

            <Link to="/app" className="block">
              <Button variant="outline" className="w-full rounded-full">Continuar grátis</Button>
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
              <Feature><strong>Receitas ilimitadas</strong></Feature>
              <Feature>Tudo o que está no plano Free</Feature>
              <Feature>Suporte prioritário</Feature>
              <Feature>Acesso a novas funcionalidades</Feature>
            </ul>

            <Button className="w-full rounded-full" size="lg" disabled>
              Brevemente disponível
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Estamos a finalizar o pagamento. Contacta-nos para upgrade manual.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  );
}
