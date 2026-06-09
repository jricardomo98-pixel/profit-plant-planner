import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/business-types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, ArrowRight } from "lucide-react";

export function OnboardingDialog({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<BusinessType | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [laborRate, setLaborRate] = useState(10);
  const [machineRate, setMachineRate] = useState(2);
  const [profit, setProfit] = useState(30);
  const [busy, setBusy] = useState(false);

  async function finish() {
    if (!type || !displayName.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName.trim(),
      business_type: type,
      business_name: businessName || null,
      labor_rate_hour: laborRate,
      machine_rate_hour: machineRate,
      profit_margin: profit,
      onboarded: true,
      updated_at: new Date().toISOString(),
    }).eq("id", userId);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tudo pronto! Vamos calcular.");
    onDone();
  }

  return (
    <Dialog open>
      <DialogContent className="max-w-lg rounded-3xl border-0 p-0 sm:max-w-lg">
        <div className="rounded-3xl bg-gradient-to-b from-primary-soft to-background p-6">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
              <Sparkles className="h-6 w-6" />
            </div>
            <DialogTitle className="font-display text-2xl">
              {step === 1 ? "Bem-vindo ao Calculamus 👋" : "Algumas definições rápidas"}
            </DialogTitle>
            <DialogDescription>
              {step === 1
                ? "Para adaptarmos a linguagem ao teu negócio, diz-nos o que fazes."
                : "Pode editar isto depois nas Definições."}
            </DialogDescription>
          </DialogHeader>

          {step === 1 ? (
            <>
              <div className="mt-5 grid max-h-[50vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {BUSINESS_TYPES.map((b) => {
                  const active = type === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setType(b.id)}
                      className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition ${active ? "border-primary bg-primary-soft shadow-[var(--shadow-soft)]" : "border-border bg-card hover:border-primary/40"}`}
                    >
                      <span className="text-2xl">{b.emoji}</span>
                      <div>
                        <div className="font-display text-sm font-semibold">{b.label}</div>
                        <div className="text-xs text-muted-foreground">{b.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button
                disabled={!type}
                onClick={() => setStep(2)}
                className="mt-5 w-full rounded-full"
                size="lg"
              >
                Continuar <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label>O teu nome</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} placeholder="Ex: Célia Silva" required />
              </div>
              <div className="space-y-1.5">
                <Label>Nome do negócio (opcional)</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={80} placeholder="Ex: Doçaria da Ana" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Mão-de-obra €/h</Label>
                  <Input type="number" step="0.5" min="0" value={laborRate}
                    onChange={(e) => setLaborRate(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Máquina €/h</Label>
                  <Input type="number" step="0.5" min="0" value={machineRate}
                    onChange={(e) => setMachineRate(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Margem de lucro padrão %</Label>
                <Input type="number" step="1" min="0" max="500" value={profit}
                  onChange={(e) => setProfit(parseFloat(e.target.value) || 0)} />
              </div>
              <Button onClick={finish} disabled={busy} className="w-full rounded-full" size="lg">
                {busy ? "A guardar…" : "Começar"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
