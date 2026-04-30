import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Calculator, Save, Clock, Flame, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { fmtEUR, round2 } from "@/lib/format";
import { VOCAB, type BusinessType } from "@/lib/business-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/app/")({ component: CalculatorPage });

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

  const [name, setName] = useState("");
  const [laborMin, setLaborMin] = useState("");
  const [machineMin, setMachineMin] = useState("");
  const [used, setUsed] = useState<Used[]>([]);
  const [units, setUnits] = useState("1"); // unidades produzidas por receita
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: ing }, { data: fc }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("ingredients").select("*").eq("user_id", user.id).order("name"),
        supabase.from("fixed_costs").select("amount").eq("user_id", user.id),
      ]);
      setProfile(p);
      setIngredients((ing as Ingredient[]) ?? []);
      setFixedCostsTotal((fc ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0));
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

  function addUsed() {
    if (ingredients.length === 0) return;
    setUsed((u) => [...u, { ingredient_id: ingredients[0].id, quantity: 0 }]);
  }

  async function saveRecipe() {
    if (!user) return;
    if (!name.trim()) { toast.error("Dá um nome à receita"); return; }
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
    setName(""); setLaborMin(""); setMachineMin(""); setUsed([]); setUnits("1");
  }

  if (!profile) return <div className="py-10 text-center text-muted-foreground">A carregar…</div>;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <header>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Calculadora de custos</h1>
          <p className="text-sm text-muted-foreground capitalize">
            Calcula o custo real de cada {vocab.product}.
          </p>
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

          <div className="border-t p-4">
            <Button onClick={saveRecipe} disabled={busy} className="w-full rounded-full" size="lg">
              <Save className="mr-1 h-4 w-4" />{busy ? "A guardar…" : "Guardar receita"}
            </Button>
          </div>
        </Card>
      </aside>
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
