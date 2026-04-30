import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Boxes } from "lucide-react";
import { fmtEUR } from "@/lib/format";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/app/ingredients")({ component: IngredientsPage });

type Row = {
  id: string;
  name: string;
  package_price: number;
  package_quantity: number;
  unit: string;
  supplier: string | null;
};

const UNITS = ["g", "kg", "ml", "l", "un", "m", "cm"];

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  package_price: z.number().min(0).max(1_000_000),
  package_quantity: z.number().min(0.0001).max(1_000_000),
  unit: z.string().max(8),
});

function IngredientsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("g");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!user) return;
    const { data } = await supabase.from("ingredients").select("*").eq("user_id", user.id).order("name");
    setRows((data as Row[]) ?? []);
  }
  useEffect(() => { load(); }, [user]);

  async function add() {
    if (!user) return;
    const parsed = schema.safeParse({
      name,
      package_price: parseFloat(price) || 0,
      package_quantity: parseFloat(qty) || 0,
      unit,
    });
    if (!parsed.success) { toast.error("Preenche todos os campos"); return; }
    setBusy(true);
    const { error } = await supabase.from("ingredients").insert({ user_id: user.id, ...parsed.data });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setName(""); setPrice(""); setQty("");
    load();
  }

  async function remove(id: string) {
    await supabase.from("ingredients").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Materiais & ingredientes</h1>
        <p className="text-sm text-muted-foreground">O que compraste, quanto pagaste e em que quantidade.</p>
      </header>

      <Card className="p-4">
        <div className="grid gap-2 md:grid-cols-[1.4fr_120px_120px_100px_auto]">
          <Input placeholder="Ex: Farinha tipo 55" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          <Input type="number" step="0.01" min="0" placeholder="Preço €" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Input type="number" step="0.01" min="0" placeholder="Quantidade" value={qty} onChange={(e) => setQty(e.target.value)} />
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={add} disabled={busy} className="rounded-full"><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Ex: pacote de 1 kg de farinha por 0,80 € → preço 0,80 / quantidade 1000 / unidade g.
        </p>
      </Card>

      <div className="grid gap-2 md:grid-cols-2">
        {rows.length === 0 && (
          <div className="md:col-span-2 rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
            <Boxes className="mx-auto mb-2 h-8 w-8 opacity-40" />
            Adiciona os teus materiais para usares na calculadora.
          </div>
        )}
        {rows.map((r) => {
          const perUnit = Number(r.package_price) / Math.max(Number(r.package_quantity), 0.0001);
          return (
            <Card key={r.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">
                  {fmtEUR(Number(r.package_price))} / {r.package_quantity} {r.unit}
                  &nbsp;· <span className="text-primary">{fmtEUR(perUnit)} / {r.unit}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
