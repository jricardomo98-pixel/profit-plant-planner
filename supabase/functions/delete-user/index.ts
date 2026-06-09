// Admin-only: permanently delete a user account
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const jwt = authHeader.replace("Bearer ", "");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY =
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE)
      return json({ error: "Server misconfigured" }, 500);

    // Verify caller
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    // Verify caller is admin (using service role to bypass RLS safely)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) {
      console.error("delete-user role lookup error", roleErr);
      return json({ error: "Service temporarily unavailable" }, 500);
    }
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const targetId = body?.user_id;
    if (!targetId || typeof targetId !== "string")
      return json({ error: "user_id is required" }, 400);

    if (targetId === callerId)
      return json({ error: "Não podes eliminar a tua própria conta" }, 400);

    const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
    if (delErr) {
      console.error("delete-user deletion error", delErr);
      return json({ error: "Service temporarily unavailable" }, 500);
    }

    return json({ success: true });
  } catch (e) {
    console.error("delete-user error", e);
    return json({ error: "Service temporarily unavailable" }, 500);
  }
});
