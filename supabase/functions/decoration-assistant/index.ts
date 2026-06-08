// Lovable AI — assistente de custo de decoração
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ---- Auth ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const jwt = authHeader.replace("Bearer ", "");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY =
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Input ----
    const body = await req.json().catch(() => ({}));
    const MAX_LEN = 500;
    const sanitize = (s: unknown) =>
      typeof s === "string" ? s.slice(0, MAX_LEN) : "";
    const decorationNotes = sanitize(body.decorationNotes);
    const businessType = sanitize(body.businessType) || "pastelaria artesanal";
    const laborRateHour =
      typeof body.laborRateHour === "number" && isFinite(body.laborRateHour)
        ? Math.max(0, Math.min(body.laborRateHour, 1000))
        : 0;
    // imageBase64 should be a data URL (data:image/...;base64,XXXX) or a raw base64 string
    const imageBase64 =
      typeof body.imageBase64 === "string" && body.imageBase64.length < 8_000_000
        ? body.imageBase64
        : "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `És um assistente especializado em ${businessType} portuguesa. O teu objetivo é estimar o custo de decoração de um bolo com base na descrição e/ou imagem fornecida. Considera que a taxa de mão de obra do utilizador é de ${laborRateHour}€/hora. Responde APENAS com um número decimal (ex: 12.50), sem texto adicional, sem símbolos de moeda, sem explicações. Este valor é uma estimativa aproximada.`;

    // Build user message with optional image
    const userContent: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `Decoração pedida: ${decorationNotes || "(sem descrição)"}`,
      },
    ];
    if (imageBase64) {
      const dataUrl = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;
      userContent.push({
        type: "image_url",
        image_url: { url: dataUrl },
      });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de pedidos atingido. Tenta novamente em 1 minuto." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adiciona créditos no Lovable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      throw new Error("AI gateway error");
    }

    const data = await resp.json();
    const raw: string = data.choices?.[0]?.message?.content ?? "";
    // Parse a decimal number from response (tolerate stray text)
    const match = raw.replace(",", ".").match(/-?\d+(\.\d+)?/);
    const suggested_cost = match ? Math.max(0, parseFloat(match[0])) : 0;

    return new Response(JSON.stringify({ suggested_cost }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("decoration-assistant error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
