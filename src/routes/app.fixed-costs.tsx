import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Wallet } from "lucide-react";
import { fmtEUR } from "@/lib/format";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/app/fixed-costs")({ component: FixedCostsPage });

type Row = { id: string; name: string; amount: number; category: string | null };

const schema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(80),
  amount: z.number().min(0).max(1_000_000),
  category: z.string().max(40).optional().nullable(),
});

const SUGGESTIONS = ["Renda", "Eletricidade", "Água", "Internet", "Contabilidade", "Seguros", "Software"];

function FixedCostsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!user) return;
    const { data } = await supabase.from("fixed_costs").select("*").eq("user_id", user.id).order("created_at");
    setRows((data as Row[]) ?? []);
  }
  useEffect(() => { load(); }, [user]);

  async function add() {
    if (!user) return;
    const parsed = schema.safeParse({ name, amount: parseFloat(amount) || 0, category: null });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { error } = await supabase.from("fixed_costs").insert({ user_id: user.id, ...parsed.data });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setName(""); setAmount("");
    load();
  }

  async function remove(id: string) {
    await supabase.from("fixed_costs").delete().eq("id", id);
    load();
  }

  const total = rows.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Custos fixos do mês</h1>
          <p className="text-sm text-muted-foreground">Despesas que tens todos os meses, mesmo sem produzir.</p>
        </div>
      </header>

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary-soft to-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Wallet className="h-5 w-5" /></div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total mensal</div>
            <div className="font-display text-3xl font-bold text-primary">{fmtEUR(total)}</div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="grid gap-2 md:grid-cols-[1fr_140px_auto]">
          <Input placeholder="Ex: Renda" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          <Input type="number" step="0.01" min="0" placeholder="€ / mês" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button onClick={add} disabled={busy} className="rounded-full"><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => setName(s)} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-primary-soft hover:text-primary">
              {s}
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
            Sem custos fixos ainda. Adiciona o primeiro acima ☝️
          </div>
        )}
        {rows.map((r) => (
          <Card key={r.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium">{r.name}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="font-display text-lg font-semibold">{fmtEUR(Number(r.amount))}</div>
              <Button variant="ghost" size="icon" onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
