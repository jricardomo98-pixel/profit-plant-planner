// Lovable AI — assistente de custo de decoração
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { businessType, productDescription, decorationNotes, baseCost } =
      await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `És um assistente especializado em precificação para pequenos negócios em Portugal (${businessType || "negócio artesanal"}). 
Sugeres um custo realista para a DECORAÇÃO de um produto, considerando:
- Materiais consumíveis (pasta de açúcar, flores, fitas, sprays comestíveis, etc.)
- Tempo extra estimado em mão-de-obra de detalhe
- Complexidade visual descrita pelo cliente
Devolves valores em EUROS, com bom-senso para mercado português.`;

    const userPrompt = `Produto: ${productDescription || "(não especificado)"}
Custo base atual (massa+recheio+cobertura): ${baseCost ?? 0} €
Decoração pedida: ${decorationNotes || "(simples)"}

Sugere o custo da decoração e justifica brevemente.`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_decoration_cost",
              description: "Sugestão de custo de decoração",
              parameters: {
                type: "object",
                properties: {
                  suggested_cost: {
                    type: "number",
                    description: "Custo sugerido em euros",
                  },
                  reasoning: {
                    type: "string",
                    description: "Justificação curta em português (1-2 frases)",
                  },
                  complexity: {
                    type: "string",
                    enum: ["simples", "média", "elaborada", "premium"],
                  },
                },
                required: ["suggested_cost", "reasoning", "complexity"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "suggest_decoration_cost" },
        },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429)
        return new Response(
          JSON.stringify({ error: "Limite de pedidos atingido. Tenta novamente em 1 minuto." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      if (resp.status === 402)
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adiciona créditos no Lovable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      throw new Error("AI gateway error");
    }

    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments
      ? JSON.parse(call.function.arguments)
      : { suggested_cost: 0, reasoning: "Sem sugestão.", complexity: "simples" };

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("decoration-assistant error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
