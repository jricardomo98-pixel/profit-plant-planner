import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, ChefHat, Trash } from "lucide-react";
import { fmtEUR, parseDec, round2 } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/app/recipes")({ component: RecipesPage });

type Ingredient = {
  id: string;
  name: string;
  package_price: number;
  package_quantity: number;
  unit: string;
};

type Used = { ingredient_id: string; quantity: number | string };

type Recipe = {
  id: string;
  name: string;
  labor_minutes: number;
  machine_minutes: number;
  ingredients_used: Used[];
  ingredient_cost: number;
  labor_cost: number;
  machine_cost: number;
  fixed_cost_share: number;
  total_cost: number;
  suggested_price: number;
  created_at: string;
};

function RecipesPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [fixedCostsTotal, setFixedCostsTotal] = useState(0);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<Recipe | null>(null);
  const [eName, setEName] = useState("");
  const [eLabor, setELabor] = useState("");
  const [eMachine, setEMachine] = useState("");
  const [eUnits, setEUnits] = useState("1");
  const [eUsed, setEUsed] = useState<Used[]>([]);
  const [eBusy, setEBusy] = useState(false);

  async function loadAll() {
    if (!user) return;
    setLoading(true);
    const [{ data: p }, { data: ing }, { data: fc }, { data: rec }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("ingredients").select("*").eq("user_id", user.id).order("name"),
      supabase.from("fixed_costs").select("amount").eq("user_id", user.id),
      supabase.from("recipes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setProfile(p);
    setIngredients((ing as Ingredient[]) ?? []);
    setFixedCostsTotal((fc ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0));
    setRecipes((rec as Recipe[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, [user]);

  function openEdit(r: Recipe) {
    setEditing(r);
    setEName(r.name);
    setELabor(String(r.labor_minutes));
    setEMachine(String(r.machine_minutes));
    // We don't store units on recipes; total_cost is per unit. Default to 1 batch.
    setEUnits("1");
    setEUsed((r.ingredients_used ?? []).map((u) => ({
      ingredient_id: u.ingredient_id,
      quantity: Number(u.quantity) || 0,
    })));
  }

  const calc = useMemo(() => {
    const labor = parseDec(eLabor) / 60;
    const machine = parseDec(eMachine) / 60;
    const u = Math.max(parseDec(eUnits) || 1, 1);
    const laborCost = labor * (profile?.labor_rate_hour ?? 0);
    const machineCost = machine * (profile?.machine_rate_hour ?? 0);
    const ingMap = new Map(ingredients.map((i) => [i.id, i]));
    const ingredientCost = eUsed.reduce((s, x) => {
      const ing = ingMap.get(x.ingredient_id);
      if (!ing) return s;
      const perUnit = Number(ing.package_price) / Math.max(Number(ing.package_quantity), 0.0001);
      return s + perUnit * parseDec(String(x.quantity));
    }, 0);
    const monthlyHours = profile?.monthly_work_hours ?? 160;
    const costPerWorkHour = monthlyHours > 0 ? fixedCostsTotal / monthlyHours : 0;
    const fixedShare = costPerWorkHour * labor;
    const totalBatch = laborCost + machineCost + ingredientCost + fixedShare;
    const totalUnit = totalBatch / u;
    const margin = (profile?.profit_margin ?? 30) / 100;
    const suggested = totalUnit * (1 + margin);
    return { laborCost, machineCost, ingredientCost, fixedShare, totalUnit, suggested };
  }, [eLabor, eMachine, eUnits, eUsed, ingredients, profile, fixedCostsTotal]);

  async function saveEdit() {
    if (!editing) return;
    if (!eName.trim()) { toast.error("Dá um nome à receita"); return; }
    setEBusy(true);
    const { error } = await supabase.from("recipes").update({
      name: eName.trim().slice(0, 80),
      labor_minutes: parseDec(eLabor),
      machine_minutes: parseDec(eMachine),
      ingredients_used: eUsed.map((u) => ({ ingredient_id: u.ingredient_id, quantity: parseDec(String(u.quantity)) })),
      ingredient_cost: round2(calc.ingredientCost),
      labor_cost: round2(calc.laborCost),
      machine_cost: round2(calc.machineCost),
      fixed_cost_share: round2(calc.fixedShare),
      total_cost: round2(calc.totalUnit),
      suggested_price: round2(calc.suggested),
    }).eq("id", editing.id);
    setEBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Receita atualizada com os preços atuais dos ingredientes.");
    setEditing(null);
    loadAll();
  }

  async function removeRecipe(id: string) {
    if (!confirm("Eliminar esta receita?")) return;
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Receita eliminada.");
    loadAll();
  }

  function addUsed() {
    if (ingredients.length === 0) return;
    setEUsed((u) => [...u, { ingredient_id: ingredients[0].id, quantity: 0 }]);
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Receitas gravadas</h1>
          <p className="text-sm text-muted-foreground">Consulta e edita as receitas que já calculaste.</p>
        </div>
        <Link to="/app/calculator">
          <Button className="rounded-full"><Plus className="mr-1 h-4 w-4" />Nova receita</Button>
        </Link>
      </header>

      {loading ? (
        <div className="py-10 text-center text-muted-foreground">A carregar…</div>
      ) : recipes.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          <ChefHat className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Ainda não tens receitas. <Link to="/app/calculator" className="text-primary underline">Cria a primeira</Link>.
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {recipes.map((r) => (
            <Card key={r.id} className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <div className="truncate font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">
                  <span className="text-primary font-medium">{fmtEUR(Number(r.total_cost))}</span> /un
                  &nbsp;· sugerido {fmtEUR(Number(r.suggested_price))}
                  &nbsp;· {new Date(r.created_at).toLocaleDateString("pt-PT")}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(r)} className="text-muted-foreground hover:text-primary">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeRecipe(r.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar receita</DialogTitle>
            <DialogDescription>
              O custo total será recalculado com os preços atuais dos ingredientes ao guardar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={eName} onChange={(e) => setEName(e.target.value)} maxLength={80} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label>Mão-de-obra (min)</Label>
                <Input type="text" inputMode="decimal" value={eLabor} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setELabor(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Máquina (min)</Label>
                <Input type="text" inputMode="decimal" value={eMachine} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setEMachine(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Unidades</Label>
                <Input type="text" inputMode="decimal" value={eUnits} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setEUnits(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ingredientes usados</Label>
                <Button size="sm" variant="outline" onClick={addUsed} disabled={ingredients.length === 0} className="rounded-full">
                  <Plus className="mr-1 h-4 w-4" />Adicionar
                </Button>
              </div>
              {eUsed.map((u, idx) => {
                const ing = ingredients.find((i) => i.id === u.ingredient_id);
                const perUnit = ing ? Number(ing.package_price) / Math.max(Number(ing.package_quantity), 0.0001) : 0;
                const cost = perUnit * parseDec(String(u.quantity));
                return (
                  <div key={idx} className="grid items-center gap-2 rounded-xl bg-muted/40 p-2 md:grid-cols-[1fr_110px_80px_40px]">
                    <Select value={u.ingredient_id} onValueChange={(v) => setEUsed((arr) => arr.map((x, i) => i === idx ? { ...x, ingredient_id: v } : x))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ingredients.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="text" inputMode="decimal" value={String(u.quantity)}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setEUsed((arr) => arr.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))}
                      placeholder={ing?.unit ?? "qtd"} />
                    <div className="text-right text-sm font-medium text-primary">{fmtEUR(cost)}</div>
                    <Button variant="ghost" size="icon" onClick={() => setEUsed((arr) => arr.filter((_, i) => i !== idx))}>
                      <Trash className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <Card className="p-4 bg-primary/5 border-primary/30">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Custo por unidade (recalculado)</span>
                <span className="font-display text-2xl font-bold text-primary">{fmtEUR(calc.totalUnit)}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between text-xs text-muted-foreground">
                <span>Preço sugerido</span>
                <span>{fmtEUR(calc.suggested)}</span>
              </div>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={eBusy}>{eBusy ? "A guardar…" : "Guardar alterações"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
