import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Boxes, Pencil } from "lucide-react";
import { fmtEUR, parseDec } from "@/lib/format";
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

  const [editing, setEditing] = useState<Row | null>(null);
  const [eName, setEName] = useState("");
  const [ePrice, setEPrice] = useState("");
  const [eQty, setEQty] = useState("");
  const [eUnit, setEUnit] = useState("g");
  const [eBusy, setEBusy] = useState(false);

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
      package_price: parseDec(price),
      package_quantity: parseDec(qty),
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

  function openEdit(r: Row) {
    setEditing(r);
    setEName(r.name);
    setEPrice(String(r.package_price));
    setEQty(String(r.package_quantity));
    setEUnit(r.unit);
  }

  async function saveEdit() {
    if (!editing) return;
    const parsed = schema.safeParse({
      name: eName,
      package_price: parseDec(ePrice),
      package_quantity: parseDec(eQty),
      unit: eUnit,
    });
    if (!parsed.success) { toast.error("Preenche todos os campos"); return; }
    setEBusy(true);
    const { error } = await supabase.from("ingredients").update(parsed.data).eq("id", editing.id);
    setEBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Ingrediente atualizado. Receitas já gravadas mantêm o custo antigo.");
    setEditing(null);
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
          <Input type="text" inputMode="decimal" placeholder="Preço €" value={price} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setPrice(e.target.value)} />
          <Input type="text" inputMode="decimal" placeholder="Quantidade" value={qty} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setQty(e.target.value)} />
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
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(r)} className="text-muted-foreground hover:text-primary">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar ingrediente</DialogTitle>
            <DialogDescription>
              Alterar o preço não muda o custo de receitas já gravadas — só afeta receitas criadas ou recalculadas depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={eName} onChange={(e) => setEName(e.target.value)} maxLength={80} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label>Preço €</Label>
                <Input type="text" inputMode="decimal" value={ePrice} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setEPrice(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Quantidade</Label>
                <Input type="text" inputMode="decimal" value={eQty} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setEQty(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Select value={eUnit} onValueChange={setEUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
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
