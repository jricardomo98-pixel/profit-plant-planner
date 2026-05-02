import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/suspended")({
  head: () => ({
    meta: [
      { title: "Conta suspensa — Calculamus" },
      { name: "description", content: "O acesso à tua conta foi suspenso." },
    ],
  }),
  component: SuspendedPage,
});

function SuspendedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-soft/30 via-background to-background px-4">
      <div className="w-full max-w-lg rounded-3xl border bg-card p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="font-display text-2xl font-bold">Conta suspensa</h1>
        <p className="mt-3 text-muted-foreground">
          O acesso à tua conta foi suspenso. Para regularizar a situação ou obter mais informações,
          contacta a nossa equipa de suporte.
        </p>
        <a
          href="mailto:suporte@calculamus.app"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Mail className="h-4 w-4" /> suporte@calculamus.app
        </a>
        <div className="mt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
          >
            Terminar sessão
          </Button>
        </div>
        <Link to="/" className="mt-2 block text-xs text-muted-foreground hover:text-foreground">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
