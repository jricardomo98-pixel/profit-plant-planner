import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        toast.success("Conta criada! Bem-vindo ao Calculamus.");
      } else {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao autenticar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-soft via-background to-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <Calculator className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold">Calculamus</h1>
          <p className="text-sm text-muted-foreground">Custos & lucro para pequenos negócios</p>
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-5 flex rounded-full bg-muted p-1">
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${mode === "signup" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              Criar conta
            </button>
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${mode === "signin" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              Entrar
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Palavra-passe</Label>
              <Input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} maxLength={72} />
            </div>
            <Button type="submit" className="w-full rounded-full" size="lg" disabled={busy}>
              {busy ? "Aguarda…" : mode === "signup" ? "Criar conta" : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
