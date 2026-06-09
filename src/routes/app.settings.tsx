import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/business-types";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user]);

  if (!profile) return <div className="py-10 text-center text-muted-foreground">A carregar…</div>;

  async function save() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      business_type: profile.business_type,
      business_name: profile.business_name,
      labor_rate_hour: profile.labor_rate_hour,
      machine_rate_hour: profile.machine_rate_hour,
      profit_margin: profile.profit_margin,
      monthly_work_hours: profile.monthly_work_hours,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Definições guardadas.");
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Definições</h1>
        <p className="text-sm text-muted-foreground">Personaliza a app ao teu negócio.</p>
      </header>

      <Card className="space-y-4 p-5">
        <div className="space-y-1.5">
          <Label>Tipo de negócio</Label>
          <Select value={profile.business_type ?? "outro"} onValueChange={(v) => setProfile({ ...profile, business_type: v as BusinessType })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPES.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.emoji} {b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Nome do negócio</Label>
          <Input value={profile.business_name ?? ""} onChange={(e) => setProfile({ ...profile, business_name: e.target.value })} maxLength={80} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Mão-de-obra €/h</Label>
            <Input type="number" step="0.5" min="0" value={profile.labor_rate_hour}
              onChange={(e) => setProfile({ ...profile, labor_rate_hour: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="space-y-1.5">
            <Label>Máquina €/h</Label>
            <Input type="number" step="0.5" min="0" value={profile.machine_rate_hour}
              onChange={(e) => setProfile({ ...profile, machine_rate_hour: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="space-y-1.5">
            <Label>Margem de lucro %</Label>
            <Input type="number" step="1" min="0" max="500" value={profile.profit_margin}
              onChange={(e) => setProfile({ ...profile, profit_margin: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="space-y-1.5">
            <Label>Horas trabalho/mês</Label>
            <Input type="number" step="1" min="1" value={profile.monthly_work_hours}
              onChange={(e) => setProfile({ ...profile, monthly_work_hours: parseFloat(e.target.value) || 1 })} />
          </div>
        </div>

        <Button onClick={save} disabled={busy} className="w-full rounded-full" size="lg">
          {busy ? "A guardar…" : "Guardar"}
        </Button>
      </Card>

      <PlanSection plan={profile.plan} email={profile.email} />
    </div>
  );
}

function PlanSection({ plan, email }: { plan: string; email: string | null }) {
  const isPro = plan === "pro";

  if (isPro) {
    return (
      <Card className="space-y-2 p-5">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold">Plano Pro ativo</h2>
          <Badge className="bg-green-600 hover:bg-green-600">Ativo</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Tens acesso a todas as funcionalidades do Calculamus.</p>
      </Card>
    );
  }

  const msg = `Olá! Quero ativar o plano Pro do Calculamus. O meu email é ${email ?? ""}.`;
  const url = `https://wa.me/351913589112?text=${encodeURIComponent(msg)}`;

  const benefits = [
    "Receitas ilimitadas",
    "Gestão de encomendas",
    "Assistente IA de decoração",
    "Suporte prioritário",
  ];

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="font-display text-xl font-bold">Plano Pro</h2>
        <p className="text-2xl font-bold text-primary">8,99€<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
      </div>
      <ul className="space-y-2">
        {benefits.map((b) => (
          <li key={b} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-600" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <Button asChild className="w-full rounded-full" size="lg">
        <a href={url} target="_blank" rel="noopener noreferrer">Ativar Plano Pro</a>
      </Button>
      <p className="text-xs text-muted-foreground">
        Após o pagamento por MBWay, o plano será ativado manualmente pelo administrador em até 24 horas.
      </p>
    </Card>
  );
}

