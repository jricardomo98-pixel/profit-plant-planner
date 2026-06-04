// Supabase Auth "Send Email" Hook handler.
// Receives the auth email event for signup/recovery/magiclink/etc., verifies the
// HMAC signature (standard webhooks), and sends a branded email via Resend.
//
// Configure in Supabase: Auth Settings → "Send Email Hook"
//   URL:    https://nfbqyxzpmjoibthctqlm.supabase.co/functions/v1/welcome-email
//   Secret: value of SEND_EMAIL_HOOK_SECRET (format: v1,whsec_<base64>)

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

interface AuthHookPayload {
  user: {
    id: string;
    email: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type:
      | "signup"
      | "invite"
      | "magiclink"
      | "recovery"
      | "email_change"
      | "email_change_new"
      | "email_change_current"
      | "reauthentication";
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET");

    if (!LOVABLE_API_KEY || !RESEND_API_KEY || !HOOK_SECRET) {
      console.error("Missing env vars", {
        hasLovable: !!LOVABLE_API_KEY,
        hasResend: !!RESEND_API_KEY,
        hasHook: !!HOOK_SECRET,
      });
      return json({ error: "Server not configured" }, 500);
    }

    // Verify HMAC signature using standard webhooks
    const rawBody = await req.text();
    const headers = Object.fromEntries(req.headers);

    let payload: AuthHookPayload;
    try {
      // standardwebhooks expects the secret WITHOUT the "v1,whsec_" prefix
      const secret = HOOK_SECRET.replace(/^v1,whsec_/, "");
      const wh = new Webhook(secret);
      payload = wh.verify(rawBody, headers) as AuthHookPayload;
    } catch (err) {
      console.error("Signature verification failed", err);
      return json({ error: "Invalid signature" }, 401);
    }

    const { user, email_data } = payload;
    if (!user?.email || !email_data) {
      return json({ error: "Invalid payload" }, 400);
    }

    // Build confirmation URL Supabase expects
    const confirmUrl =
      `${email_data.site_url}/auth/v1/verify` +
      `?token=${encodeURIComponent(email_data.token_hash)}` +
      `&type=${encodeURIComponent(email_data.email_action_type)}` +
      `&redirect_to=${encodeURIComponent(email_data.redirect_to || email_data.site_url)}`;

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const rawName =
      (typeof meta.business_name === "string" && meta.business_name.trim()) ||
      (typeof meta.display_name === "string" && meta.display_name.trim()) ||
      (typeof meta.full_name === "string" && meta.full_name.trim()) ||
      "";
    const name = (rawName as string).split(" ")[0] || "criador";

    const action = email_data.email_action_type;

    let subject: string;
    let html: string;

    if (action === "signup") {
      subject = "Bem-vindo ao Calculamus 🎉 Confirma a tua conta";
      html = renderWelcomeWithConfirm(name, confirmUrl);
    } else if (action === "recovery") {
      subject = "Calculamus · Recuperar palavra-passe";
      html = renderSimpleAction(
        "Recuperar palavra-passe",
        "Recebemos um pedido para repor a tua palavra-passe. Clica no botão abaixo para criar uma nova.",
        "Repor palavra-passe",
        confirmUrl,
      );
    } else if (action === "magiclink") {
      subject = "Calculamus · O teu link de acesso";
      html = renderSimpleAction(
        "Entra na tua conta",
        "Clica no botão abaixo para entrares no Calculamus.",
        "Entrar",
        confirmUrl,
      );
    } else if (action === "email_change" || action === "email_change_new") {
      subject = "Calculamus · Confirma o novo email";
      html = renderSimpleAction(
        "Confirma o novo email",
        "Para concluíres a alteração do teu email, confirma o pedido clicando no botão abaixo.",
        "Confirmar email",
        confirmUrl,
      );
    } else if (action === "invite") {
      subject = "Foste convidado(a) para o Calculamus";
      html = renderSimpleAction(
        "Bem-vindo(a) ao Calculamus",
        "Foste convidado(a) a juntares-te. Clica no botão abaixo para criar a tua palavra-passe e ativar a conta.",
        "Aceitar convite",
        confirmUrl,
      );
    } else {
      subject = "Calculamus · Confirma a ação";
      html = renderSimpleAction(
        "Confirma a ação",
        "Confirma esta ação para continuares.",
        "Confirmar",
        confirmUrl,
      );
    }

    const resendRes = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Calculamus <onboarding@resend.dev>",
        to: [user.email],
        subject,
        html,
      }),
    });

    const result = await resendRes.json().catch(() => ({}));
    if (!resendRes.ok) {
      console.error("Resend error", resendRes.status, result);
      return json({ error: "Send failed", details: result }, 502);
    }

    console.log("Auth email sent", { to: user.email, action, id: result?.id });
    return json({ ok: true, id: result?.id }, 200);
  } catch (err) {
    console.error("welcome-email handler error", err);
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

function layout(innerHtml: string) {
  return `<!doctype html>
<html lang="pt-PT">
  <body style="margin:0;padding:0;background-color:#f6f9f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a2e1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f9f5;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3ebe1;">
          <tr><td style="background:#16a34a;padding:28px 32px;color:#ffffff;">
            <h1 style="margin:0;font-size:24px;font-weight:700;">Calculamus</h1>
          </td></tr>
          <tr><td style="padding:32px;">${innerHtml}</td></tr>
          <tr><td style="padding:20px 32px;background:#f6f9f5;font-size:12px;color:#6b7a6b;text-align:center;">
            © Calculamus · Saber o que vale o teu trabalho
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function ctaButton(label: string, url: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="background:#16a34a;border-radius:8px;">
      <a href="${url}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr></table>`;
}

function renderWelcomeWithConfirm(name: string, confirmUrl: string) {
  return layout(`
    <h2 style="margin:0 0 16px;font-size:22px;">Olá ${escapeHtml(name)}, bem-vindo(a) ao Calculamus! 🎉</h2>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
      Falta só um passo para ativares a tua conta. Confirma o teu email clicando no botão abaixo:
    </p>
    ${ctaButton("Confirmar conta e entrar", confirmUrl)}
    <p style="margin:24px 0 16px;font-size:16px;line-height:1.5;">
      Depois de confirmares, vais poder:
    </p>
    <ul style="margin:0 0 24px;padding-left:20px;font-size:16px;line-height:1.6;">
      <li>Calcular o custo real de cada receita</li>
      <li>Criar e gerir encomendas dos teus clientes</li>
      <li>Acompanhar o teu negócio com um dashboard simples</li>
    </ul>
    <p style="margin:0 0 8px;font-size:14px;color:#6b7a6b;">
      Se o botão não funcionar, copia este link para o teu browser:
    </p>
    <p style="margin:0 0 24px;font-size:12px;color:#6b7a6b;word-break:break-all;">
      <a href="${confirmUrl}" style="color:#16a34a;">${escapeHtml(confirmUrl)}</a>
    </p>
    <p style="margin:0;font-size:14px;color:#6b7a6b;">
      Se não foste tu a criar esta conta, podes ignorar este email.
    </p>
  `);
}

function renderSimpleAction(title: string, body: string, cta: string, url: string) {
  return layout(`
    <h2 style="margin:0 0 16px;font-size:22px;">${escapeHtml(title)}</h2>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.5;">${escapeHtml(body)}</p>
    ${ctaButton(cta, url)}
    <p style="margin:24px 0 8px;font-size:14px;color:#6b7a6b;">
      Se o botão não funcionar, copia este link para o teu browser:
    </p>
    <p style="margin:0;font-size:12px;color:#6b7a6b;word-break:break-all;">
      <a href="${url}" style="color:#16a34a;">${escapeHtml(url)}</a>
    </p>
  `);
}
