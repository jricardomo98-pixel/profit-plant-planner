import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fmtEUR } from "@/lib/format";
import { toast } from "sonner";
import { ArrowLeft, Users, UserCheck, Clock, Ban, Wallet, Coins, ChefHat, Save } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — Calculamus" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  business_name: string | null;
  business_type: string | null;
  status: string;
  plan: string;
  trial_ends_at: string | null;
  created_at: string;
};

function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [recipesAll, setRecipesAll] = useState<{ user_id: string; created_at: string }[]>([]);
  const [ordersAll, setOrdersAll] = useState<{ total_price: number; created_at: string }[]>([]);
  const [subPrice, setSubPrice] = useState<number>(9.99);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [savingPrice, setSavingPrice] = useState(false);
  const [search, setSearch] = useState("");

  // Auth + role guard
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!data) {
        toast.error("Acesso restrito a administradores");
        navigate({ to: "/app" });
        return;
      }
      setChecking(false);
    })();
  }, [loading, user, navigate]);

  // Carregar dados
  useEffect(() => {
    if (checking) return;
    (async () => {
      const [{ data: profs }, { data: recs }, { data: ords }, { data: setts }] = await Promise.all([
        supabase.from("profiles").select("id,email,display_name,business_name,business_type,status,plan,trial_ends_at,created_at").order("created_at", { ascending: false }),
        supabase.from("recipes").select("user_id,created_at"),
        supabase.from("orders").select("total_price,created_at"),
        supabase.from("settings").select("id,subscription_price").limit(1).maybeSingle(),
      ]);
      setProfiles((profs as ProfileRow[]) ?? []);
      setRecipesAll((recs as any) ?? []);
      setOrdersAll((ords as any) ?? []);
      if (setts) {
        setSubPrice(Number(setts.subscription_price));
        setSettingsId(setts.id);
      }
    })();
  }, [checking]);

  const recipesByUser = useMemo(() => {
    const m = new Map<string, number>();
    recipesAll.forEach((r) => m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1));
    return m;
  }, [recipesAll]);

  const stats = useMemo(() => {
    const total = profiles.length;
    const active = profiles.filter((p) => p.status === "active").length;
    const trial = profiles.filter((p) => p.status === "trial").length;
    const suspended = profiles.filter((p) => p.status === "suspended").length;
    const mrr = active * subPrice;
    const totalRevenue = ordersAll.reduce((s, o) => s + Number(o.total_price ?? 0), 0);
    return { total, active, trial, suspended, mrr, totalRevenue, recipesCount: recipesAll.length };
  }, [profiles, ordersAll, recipesAll, subPrice]);

  // Series: últimos 6 meses
  const monthSeries = useMemo(() => {
    const months: { key: string; label: string; signups: number; recipes: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        key,
        label: d.toLocaleDateString("pt-PT", { month: "short" }),
        signups: 0,
        recipes: 0,
      });
    }
    const mapIdx = new Map(months.map((m, i) => [m.key, i] as const));
    profiles.forEach((p) => {
      const d = new Date(p.created_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const idx = mapIdx.get(k);
      if (idx !== undefined) months[idx].signups++;
    });
    recipesAll.forEach((r) => {
      const d = new Date(r.created_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const idx = mapIdx.get(k);
      if (idx !== undefined) months[idx].recipes++;
    });
    return months;
  }, [profiles, recipesAll]);

  const businessTypeBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    profiles.forEach((p) => {
      const t = p.business_type ?? "—";
      m.set(t, (m.get(t) ?? 0) + 1);
    });
    return Array.from(m.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return profiles;
    return profiles.filter((p) =>
      [p.email, p.display_name, p.business_name, p.business_type]
        .some((v) => (v ?? "").toLowerCase().includes(s)),
    );
  }, [profiles, search]);

  async function updateProfile(id: string, patch: Partial<ProfileRow>) {
    const prev = profiles;
    setProfiles((curr) => curr.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) {
      setProfiles(prev);
      toast.error(`Erro ao atualizar: ${error.message}`);
    } else {
      toast.success("Atualizado");
    }
  }

  async function saveSubPrice() {
    setSavingPrice(true);
    let error;
    if (settingsId) {
      ({ error } = await supabase.from("settings").update({ subscription_price: subPrice }).eq("id", settingsId));
    } else {
      const res = await supabase.from("settings").insert({ subscription_price: subPrice }).select("id").maybeSingle();
      error = res.error;
      if (res.data) setSettingsId(res.data.id);
    }
    setSavingPrice(false);
    if (error) toast.error(error.message);
    else toast.success("Preço de subscrição guardado");
  }

  if (loading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-soft/30 via-background to-background pb-16">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Link to="/app">
              <Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div>
              <h1 className="font-display text-lg font-bold leading-none">Painel de Administração</h1>
              <p className="text-xs text-muted-foreground">Gestão de utilizadores e métricas</p>
            </div>
          </div>
          <Badge variant="default">Admin</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 pt-6 md:px-6">
        {/* SECÇÃO 1 — RESUMO */}
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold">Resumo geral</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard icon={<Users className="h-4 w-4" />} label="Total utilizadores" value={String(stats.total)} />
            <StatCard icon={<UserCheck className="h-4 w-4 text-primary" />} label="Ativos" value={String(stats.active)} />
            <StatCard icon={<Clock className="h-4 w-4 text-amber-600" />} label="Em trial" value={String(stats.trial)} />
            <StatCard icon={<Ban className="h-4 w-4 text-destructive" />} label="Suspensos" value={String(stats.suspended)} />
            <StatCard icon={<Wallet className="h-4 w-4 text-primary" />} label="MRR" value={fmtEUR(stats.mrr)} />
            <StatCard icon={<Coins className="h-4 w-4" />} label="Receita acumulada" value={fmtEUR(stats.totalRevenue)} />
            <StatCard icon={<ChefHat className="h-4 w-4" />} label={`Receitas criadas`} value={String(stats.recipesCount)} />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Preço subscrição (€/mês)</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 p-4 pt-0">
                <Input
                  type="number" step="0.01" min={0}
                  value={subPrice}
                  onChange={(e) => setSubPrice(Number(e.target.value))}
                  className="h-8"
                />
                <Button size="sm" onClick={saveSubPrice} disabled={savingPrice}>
                  <Save className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* SECÇÃO 2 — UTILIZADORES */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-xl font-semibold">Utilizadores</h2>
            <Input
              placeholder="Pesquisar nome, email, negócio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Negócio</TableHead>
                      <TableHead>Registo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Trial até</TableHead>
                      <TableHead className="text-right">Receitas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Sem utilizadores</TableCell></TableRow>
                    )}
                    {filteredProfiles.map((p) => {
                      const trialDate = p.trial_ends_at ? p.trial_ends_at.slice(0, 10) : "";
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.display_name || p.business_name || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.email ?? "—"}</TableCell>
                          <TableCell className="text-xs">{p.business_type ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString("pt-PT")}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={p.status}
                              onValueChange={(v) => updateProfile(p.id, { status: v })}
                            >
                              <SelectTrigger className="h-8 w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="trial">Trial</SelectItem>
                                <SelectItem value="active">Ativo</SelectItem>
                                <SelectItem value="suspended">Suspenso</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              defaultValue={trialDate}
                              className="h-8 w-[140px]"
                              onBlur={(e) => {
                                const newVal = e.target.value ? new Date(e.target.value).toISOString() : null;
                                if (newVal !== p.trial_ends_at) updateProfile(p.id, { trial_ends_at: newVal });
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right">{recipesByUser.get(p.id) ?? 0}</TableCell>
                          <TableCell className="text-right">
                            {p.status === "suspended" ? (
                              <Button size="sm" variant="default" onClick={() => updateProfile(p.id, { status: "active" })}>Ativar</Button>
                            ) : (
                              <Button size="sm" variant="destructive" onClick={() => updateProfile(p.id, { status: "suspended" })}>Suspender</Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* SECÇÃO 3 — ATIVIDADE */}
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold">Atividade e crescimento</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Novos registos (últimos 6 meses)</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthSeries}>
                    <defs>
                      <linearGradient id="gSignup" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="signups" stroke="hsl(var(--primary))" fill="url(#gSignup)" name="Registos" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Receitas criadas (últimos 6 meses)</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthSeries}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="recipes" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Receitas" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-sm">Tipos de negócio mais comuns</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo de negócio</TableHead>
                      <TableHead className="text-right">Utilizadores</TableHead>
                      <TableHead className="text-right">% do total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {businessTypeBreakdown.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>
                    )}
                    {businessTypeBreakdown.map((b) => (
                      <TableRow key={b.type}>
                        <TableCell className="font-medium capitalize">{b.type}</TableCell>
                        <TableCell className="text-right">{b.count}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {stats.total ? Math.round((b.count / stats.total) * 100) : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {icon}{label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="font-display text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
