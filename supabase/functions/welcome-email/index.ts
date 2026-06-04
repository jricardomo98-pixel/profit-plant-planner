// Welcome email edge function — triggered by DB trigger after profiles INSERT.
// Security model: verify_jwt is off (called by Postgres over HTTP), but the
// function re-validates the user_id against the DB using the service role and
// only sends if the profile was just created (<= 5 min old). This means the
// worst an attacker can do is re-trigger a welcome email to a real, newly
// signed-up user at their real email address.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !RESEND_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("Missing env vars");
      return json({ error: "Server not configured" }, 500);
    }

    const payload = await req.json().catch(() => ({}));
    const userId: string | undefined = payload?.record?.id;
    if (!userId) return json({ error: "Missing user id" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: profile, error } = await admin
      .from("profiles")
      .select("id, email, display_name, business_name, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (error || !profile) {
      console.error("Profile lookup failed", error);
      return json({ error: "Profile not found" }, 404);
    }

    // Only allow this endpoint to send for profiles created very recently —
    // prevents replay/spam against arbitrary existing accounts.
    const ageMs = Date.now() - new Date(profile.created_at).getTime();
    if (ageMs > 5 * 60 * 1000) {
      console.warn("Profile too old, skipping welcome email", { userId, ageMs });
      return json({ skipped: "profile too old" }, 200);
    }

    if (!profile.email) return json({ skipped: "no email" }, 200);

    const rawName = (profile.business_name?.trim() || profile.display_name?.trim() || "");
    const name = rawName.split(" ")[0] || "criador";

    const appUrl =
      Deno.env.get("APP_URL") ||
      "https://id-preview--7549ef4d-c07d-457b-9945-779f7c986c93.lovable.app";

    const subject = "Bem-vindo ao Calculamus 🎉";
    const html = renderEmail(name, appUrl);

    const resendRes = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Calculamus <onboarding@resend.dev>",
        to: [profile.email],
        subject,
        html,
      }),
    });

    const result = await resendRes.json().catch(() => ({}));
    if (!resendRes.ok) {
      console.error("Resend error", resendRes.status, result);
      return json({ error: "Send failed", details: result }, 502);
    }

    console.log("Welcome email sent", { to: profile.email, id: result?.id });
    return json({ ok: true, id: result?.id }, 200);
  } catch (err) {
    console.error("welcome-email error", err);
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderEmail(name: string, appUrl: string) {
  return `<!doctype html>
<html lang="pt-PT">
  <body style="margin:0;padding:0;background-color:#f6f9f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a2e1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f9f5;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3ebe1;">
          <tr><td style="background:#16a34a;padding:28px 32px;color:#ffffff;">
            <h1 style="margin:0;font-size:24px;font-weight:700;">Calculamus</h1>
          </td></tr>
          <tr><td style="padding:32px;">
            <h2 style="margin:0 0 16px;font-size:22px;">Olá ${escapeHtml(name)}, bem-vindo(a)! 🎉</h2>
            <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
              Estamos muito contentes por te ter no Calculamus. A partir de agora podes:
            </p>
            <ul style="margin:0 0 24px;padding-left:20px;font-size:16px;line-height:1.6;">
              <li>Calcular o custo real de cada receita</li>
              <li>Criar e gerir encomendas dos teus clientes</li>
              <li>Acompanhar o teu negócio com um dashboard simples</li>
            </ul>
            <p style="margin:0 0 28px;font-size:16px;line-height:1.5;">
              Tens 14 dias de trial para explorar tudo sem compromisso.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="background:#16a34a;border-radius:8px;">
                <a href="${appUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;">
                  Aceder à minha conta
                </a>
              </td>
            </tr></table>
            <p style="margin:32px 0 0;font-size:14px;color:#6b7a6b;">
              Qualquer dúvida, é só responder a este email. Estamos cá para ajudar.
            </p>
          </td></tr>
          <tr><td style="padding:20px 32px;background:#f6f9f5;font-size:12px;color:#6b7a6b;text-align:center;">
            © Calculamus · Saber o que vale o teu trabalho
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
