// Welcome email edge function — triggered by DB webhook on profiles INSERT
// Uses Resend via Lovable connector gateway

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

interface ProfileRecord {
  id: string;
  email: string | null;
  display_name: string | null;
  business_name?: string | null;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: ProfileRecord;
  old_record: ProfileRecord | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const WEBHOOK_SECRET = Deno.env.get("WELCOME_EMAIL_WEBHOOK_SECRET");

    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      console.error("Missing API keys");
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify shared webhook secret (set on the DB trigger headers)
    const providedSecret = req.headers.get("x-webhook-secret");
    if (!WEBHOOK_SECRET || providedSecret !== WEBHOOK_SECRET) {
      console.error("Unauthorized webhook call");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as WebhookPayload;

    if (payload.type !== "INSERT" || payload.table !== "profiles") {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profile = payload.record;
    if (!profile?.email) {
      return new Response(JSON.stringify({ skipped: "no email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name =
      (profile.business_name?.trim() || profile.display_name?.trim() || "").split(" ")[0] ||
      "criador";

    const appUrl =
      Deno.env.get("APP_URL") ||
      "https://id-preview--7549ef4d-c07d-457b-9945-779f7c986c93.lovable.app";

    const subject = "Bem-vindo ao Calculamus 🎉";
    const html = `
<!doctype html>
<html lang="pt-PT">
  <body style="margin:0;padding:0;background-color:#f6f9f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a2e1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f9f5;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3ebe1;">
            <tr>
              <td style="background:#16a34a;padding:28px 32px;color:#ffffff;">
                <h1 style="margin:0;font-size:24px;font-weight:700;">Calculamus</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
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
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#16a34a;border-radius:8px;">
                      <a href="${appUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;">
                        Aceder à minha conta
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:32px 0 0;font-size:14px;color:#6b7a6b;">
                  Qualquer dúvida, é só responder a este email. Estamos cá para ajudar.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#f6f9f5;font-size:12px;color:#6b7a6b;text-align:center;">
                © Calculamus · Saber o que vale o teu trabalho
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

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

    const result = await resendRes.json();
    if (!resendRes.ok) {
      console.error("Resend error", resendRes.status, result);
      return new Response(JSON.stringify({ error: "Send failed", details: result }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Welcome email sent", { to: profile.email, id: result?.id });
    return new Response(JSON.stringify({ ok: true, id: result?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("welcome-email error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
