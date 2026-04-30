import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Sparkles, ClipboardList, Loader2 } from "lucide-react";
import { fmtEUR } from "@/lib/format";
import { VOCAB, type BusinessType } from "@/lib/business-types";
import { toast } from "sonner";

export const Route = createFileRoute("/app/orders")({ component: OrdersPage });

type Component = { id: string; label: string; cost: number };
type Order = {
  id: string;
  client_name: string;
  product_description: string | null;
  delivery_date: string | null;
  components: Component[];
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
    const { data } = await supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setOrders((data as Order[]) ?? []);
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
          <p className="text-sm text-muted-foreground">Cria orçamentos por componente, com sugestão IA da decoração.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="rounded-full"><Plus className="mr-1 h-4 w-4" />Nova encomenda</Button>
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
                  {o.delivery_date && <div className="mt-1 text-xs">📅 {new Date(o.delivery_date).toLocaleDateString("pt-PT")}</div>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(o.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {(o.components ?? []).map((c) => (
                  <Badge key={c.id} variant="secondary" className="rounded-full text-xs">
                    {c.label}: {fmtEUR(Number(c.cost))}
                  </Badge>
                ))}
              </div>

              <div className="mt-3 flex items-end justify-between border-t pt-3">
                <div>
                  <div className="text-xs text-muted-foreground">Custo / Preço</div>
                  <div className="font-display text-lg font-semibold">
                    {fmtEUR(Number(o.total_cost))} <span className="text-primary">→ {fmtEUR(Number(o.total_price))}</span>
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
          onCreated={() => { setOpen(false); load(); }}
        />
      )}
    </div>
  );
}

function NewOrderDialog({ open, onOpenChange, profile, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; profile: any; onCreated: () => void;
}) {
  const { user } = useAuth();
  const vocab = VOCAB[(profile.business_type ?? "outro") as BusinessType];
  const [client, setClient] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [components, setComponents] = useState<Component[]>(
    vocab.components.map((c) => ({ id: c.id, label: c.label, cost: 0 }))
  );
  const [decoNotes, setDecoNotes] = useState("");
  const [decoCost, setDecoCost] = useState(0);
  const [decoReason, setDecoReason] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  // reset on open
  useEffect(() => {
    if (open) {
      setClient(""); setDesc(""); setDate("");
      setComponents(vocab.components.map((c) => ({ id: c.id, label: c.label, cost: 0 })));
      setDecoNotes(""); setDecoCost(0); setDecoReason("");
    }
  }, [open]);

  const baseCost = components.filter((c) => c.id !== "decoracao").reduce((s, c) => s + Number(c.cost), 0);
  const totalCost = baseCost + Number(decoCost);
  const margin = (profile.profit_margin ?? 30) / 100;
  const totalPrice = totalCost * (1 + margin);

  async function suggestDeco() {
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("decoration-assistant", {
        body: {
          businessType: vocab.product,
          productDescription: desc,
          decorationNotes: decoNotes,
          baseCost,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDecoCost(Number(data.suggested_cost) || 0);
      setDecoReason(`${data.complexity} — ${data.reasoning}`);
      // sync into components
      setComponents((arr) => arr.map((c) => c.id === "decoracao" ? { ...c, cost: Number(data.suggested_cost) || 0 } : c));
      toast.success("Sugestão aplicada ✨");
    } catch (e: any) {
      toast.error(e?.message || "Erro do assistente");
    } finally {
      setAiBusy(false);
    }
  }

  async function save() {
    if (!user) return;
    if (!client.trim()) { toast.error("Indica o nome do cliente"); return; }
    setBusy(true);
    // make sure decoration component reflects current decoCost
    const finalComponents = components.map((c) => c.id === "decoracao" ? { ...c, cost: Number(decoCost) } : c);
    const { error } = await supabase.from("orders").insert({
      user_id: user.id,
      client_name: client.trim().slice(0, 100),
      product_description: desc.trim().slice(0, 500) || null,
      delivery_date: date || null,
      components: finalComponents,
      decoration_notes: decoNotes.trim().slice(0, 500) || null,
      decoration_cost: Number(decoCost),
      total_cost: totalCost,
      total_price: totalPrice,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Encomenda guardada!");
    onCreated();
  }

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
            <Label>Descrição do {vocab.product}</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} rows={2}
              placeholder={`Ex: ${vocab.product} para 12 pessoas, sabor chocolate`} />
          </div>

          <div className="space-y-2">
            <Label>Componentes</Label>
            {components.filter((c) => c.id !== "decoracao").map((c, idx) => (
              <div key={c.id} className="grid grid-cols-[1fr_140px] items-center gap-2">
                <div className="rounded-xl bg-muted/50 px-3 py-2 text-sm">{c.label}</div>
                <Input type="number" min="0" step="0.01" value={c.cost}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setComponents((arr) => arr.map((x, i) => arr.indexOf(c) === i ? { ...x, cost: v } : x));
                  }}
                  placeholder="€" />
              </div>
            ))}
          </div>

          {/* Decoration with AI */}
          <Card className="space-y-3 border-primary/30 bg-primary-soft/40 p-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" />Decoração</Label>
              <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={suggestDeco} disabled={aiBusy}>
                {aiBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
                Sugerir com IA
              </Button>
            </div>
            <Textarea value={decoNotes} onChange={(e) => setDecoNotes(e.target.value)} maxLength={500} rows={2}
              placeholder="Ex: pasta de açúcar branca, rosas comestíveis, topo personalizado" />
            <div className="grid grid-cols-[1fr_140px] items-center gap-2">
              <div className="text-sm text-muted-foreground">Custo de decoração</div>
              <Input type="number" min="0" step="0.01" value={decoCost} onChange={(e) => setDecoCost(parseFloat(e.target.value) || 0)} />
            </div>
            {decoReason && <p className="text-xs text-primary/80">💡 {decoReason}</p>}
          </Card>

          <div className="rounded-2xl border bg-gradient-to-br from-primary to-[oklch(0.65_0.18_155)] p-4 text-primary-foreground">
            <div className="flex items-baseline justify-between">
              <span className="text-sm opacity-90">Custo total</span>
              <span className="font-display text-xl font-bold">{fmtEUR(totalCost)}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-sm opacity-90">Preço (margem {Math.round(margin * 100)}%)</span>
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
