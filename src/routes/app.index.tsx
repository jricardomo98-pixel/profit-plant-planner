import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calculator,
  Wallet,
  Boxes,
  ClipboardList,
  Settings,
  TrendingUp,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { fmtEUR } from "@/lib/format";
import { VOCAB, type BusinessType } from "@/lib/business-types";

export const Route = createFileRoute("/app/")({ component: HomePage });

function HomePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any | null>(null);
  const [stats, setStats] = useState({
    fixedCosts: 0,
    ingredients: 0,
    pendingOrders: 0,
    monthRevenue: 0,
  });
  const [recentRecipes, setRecentRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const startMonth = new Date();
      startMonth.setDate(1);
      startMonth.setHours(0, 0, 0, 0);

      const [pRes, fcRes, ingRes, ordRes, recRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("fixed_costs").select("amount").eq("user_id", user.id),
        supabase.from("ingredients").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("orders").select("status,total_price,created_at").eq("user_id", user.id),
        supabase.from("recipes").select("id,name,total_cost,suggested_price,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
      ]);

      if (!alive) return;
      setProfile(pRes.data);
      const fixed = (fcRes.data ?? []).reduce((s, r: any) => s + Number(r.amount || 0), 0);
      const orders = ordRes.data ?? [];
      const pending = orders.filter((o: any) => o.status === "pendente").length;
      const monthRev = orders
        .filter((o: any) => new Date(o.created_at) >= startMonth)
        .reduce((s: number, o: any) => s + Number(o.total_price || 0), 0);

      setStats({
        fixedCosts: fixed,
        ingredients: ingRes.count ?? 0,
        pendingOrders: pending,
        monthRevenue: monthRev,
      });
      setRecentRecipes(recRes.data ?? []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const businessType = (profile?.business_type as BusinessType) || "outro";
  const vocab = VOCAB[businessType] ?? VOCAB.outro;
  const greeting = profile?.business_name || "Olá";

  const shortcuts: Array<{ to: string; label: string; desc: string; icon: any; primary?: boolean }> = [
    { to: "/app/calculator", label: "Calculadora", desc: `Calcular custo de ${vocab.recipe.toLowerCase()}`, icon: Calculator, primary: true },
    { to: "/app/orders", label: "Encomendas", desc: "Gerir encomendas e clientes", icon: ClipboardList },
    { to: "/app/ingredients", label: vocab.ingredients, desc: `Gerir ${vocab.ingredients.toLowerCase()} e preços`, icon: Boxes },
    { to: "/app/fixed-costs", label: "Custos fixos", desc: "Renda, luz, água…", icon: Wallet },
  ];

  return (
    <div className="space-y-6 pb-4">
      <section className="rounded-3xl border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Bem-vindo
            </span>
            <h1 className="mt-3 font-display text-2xl font-bold tracking-tight md:text-3xl">
              {greeting}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Aqui está um resumo do teu negócio.
            </p>
          </div>
          <Link to="/app/settings" className="hidden md:block">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Custos fixos / mês" value={loading ? "—" : fmtEUR(stats.fixedCosts)} icon={Wallet} />
          <StatCard label={vocab.ingredients} value={loading ? "—" : String(stats.ingredients)} icon={Boxes} />
          <StatCard label="Encomendas pendentes" value={loading ? "—" : String(stats.pendingOrders)} icon={ClipboardList} />
          <StatCard label="Receita do mês" value={loading ? "—" : fmtEUR(stats.monthRevenue)} icon={TrendingUp} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Atalhos</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {shortcuts.map((s) => (
            <Link key={s.to} to={s.to as any}>
              <Card className={`group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-md ${s.primary ? "border-primary/40 bg-primary-soft/40" : ""}`}>
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${s.primary ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display font-semibold">{s.label}</div>
                  <div className="truncate text-sm text-muted-foreground">{s.desc}</div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Receitas recentes</h2>
          <Link to="/app/calculator" className="text-sm font-medium text-primary hover:underline">
            Nova
          </Link>
        </div>
        {loading ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">A carregar…</Card>
        ) : recentRecipes.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Ainda não guardaste nenhuma receita.</p>
            <Link to="/app/calculator">
              <Button className="mt-3 rounded-full" size="sm">
                <Calculator className="mr-1.5 h-4 w-4" /> Abrir calculadora
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-2">
            {recentRecipes.map((r) => (
              <Card key={r.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Custo {fmtEUR(Number(r.total_cost || 0))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-base font-bold text-primary">
                    {fmtEUR(Number(r.suggested_price || 0))}
                  </div>
                  <div className="text-[11px] text-muted-foreground">preço sugerido</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-2xl border bg-background/60 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-1 font-display text-lg font-bold">{value}</div>
    </div>
  );
}
