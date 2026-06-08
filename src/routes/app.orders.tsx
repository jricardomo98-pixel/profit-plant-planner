import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Sparkles, ClipboardList, Loader2, Upload, X } from "lucide-react";
import { fmtEUR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/app/orders")({ component: OrdersPage });

type Recipe = {
  id: string;
  name: string;
  total_cost: number;
};

type LineItem = {
  recipe_id: string;
  recipe_name: string;
  multiplier: number; // 1 or 0.5
  cost: number;
};

type ComponentsShape = {
  massa?: LineItem[];
  recheio?: LineItem[];
  cobertura?: LineItem[];
};

// Legacy format support: components used to be [{id,label,cost}]
type LegacyComponent = { id: string; label: string; cost: number };

type Order = {
  id: string;
  client_name: string;
  product_description: string | null;
  delivery_date: string | null;
  components: ComponentsShape | LegacyComponent[];
  decoration_cost: number;
  decoration_notes: string | null;
  total_cost: number;
  total_price: number;
  status: string;
};

function OrdersPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setOrders(((data as unknown) as Order[]) ?? []);
  }
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
    load();
  }, [user]);

  async function remove(id: string) {
    await supabase.from("orders").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Encomendas</h1>
          <p className="text-sm text-muted-foreground">Compõe encomendas a partir das tuas receitas guardadas.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="rounded-full">
          <Plus className="mr-1 h-4 w-4" />Nova encomenda
        </Button>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          <ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Sem encomendas ainda.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {orders.map((o) => (
            <Card key={o.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-lg font-semibold">{o.client_name}</div>
                  <div className="text-xs text-muted-foreground">{o.product_description}</div>
                  {o.delivery_date && (
                    <div className="mt-1 text-xs">📅 {new Date(o.delivery_date).toLocaleDateString("pt-PT")}</div>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(o.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {renderBadges(o.components, Number(o.decoration_cost) || 0)}
              </div>

              <div className="mt-3 flex items-end justify-between border-t pt-3">
                <div>
                  <div className="text-xs text-muted-foreground">Custo / Preço</div>
                  <div className="font-display text-lg font-semibold">
                    {fmtEUR(Number(o.total_cost))}{" "}
                    <span className="text-primary">→ {fmtEUR(Number(o.total_price))}</span>
                  </div>
                </div>
                <Badge className="rounded-full bg-primary-soft text-primary">{o.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {profile && (
        <NewOrderDialog
          open={open}
          onOpenChange={setOpen}
          profile={profile}
          onCreated={() => {
            setOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function renderBadges(components: ComponentsShape | LegacyComponent[], decorationCost: number) {
  // Legacy array format
  if (Array.isArray(components)) {
    return components.map((c) => (
      <Badge key={c.id} variant="secondary" className="rounded-full text-xs">
        {c.label}: {fmtEUR(Number(c.cost))}
      </Badge>
    ));
  }
  const out: React.ReactNode[] = [];
  const sections: Array<[keyof ComponentsShape, string]> = [
    ["massa", "Massa"],
    ["recheio", "Recheio"],
    ["cobertura", "Cobertura"],
  ];
  sections.forEach(([key, label]) => {
    const total = (components?.[key] ?? []).reduce((s, l) => s + Number(l.cost), 0);
    if ((components?.[key] ?? []).length > 0) {
      out.push(
        <Badge key={key} variant="secondary" className="rounded-full text-xs">
          {label}: {fmtEUR(total)}
        </Badge>,
      );
    }
  });
  if (decorationCost > 0) {
    out.push(
      <Badge key="deco" variant="secondary" className="rounded-full text-xs">
        Decoração: {fmtEUR(decorationCost)}
      </Badge>,
    );
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────

const NONE = "__none__";

function emptyLine(): LineItem {
  return { recipe_id: "", recipe_name: "", multiplier: 1, cost: 0 };
}

function NewOrderDialog({
  open,
  onOpenChange,
  profile,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: any;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  const [client, setClient] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");

  const [massa, setMassa] = useState<LineItem[]>([emptyLine()]);
  const [recheio, setRecheio] = useState<LineItem[]>([emptyLine()]);
  const [cobertura, setCobertura] = useState<LineItem>(emptyLine());

  const [decoNotes, setDecoNotes] = useState("");
  const [decoImage, setDecoImage] = useState<string>(""); // base64 data URL
  const [decoCost, setDecoCost] = useState<number>(0);
  const [decoSuggested, setDecoSuggested] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // load recipes & reset when opening
  useEffect(() => {
    if (!open || !user) return;
    setClient("");
    setDesc("");
    setDate("");
    setMassa([emptyLine()]);
    setRecheio([emptyLine()]);
    setCobertura(emptyLine());
    setDecoNotes("");
    setDecoImage("");
    setDecoCost(0);
    setDecoSuggested(false);
    setLoadingRecipes(true);
    supabase
      .from("recipes")
      .select("id, name, total_cost")
      .eq("user_id", user.id)
      .order("name")
      .then(({ data }) => {
        setRecipes((data as Recipe[]) ?? []);
        setLoadingRecipes(false);
      });
  }, [open, user]);

  const recipeById = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  const massaTotal = massa.reduce((s, l) => s + Number(l.cost), 0);
  const recheioTotal = recheio.reduce((s, l) => s + Number(l.cost), 0);
  const coberturaTotal = Number(cobertura.cost) || 0;
  const totalCost = massaTotal + recheioTotal + coberturaTotal + (Number(decoCost) || 0);
  const margin = (profile?.profit_margin ?? 30) / 100;
  const totalPrice = totalCost * (1 + margin);

  function updateLine(
    section: "massa" | "recheio",
    idx: number,
    patch: Partial<LineItem>,
  ) {
    const setter = section === "massa" ? setMassa : setRecheio;
    setter((arr) =>
      arr.map((l, i) => {
        if (i !== idx) return l;
        const next = { ...l, ...patch };
        const rec = recipeById.get(next.recipe_id);
        next.recipe_name = rec?.name ?? "";
        next.cost = rec ? Number(rec.total_cost) * next.multiplier : 0;
        return next;
      }),
    );
  }

  function addLine(section: "massa" | "recheio") {
    const setter = section === "massa" ? setMassa : setRecheio;
    const arr = section === "massa" ? massa : recheio;
    if (arr.length >= 3) return;
    setter([...arr, emptyLine()]);
  }

  function removeLine(section: "massa" | "recheio", idx: number) {
    const setter = section === "massa" ? setMassa : setRecheio;
    setter((arr) => (arr.length <= 1 ? arr : arr.filter((_, i) => i !== idx)));
  }

  function updateCobertura(recipe_id: string) {
    const rec = recipeById.get(recipe_id);
    setCobertura({
      recipe_id,
      recipe_name: rec?.name ?? "",
      multiplier: 1,
      cost: rec ? Number(rec.total_cost) : 0,
    });
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem demasiado grande (máx 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setDecoImage(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  }

  async function suggestDeco() {
    if (!decoNotes.trim() && !decoImage) {
      toast.error("Descreve a decoração ou anexa uma imagem.");
      return;
    }
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("decoration-assistant", {
        body: {
          decorationNotes: decoNotes,
          imageBase64: decoImage || undefined,
          laborRateHour: Number(profile?.labor_rate_hour) || 0,
          businessType: profile?.business_type ?? "pastelaria artesanal",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const value = Number(data.suggested_cost) || 0;
      setDecoCost(value);
      setDecoSuggested(true);
      toast.success("Estimativa aplicada ✨");
    } catch (e: any) {
      toast.error(e?.message || "Erro do assistente");
    } finally {
      setAiBusy(false);
    }
  }

  async function save() {
    if (!user) return;
    if (!client.trim()) {
      toast.error("Indica o nome do cliente");
      return;
    }
    const cleanMassa = massa.filter((l) => l.recipe_id);
    const cleanRecheio = recheio.filter((l) => l.recipe_id);
    const cleanCobertura = cobertura.recipe_id ? [cobertura] : [];

    if (cleanMassa.length === 0 && cleanRecheio.length === 0 && cleanCobertura.length === 0) {
      toast.error("Seleciona pelo menos uma receita.");
      return;
    }

    setBusy(true);
    const components: ComponentsShape = {
      massa: cleanMassa,
      recheio: cleanRecheio,
      cobertura: cleanCobertura,
    };
    const { error } = await supabase.from("orders").insert({
      user_id: user.id,
      client_name: client.trim().slice(0, 100),
      product_description: desc.trim().slice(0, 500) || null,
      delivery_date: date || null,
      components: components as any,
      decoration_notes: decoNotes.trim().slice(0, 500) || null,
      decoration_cost: Number(decoCost) || 0,
      total_cost: totalCost,
      total_price: totalPrice,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Encomenda guardada!");
    onCreated();
  }

  const noRecipes = !loadingRecipes && recipes.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Nova encomenda</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Input value={client} onChange={(e) => setClient(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label>Data de entrega</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição do bolo</Label>
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Ex: bolo para 12 pessoas, sabor chocolate, com topper personalizado"
            />
          </div>

          <RecipeSection
            title="Massa"
            lines={massa}
            recipes={recipes}
            noRecipes={noRecipes}
            loading={loadingRecipes}
            onChangeRecipe={(idx, id) => updateLine("massa", idx, { recipe_id: id })}
            onChangeMultiplier={(idx, m) => updateLine("massa", idx, { multiplier: m })}
            onRemove={(idx) => removeLine("massa", idx)}
            onAdd={() => addLine("massa")}
            total={massaTotal}
          />

          <RecipeSection
            title="Recheio"
            lines={recheio}
            recipes={recipes}
            noRecipes={noRecipes}
            loading={loadingRecipes}
            onChangeRecipe={(idx, id) => updateLine("recheio", idx, { recipe_id: id })}
            onChangeMultiplier={(idx, m) => updateLine("recheio", idx, { multiplier: m })}
            onRemove={(idx) => removeLine("recheio", idx)}
            onAdd={() => addLine("recheio")}
            total={recheioTotal}
          />

          {/* Cobertura — single dropdown */}
          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Cobertura</Label>
              <span className="text-sm text-muted-foreground">{fmtEUR(coberturaTotal)}</span>
            </div>
            <Select
              value={cobertura.recipe_id || NONE}
              onValueChange={(v) => updateCobertura(v === NONE ? "" : v)}
              disabled={noRecipes}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    noRecipes
                      ? "Sem receitas guardadas. Cria uma receita primeiro."
                      : "Seleciona uma receita…"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Nenhuma —</SelectItem>
                {recipes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} — {fmtEUR(Number(r.total_cost))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>

          {/* Decoração com IA */}
          <Card className="space-y-3 border-primary/30 bg-primary-soft/40 p-4">
            <Label className="flex items-center gap-1.5 text-base font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Decoração
            </Label>

            <Textarea
              value={decoNotes}
              onChange={(e) => setDecoNotes(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Ex: topper acrílico, flores em pasta de açúcar, escrita em chantilly"
            />

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mr-1 h-3.5 w-3.5" />
                {decoImage ? "Trocar imagem" : "Anexar imagem"}
              </Button>
              {decoImage && (
                <div className="flex items-center gap-2">
                  <img
                    src={decoImage}
                    alt="Referência da decoração"
                    className="h-10 w-10 rounded-md object-cover"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setDecoImage("");
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              )}
              <Button
                type="button"
                size="sm"
                className="ml-auto rounded-full"
                onClick={suggestDeco}
                disabled={aiBusy}
              >
                {aiBusy ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                )}
                Estimar com IA
              </Button>
            </div>

            <div className="grid grid-cols-[1fr_140px] items-center gap-2">
              <div className="text-sm text-muted-foreground">Custo de decoração (€)</div>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={decoCost}
                onChange={(e) => setDecoCost(parseFloat(e.target.value) || 0)}
              />
            </div>
            {decoSuggested && (
              <p className="text-xs text-muted-foreground">
                ⚠️ Este valor é uma estimativa gerada por IA e pode não refletir o custo real. Revê
                e ajusta conforme necessário.
              </p>
            )}
          </Card>

          {/* Resumo */}
          <div className="rounded-2xl border bg-gradient-to-br from-primary to-[oklch(0.65_0.18_155)] p-4 text-primary-foreground">
            <div className="flex items-baseline justify-between">
              <span className="text-sm opacity-90">Custo total</span>
              <span className="font-display text-xl font-bold">{fmtEUR(totalCost)}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-sm opacity-90">Preço sugerido (margem {Math.round(margin * 100)}%)</span>
              <span className="font-display text-2xl font-bold">{fmtEUR(totalPrice)}</span>
            </div>
          </div>

          <Button onClick={save} disabled={busy} className="w-full rounded-full" size="lg">
            {busy ? "A guardar…" : "Guardar encomenda"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RecipeSection({
  title,
  lines,
  recipes,
  noRecipes,
  loading,
  onChangeRecipe,
  onChangeMultiplier,
  onRemove,
  onAdd,
  total,
}: {
  title: string;
  lines: LineItem[];
  recipes: Recipe[];
  noRecipes: boolean;
  loading: boolean;
  onChangeRecipe: (idx: number, id: string) => void;
  onChangeMultiplier: (idx: number, m: number) => void;
  onRemove: (idx: number) => void;
  onAdd: () => void;
  total: number;
}) {
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">{title}</Label>
        <span className="text-sm text-muted-foreground">{fmtEUR(total)}</span>
      </div>

      {lines.map((line, idx) => (
        <div key={idx} className="grid items-center gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Select
            value={line.recipe_id || NONE}
            onValueChange={(v) => onChangeRecipe(idx, v === NONE ? "" : v)}
            disabled={noRecipes}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  loading
                    ? "A carregar…"
                    : noRecipes
                      ? "Sem receitas guardadas. Cria uma receita primeiro."
                      : "Seleciona uma receita…"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>— Nenhuma —</SelectItem>
              {recipes.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} — {fmtEUR(Number(r.total_cost))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="inline-flex overflow-hidden rounded-full border">
            <button
              type="button"
              onClick={() => onChangeMultiplier(idx, 1)}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                line.multiplier === 1
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground"
              }`}
            >
              ×1
            </button>
            <button
              type="button"
              onClick={() => onChangeMultiplier(idx, 0.5)}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                line.multiplier === 0.5
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground"
              }`}
            >
              ×0.5
            </button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(idx)}
            disabled={lines.length <= 1}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ))}

      {lines.length < 3 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={onAdd}
          disabled={noRecipes}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Adicionar {title.toLowerCase()}
        </Button>
      )}
    </Card>
  );
}
