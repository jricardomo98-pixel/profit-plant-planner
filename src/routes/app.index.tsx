import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  BarChart3,
  CheckCircle2,
  Circle,
  Target,
} from "lucide-react";
import { fmtEUR } from "@/lib/format";
import { VOCAB, type BusinessType } from "@/lib/business-types";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/app/")({ component: HomePage });

type RecipeRow = {
  id: string;
  name: string;
  total_cost: number;
  suggested_price: number;
  labor_cost: number;
  machine_cost: number;
  ingredient_cost: number;
  fixed_cost_share: number;
  created_at: string;
};

type OrderRow = {
  status: string;
  total_price: number;
  total_cost: number;
  decoration_cost: number;
  created_at: string;
};

function HomePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any | null>(null);
  const [stats, setStats] = useState({
    fixedCosts: 0,
    ingredients: 0,
    pendingOrders: 0,
    monthRevenue: 0,
  });
  const [recentRecipes, setRecentRecipes] = useState<RecipeRow[]>([]);
  const [allRecipes, setAllRecipes] = useState<RecipeRow[]>([]);
  const [allOrders, setAllOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const startMonth = new Date();
      startMonth.setDate(1);
      startMonth.setHours(0, 0, 0, 0);

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);

      const [pRes, fcRes, ingRes, ordRes, recRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("fixed_costs").select("amount").eq("user_id", user.id),
        supabase.from("ingredients").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase
          .from("orders")
          .select("status,total_price,total_cost,decoration_cost,created_at")
          .eq("user_id", user.id)
          .gte("created_at", sixMonthsAgo.toISOString()),
        supabase
          .from("recipes")
          .select("id,name,total_cost,suggested_price,labor_cost,machine_cost,ingredient_cost,fixed_cost_share,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (!alive) return;
      setProfile(pRes.data);
      const fixed = (fcRes.data ?? []).reduce((s, r: any) => s + Number(r.amount || 0), 0);
      const orders = (ordRes.data ?? []) as OrderRow[];
      const recipes = (recRes.data ?? []) as RecipeRow[];
      const pending = orders.filter((o) => o.status === "pendente").length;
      const monthRev = orders
        .filter((o) => new Date(o.created_at) >= startMonth)
        .reduce((s, o) => s + Number(o.total_price || 0), 0);

      setStats({
        fixedCosts: fixed,
        ingredients: ingRes.count ?? 0,
        pendingOrders: pending,
        monthRevenue: monthRev,
      });
      setAllOrders(orders);
      setAllRecipes(recipes);
      setRecentRecipes(recipes.slice(0, 3));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const businessType = (profile?.business_type as BusinessType) || "outro";
  const vocab = VOCAB[businessType] ?? VOCAB.outro;
  const greeting = profile?.business_name || "Olá";

  const revenueData = useMemo(() => {
    const months: { key: string; label: string; receita: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = d.toLocaleDateString("pt-PT", { month: "short" });
      months.push({ key, label, receita: 0 });
    }
    for (const o of allOrders) {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find((x) => x.key === key);
      if (m) m.receita += Number(o.total_price || 0);
    }
    return months;
  }, [allOrders]);

  const costBreakdownData = useMemo(() => {
    return allRecipes
      .slice(0, 6)
      .reverse()
      .map((r) => ({
        name: r.name.length > 14 ? r.name.slice(0, 13) + "…" : r.name,
        "Mão-de-obra": Number(r.labor_cost || 0),
        Máquina: Number(r.machine_cost || 0),
        [vocab.ingredients]: Number(r.ingredient_cost || 0),
        "Custos fixos": Number(r.fixed_cost_share || 0),
      }));
  }, [allRecipes, vocab.ingredients]);

  const hasRevenue = revenueData.some((m) => m.receita > 0);
  const hasRecipes = costBreakdownData.length > 0;


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

        <BreakEvenCard
          loading={loading}
          fixedCosts={stats.fixedCosts}
          monthRevenue={stats.monthRevenue}
          profitMargin={Number(profile?.profit_margin ?? 0)}
          monthlyWorkHours={Number(profile?.monthly_work_hours ?? 0)}
        />
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

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-primary-soft p-2 text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold">Receita mensal</h3>
              <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
            </div>
          </div>
          {loading ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">A carregar…</div>
          ) : !hasRevenue ? (
            <OnboardingSteps
              title="Cria a tua primeira encomenda"
              subtitle="Em 2 passos vês a evolução das tuas vendas aqui."
              steps={[
                {
                  done: stats.ingredients > 0,
                  label: `Adiciona ${vocab.ingredients.toLowerCase()}`,
                  to: "/app/ingredients",
                  cta: "Adicionar",
                },
                {
                  done: false,
                  label: "Regista a primeira encomenda",
                  to: "/app/orders",
                  cta: "Nova encomenda",
                  primary: true,
                },
              ]}
            />
          ) : (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickFormatter={(v) => `${v}€`} tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" width={48} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                    formatter={(v: any) => fmtEUR(Number(v))}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="receita" name="Receita" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#revFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-primary-soft p-2 text-primary">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold">Quebra de custos por receita</h3>
              <p className="text-xs text-muted-foreground">Últimas {costBreakdownData.length || 6} guardadas</p>
            </div>
          </div>
          {loading ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">A carregar…</div>
          ) : !hasRecipes ? (
            <OnboardingSteps
              title="Cria a tua primeira receita"
              subtitle="Vê de onde vem cada euro de custo nas tuas receitas."
              steps={[
                {
                  done: stats.fixedCosts > 0,
                  label: "Define os custos fixos mensais",
                  to: "/app/fixed-costs",
                  cta: "Adicionar",
                },
                {
                  done: stats.ingredients > 0,
                  label: `Adiciona ${vocab.ingredients.toLowerCase()}`,
                  to: "/app/ingredients",
                  cta: "Adicionar",
                },
                {
                  done: false,
                  label: `Calcula a primeira ${vocab.recipe.toLowerCase()}`,
                  to: "/app/calculator",
                  cta: "Calcular",
                  primary: true,
                },
              ]}
            />
          ) : (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costBreakdownData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} stroke="hsl(var(--muted-foreground))" interval={0} />
                  <YAxis tickFormatter={(v) => `${v}€`} tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" width={48} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                    formatter={(v: any) => fmtEUR(Number(v))}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                  <Bar dataKey="Mão-de-obra" stackId="c" fill="hsl(var(--primary))" />
                  <Bar dataKey="Máquina" stackId="c" fill="hsl(var(--primary) / 0.65)" />
                  <Bar dataKey={vocab.ingredients} stackId="c" fill="hsl(var(--primary) / 0.4)" />
                  <Bar dataKey="Custos fixos" stackId="c" fill="hsl(var(--muted-foreground) / 0.4)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
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

function BreakEvenCard({
  loading,
  fixedCosts,
  monthRevenue,
  profitMargin,
  monthlyWorkHours,
}: {
  loading: boolean;
  fixedCosts: number;
  monthRevenue: number;
  profitMargin: number;
  monthlyWorkHours: number;
}) {
  const margin = profitMargin > 0 ? profitMargin : 30;
  const breakEven = margin > 0 ? fixedCosts / (margin / 100) : 0;
  const workDays = Math.max(1, Math.round((monthlyWorkHours || 0) / 8));
  const perDay = breakEven / workDays;
  const reached = monthRevenue >= breakEven && breakEven > 0;
  const remaining = Math.max(0, breakEven - monthRevenue);
  const progress = breakEven > 0 ? Math.min(100, (monthRevenue / breakEven) * 100) : 0;

  if (loading) {
    return (
      <div className="mt-3 rounded-2xl border bg-background/60 p-4 text-sm text-muted-foreground">
        A calcular break-even…
      </div>
    );
  }

  if (fixedCosts <= 0) {
    return (
      <div className="mt-3 rounded-2xl border bg-background/60 p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Target className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium uppercase tracking-wide">Break-even mensal</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Define os teus custos fixos para ver quanto precisas de faturar.
        </p>
        <Link to="/app/fixed-costs">
          <Button size="sm" variant="outline" className="mt-3 rounded-full">
            Adicionar custos fixos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`mt-3 rounded-2xl border p-4 ${
        reached ? "border-emerald-500/40 bg-emerald-500/10" : "bg-background/60"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wide">Break-even mensal</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-xl font-bold">{fmtEUR(breakEven)}</span>
            <span className="text-xs text-muted-foreground">
              · {fmtEUR(perDay)}/dia ({workDays} dias)
            </span>
          </div>
        </div>
        <div className="text-right">
          {reached ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Break-even atingido
            </span>
          ) : (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Faltam</div>
              <div className="font-display text-base font-bold text-primary">{fmtEUR(remaining)}</div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${reached ? "bg-emerald-500" : "bg-primary"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-1.5 text-[11px] text-muted-foreground">
        Margem média {margin}% · Receita atual {fmtEUR(monthRevenue)}
      </div>
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

type Step = { done: boolean; label: string; to: string; cta: string; primary?: boolean };

function OnboardingSteps({ title, subtitle, steps }: { title: string; subtitle: string; steps: Step[] }) {
  const completed = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done) ?? steps[steps.length - 1];
  return (
    <div className="flex h-[220px] flex-col">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="font-display text-sm font-semibold">{title}</div>
        <span className="text-[11px] font-medium text-muted-foreground">
          {completed}/{steps.length}
        </span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">{subtitle}</p>
      <ol className="flex-1 space-y-1.5 overflow-auto">
        {steps.map((s, i) => {
          const isNext = s === next && !s.done;
          return (
            <li key={i}>
              <Link
                to={s.to as any}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition hover:bg-muted/60 ${
                  isNext ? "border-primary/50 bg-primary-soft/40" : "border-transparent"
                }`}
              >
                {s.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <Circle className={`h-4 w-4 shrink-0 ${isNext ? "text-primary" : "text-muted-foreground"}`} />
                )}
                <span className={`flex-1 truncate ${s.done ? "text-muted-foreground line-through" : ""}`}>
                  {s.label}
                </span>
                {!s.done && (
                  <span className={`text-[11px] font-semibold ${isNext ? "text-primary" : "text-muted-foreground"}`}>
                    {s.cta} →
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
