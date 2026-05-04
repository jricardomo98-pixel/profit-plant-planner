import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Calculator, Save, Clock, Flame, AlertTriangle, AlertCircle, CheckCircle2, Sparkles, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { fmtEUR, round2 } from "@/lib/format";
import { VOCAB, type BusinessType } from "@/lib/business-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/app/calculator")({ component: CalculatorPage });

type Ingredient = {
  id: string;
  name: string;
  package_price: number;
  package_quantity: number;
  unit: string;
};

type Used = { ingredient_id: string; quantity: number };

function CalculatorPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [fixedCostsTotal, setFixedCostsTotal] = useState(0);
  const [recipesCount, setRecipesCount] = useState(0);
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  const [name, setName] = useState("");
  const [laborMin, setLaborMin] = useState("");
  const [machineMin, setMachineMin] = useState("");
  const [used, setUsed] = useState<Used[]>([]);
  const [units, setUnits] = useState("1"); // unidades produzidas por receita
  const [busy, setBusy] = useState(false);

  const FREE_LIMIT = 3;
  const isFree = profile?.plan !== "pro";
  const atLimit = isFree && recipesCount >= FREE_LIMIT;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: ing }, { data: fc }, { count }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("ingredients").select("*").eq("user_id", user.id).order("name"),
        supabase.from("fixed_costs").select("amount").eq("user_id", user.id),
        supabase.from("recipes").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setProfile(p);
      setIngredients((ing as Ingredient[]) ?? []);
      setFixedCostsTotal((fc ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0));
      setRecipesCount(count ?? 0);
    })();
  }, [user]);

  const vocab = profile ? VOCAB[(profile.business_type ?? "outro") as BusinessType] : VOCAB.outro;

  const calc = useMemo(() => {
    const labor = (parseFloat(laborMin) || 0) / 60;
    const machine = (parseFloat(machineMin) || 0) / 60;
    const u = Math.max(parseFloat(units) || 1, 1);
    const laborCost = labor * (profile?.labor_rate_hour ?? 0);
    const machineCost = machine * (profile?.machine_rate_hour ?? 0);

    const ingMap = new Map(ingredients.map((i) => [i.id, i]));
    const ingredientCost = used.reduce((s, u) => {
      const ing = ingMap.get(u.ingredient_id);
      if (!ing) return s;
      const perUnit = Number(ing.package_price) / Math.max(Number(ing.package_quantity), 0.0001);
      return s + perUnit * (Number(u.quantity) || 0);
    }, 0);

    // Custos fixos rateados pelo tempo de mão-de-obra
    const monthlyHours = profile?.monthly_work_hours ?? 160;
    const costPerWorkHour = monthlyHours > 0 ? fixedCostsTotal / monthlyHours : 0;
    const fixedShare = costPerWorkHour * labor;

    const totalBatch = laborCost + machineCost + ingredientCost + fixedShare;
    const totalUnit = totalBatch / u;
    const margin = (profile?.profit_margin ?? 30) / 100;
    const suggested = totalUnit * (1 + margin);

    return {
      laborCost, machineCost, ingredientCost, fixedShare,
      totalBatch, totalUnit, suggested, margin,
    };
  }, [laborMin, machineMin, used, ingredients, profile, fixedCostsTotal, units]);

  const validation = useMemo(() => {
    const errors: { msg: string; fix?: React.ReactNode }[] = [];
    const warnings: { msg: string; fix?: React.ReactNode }[] = [];

    const lm = parseFloat(laborMin);
    const mm = parseFloat(machineMin);
    const u = parseFloat(units);

    if (laborMin !== "" && (isNaN(lm) || lm < 0)) errors.push({ msg: "Os minutos de mão-de-obra não podem ser negativos." });
    if (machineMin !== "" && (isNaN(mm) || mm < 0)) errors.push({ msg: `Os minutos de ${vocab.machine} não podem ser negativos.` });
    if (units !== "" && (isNaN(u) || u < 1)) errors.push({ msg: "As unidades produzidas têm de ser pelo menos 1." });

    if ((parseFloat(laborMin) || 0) === 0 && (parseFloat(machineMin) || 0) === 0) {
      warnings.push({ msg: "Não indicaste tempo de trabalho nem de máquina — o custo de mão-de-obra ficará a zero." });
    }

    if ((parseFloat(laborMin) || 0) > 0 && !(profile?.labor_rate_hour > 0)) {
      warnings.push({
        msg: "Não tens taxa de mão-de-obra (€/h) definida.",
        fix: <Link to="/app/settings" className="font-medium underline">Definir nas Definições</Link>,
      });
    }
    if ((parseFloat(machineMin) || 0) > 0 && !(profile?.machine_rate_hour > 0)) {
      warnings.push({
        msg: `Não tens taxa de ${vocab.machine} (€/h) definida.`,
        fix: <Link to="/app/settings" className="font-medium underline">Definir nas Definições</Link>,
      });
    }

    const ingMap = new Map(ingredients.map((i) => [i.id, i]));
    const counts = new Map<string, number>();
    used.forEach((x, idx) => {
      const ing = ingMap.get(x.ingredient_id);
      const label = ing?.name ?? `Linha ${idx + 1}`;
      if (x.quantity < 0) errors.push({ msg: `"${label}": a quantidade usada não pode ser negativa.` });
      if (x.quantity === 0) warnings.push({ msg: `"${label}": quantidade usada é 0 — não vai contar para o custo.` });
      if (ing && x.quantity > Number(ing.package_quantity)) {
        warnings.push({
          msg: `"${label}": estás a usar ${x.quantity}${ing.unit} mas a embalagem tem apenas ${ing.package_quantity}${ing.unit}. Confirma se vais precisar de mais que uma embalagem.`,
        });
      }
      counts.set(x.ingredient_id, (counts.get(x.ingredient_id) ?? 0) + 1);
    });
    counts.forEach((n, id) => {
      if (n > 1) {
        const ing = ingMap.get(id);
        warnings.push({ msg: `"${ing?.name ?? "Item"}" aparece ${n} vezes — considera juntar numa só linha.` });
      }
    });

    if ((profile?.profit_margin ?? 0) <= 0) {
      warnings.push({
        msg: "Margem de lucro está a 0% — o preço sugerido será igual ao custo.",
        fix: <Link to="/app/settings" className="font-medium underline">Ajustar margem</Link>,
      });
    }

    return { errors, warnings, hasErrors: errors.length > 0 };
  }, [laborMin, machineMin, units, used, ingredients, profile, vocab]);
  function addUsed() {
    if (ingredients.length === 0) return;
    setUsed((u) => [...u, { ingredient_id: ingredients[0].id, quantity: 0 }]);
  }

  async function saveRecipe() {
    if (!user) return;
    if (!name.trim()) { toast.error("Dá um nome à receita"); return; }
    if (validation.hasErrors) {
      toast.error("Corrige os erros assinalados antes de guardar.");
      return;
    }
    if (atLimit) {
      setShowLimitDialog(true);
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("recipes").insert({
      user_id: user.id,
      name: name.trim().slice(0, 80),
      labor_minutes: parseFloat(laborMin) || 0,
      machine_minutes: parseFloat(machineMin) || 0,
      ingredients_used: used,
      ingredient_cost: round2(calc.ingredientCost),
      labor_cost: round2(calc.laborCost),
      machine_cost: round2(calc.machineCost),
      fixed_cost_share: round2(calc.fixedShare),
      total_cost: round2(calc.totalUnit),
      suggested_price: round2(calc.suggested),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Receita guardada!");
    setRecipesCount((c) => c + 1);
    setName(""); setLaborMin(""); setMachineMin(""); setUsed([]); setUnits("1");
  }

  if (!profile) return <div className="py-10 text-center text-muted-foreground">A carregar…</div>;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">Calculadora de custos</h1>
            <p className="text-sm text-muted-foreground capitalize">
              Calcula o custo real de cada {vocab.product}.
            </p>
          </div>
          {isFree && (
            <Link to="/pricing" className="shrink-0">
              <Badge
                variant={atLimit ? "destructive" : "secondary"}
                className="gap-1.5 rounded-full px-3 py-1 text-xs"
              >
                {atLimit ? <Lock className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                {Math.min(recipesCount, FREE_LIMIT)} de {FREE_LIMIT} receitas usadas
              </Badge>
            </Link>
          )}
        </header>

        <Card className="space-y-4 p-5">
          <div className="space-y-1.5">
            <Label>Nome da {vocab.recipe}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Ex: ${vocab.product} de chocolate`} maxLength={80} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" />Mão-de-obra (min)</Label>
              <Input type="number" min="0" step="1" value={laborMin} onChange={(e) => setLaborMin(e.target.value)} placeholder="20" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-warning" />{vocab.machine} (min)</Label>
              <Input type="number" min="0" step="1" value={machineMin} onChange={(e) => setMachineMin(e.target.value)} placeholder="60" />
            </div>
            <div className="space-y-1.5">
              <Label>Unidades produzidas</Label>
              <Input type="number" min="1" step="1" value={units} onChange={(e) => setUnits(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            💡 Tempo de máquina ({vocab.machine}) é mais barato — não estás a trabalhar ativamente. Definido em €/h nas Definições.
          </p>
        </Card>

        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="space-y-2">
            {validation.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Corrige antes de continuar</AlertTitle>
                <AlertDescription>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {validation.errors.map((e, i) => (
                      <li key={i}>{e.msg}{e.fix ? <> — {e.fix}</> : null}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {validation.warnings.length > 0 && (
              <Alert className="border-warning/40 bg-warning/10 text-foreground [&>svg]:text-warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Avisos</AlertTitle>
                <AlertDescription>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {validation.warnings.map((w, i) => (
                      <li key={i}>{w.msg}{w.fix ? <> — {w.fix}</> : null}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {validation.errors.length === 0 && validation.warnings.length === 0 && (laborMin || machineMin || used.length > 0) && (
          <Alert className="border-primary/30 bg-primary/5 [&>svg]:text-primary">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-sm">Tudo certo — podes guardar a {vocab.recipe} com confiança.</AlertDescription>
          </Alert>
        )}

        <Card className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold capitalize">{vocab.ingredients}</h2>
              <p className="text-xs text-muted-foreground">Adiciona o que usaste e em que quantidade.</p>
            </div>
            <Button onClick={addUsed} disabled={ingredients.length === 0} variant="outline" size="sm" className="rounded-full">
              <Plus className="mr-1 h-4 w-4" />Adicionar
            </Button>
          </div>

          {ingredients.length === 0 && (
            <div className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
              Vai à aba <strong>Materiais</strong> adicionar os teus {vocab.ingredients}.
            </div>
          )}

          {used.map((u, idx) => {
            const ing = ingredients.find((i) => i.id === u.ingredient_id);
            const perUnit = ing ? Number(ing.package_price) / Math.max(Number(ing.package_quantity), 0.0001) : 0;
            const cost = perUnit * (u.quantity || 0);
            return (
              <div key={idx} className="grid items-center gap-2 rounded-xl bg-muted/40 p-2 md:grid-cols-[1fr_120px_90px_60px]">
                <Select value={u.ingredient_id} onValueChange={(v) => setUsed((arr) => arr.map((x, i) => i === idx ? { ...x, ingredient_id: v } : x))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ingredients.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" min="0" step="0.01" value={u.quantity}
                  onChange={(e) => setUsed((arr) => arr.map((x, i) => i === idx ? { ...x, quantity: parseFloat(e.target.value) || 0 } : x))}
                  placeholder={ing?.unit ?? "qtd"} />
                <div className="text-right text-sm font-medium text-primary">{fmtEUR(cost)}</div>
                <Button variant="ghost" size="icon" onClick={() => setUsed((arr) => arr.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            );
          })}
        </Card>
      </div>

      {/* sticky summary */}
      <aside className="lg:sticky lg:top-32 lg:self-start">
        <Card className="overflow-hidden border-primary/30 p-0">
          <div className="bg-gradient-to-br from-primary to-[oklch(0.65_0.18_155)] p-5 text-primary-foreground">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-90">
              <Calculator className="h-3.5 w-3.5" /> Resumo por unidade
            </div>
            <div className="mt-2 font-display text-4xl font-bold">{fmtEUR(calc.totalUnit)}</div>
            <div className="mt-3 rounded-xl bg-white/15 p-3 backdrop-blur">
              <div className="text-xs opacity-90">Preço sugerido (margem {Math.round(calc.margin * 100)}%)</div>
              <div className="font-display text-2xl font-bold">{fmtEUR(calc.suggested)}</div>
            </div>
          </div>

          <div className="space-y-2 p-5 text-sm">
            <Row label={`${vocab.ingredients}`} value={calc.ingredientCost} />
            <Row label="Mão-de-obra" value={calc.laborCost} />
            <Row label={vocab.machine.charAt(0).toUpperCase() + vocab.machine.slice(1)} value={calc.machineCost} />
            <Row label="Custos fixos (rateio)" value={calc.fixedShare} muted />
            <div className="my-2 h-px bg-border" />
            <Row label="Custo total do lote" value={calc.totalBatch} bold />
          </div>

          <div className="border-t p-4 space-y-2">
            {validation.hasErrors && (
              <p className="text-center text-xs font-medium text-destructive">Corrige os erros antes de guardar.</p>
            )}
            {atLimit && (
              <p className="text-center text-xs font-medium text-destructive">
                Limite do plano gratuito atingido.
              </p>
            )}
            <Button onClick={saveRecipe} disabled={busy || validation.hasErrors} className="w-full rounded-full" size="lg">
              {atLimit ? <Lock className="mr-1 h-4 w-4" /> : <Save className="mr-1 h-4 w-4" />}
              {busy ? "A guardar…" : atLimit ? "Fazer upgrade para guardar" : "Guardar receita"}
            </Button>
          </div>
        </Card>
      </aside>

      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center font-display text-xl">
              Atingiste o limite do plano gratuito
            </DialogTitle>
            <DialogDescription className="text-center">
              Faz upgrade para Pro e guarda receitas ilimitadas. Continua a calcular sem nunca perder o trabalho.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button variant="outline" onClick={() => setShowLimitDialog(false)}>Agora não</Button>
            <Link to="/pricing">
              <Button className="w-full rounded-full">
                <Sparkles className="mr-1 h-4 w-4" /> Ver planos
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: number; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? "text-muted-foreground" : ""} ${bold ? "font-semibold" : ""}`}>
      <span className="capitalize">{label}</span>
      <span>{fmtEUR(value)}</span>
    </div>
  );
}
