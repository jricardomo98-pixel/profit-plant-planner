import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Home, Calculator, Wallet, Boxes, ClipboardList, LogOut, Settings, Shield } from "lucide-react";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import type { BusinessType } from "@/lib/business-types";

type ProfileCtx = {
  businessType: BusinessType;
  businessName: string | null;
  laborRate: number;
  machineRate: number;
  profitMargin: number;
  monthlyHours: number;
};

export const Route = createFileRoute("/app")({
  component: AppShell,
});

function AppShell() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const [{ data: prof }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (!alive) return;
      const admin = (roles ?? []).some((r: any) => r.role === "admin");
      // Bloqueia utilizadores suspensos (exceto admins)
      if (prof?.status === "suspended" && !admin) {
        navigate({ to: "/suspended" });
        return;
      }
      setProfile(prof);
      setIsAdmin(admin);
      setProfileLoading(false);
    })();
    return () => { alive = false; };
  }, [user, navigate]);

  if (loading || !user || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const onboarded = profile?.onboarded === true;

  const tabs = [
    { to: "/app", label: "Início", icon: Home, exact: true },
    { to: "/app/calculator", label: "Calcular", icon: Calculator },
    { to: "/app/ingredients", label: "Materiais", icon: Boxes },
    { to: "/app/orders", label: "Encomendas", icon: ClipboardList },
    { to: "/app/fixed-costs", label: "Custos", icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-soft/40 via-background to-background pb-24">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
          <Link to="/app" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Calculator className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-bold">Calculamus</span>
          </Link>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="icon" className="rounded-full" title="Admin"><Shield className="h-4 w-4" /></Button>
              </Link>
            )}
            <Link to="/app/settings">
              <Button variant="ghost" size="icon" className="rounded-full"><Settings className="h-4 w-4" /></Button>
            </Link>
            <Button variant="ghost" size="icon" className="rounded-full"
              onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* desktop tabs */}
        <nav className="mx-auto hidden max-w-5xl gap-1 px-4 pb-2 md:flex md:px-6">
          {tabs.map((t) => {
            const active = t.exact ? location.pathname === t.to : location.pathname.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}>
                <t.icon className="h-4 w-4" />{t.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-6 md:px-6">
        <Outlet />
      </main>

      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-5xl grid-cols-5">
          {tabs.map((t) => {
            const active = t.exact ? location.pathname === t.to : location.pathname.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${active ? "text-primary" : "text-muted-foreground"}`}>
                <t.icon className="h-5 w-5" />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {!onboarded && (
        <OnboardingDialog
          userId={user.id}
          onDone={async () => {
            const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
            setProfile(data);
          }}
        />
      )}
    </div>
  );
}
