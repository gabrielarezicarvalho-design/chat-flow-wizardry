import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Action = "list_settings" | "upsert_key" | "delete_key" | "save_model";
type Provider = "openai" | "google" | "asaas";

interface RequestBody {
  action?: Action;
  provider?: Provider;
  apiKey?: string;
  model?: string;
}

const keyNameByProvider: Record<Provider, string> = {
  openai: "ai_openai_key",
  google: "ai_gemini_key",
  asaas: "ai_asaas_key",
};

const modelNameByProvider: Partial<Record<Provider, string>> = {
  openai: "ai_openai_model",
  google: "ai_gemini_model",
};

const aiSettingKeys = [
  "ai_openai_key",
  "ai_openai_model",
  "ai_gemini_key",
  "ai_gemini_model",
  "ai_asaas_key",
];

const extractStringValue = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed && trimmed !== "null" ? trimmed : null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return extractStringValue(record.apiKey ?? record.key ?? record.value);
  }

  return null;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Usuário não autenticado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "Configuração do backend incompleta" }, 500);
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: "Sessão inválida" }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Erro ao buscar perfil:", profileError);
      return jsonResponse({ error: "Erro ao buscar empresa do usuário" }, 500);
    }

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });

    let companyId: string | null = profile?.company_id ?? null;

    if (!companyId && !isAdmin) {
      return jsonResponse({ error: "Empresa não encontrada para este usuário" }, 400);
    }

    const body = (await req.json()) as RequestBody;
    if (!body.action) {
      return jsonResponse({ error: "Ação é obrigatória" }, 400);
    }

    if (body.action === "list_settings") {
      let settingsQuery = supabaseAdmin
        .from("settings")
        .select("id, company_id, key, value, created_at, updated_at")
        .in("key", aiSettingKeys);

      settingsQuery = companyId === null
        ? settingsQuery.is("company_id", null)
        : settingsQuery.eq("company_id", companyId);

      const { data: settings, error } = await settingsQuery;

      if (error) {
        console.error("Erro ao listar configurações IA:", error);
        return jsonResponse({ error: "Não foi possível carregar as configurações" }, 500);
      }

      return jsonResponse({
        settings: (settings ?? []).map((setting) => {
          const value = extractStringValue(setting.value);
          const isSecretKey = setting.key.endsWith("_key");

          return {
            ...setting,
            value: isSecretKey ? (value ? "__configured__" : null) : value,
            is_configured: Boolean(value),
          };
        }),
      });
    }

    if (!body.provider) {
      return jsonResponse({ error: "Provedor é obrigatório" }, 400);
    }

    if (!(body.provider in keyNameByProvider)) {
      return jsonResponse({ error: "Provedor inválido" }, 400);
    }

    if (body.action === "upsert_key") {
      const apiKey = body.apiKey?.trim();
      if (!apiKey) {
        return jsonResponse({ error: "Informe uma chave de API válida" }, 400);
      }

      const { error } = await supabaseAdmin
        .from("settings")
        .upsert(
          {
            company_id: companyId,
            key: keyNameByProvider[body.provider],
            value: apiKey,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "company_id,key" },
        );

      if (error) {
        console.error("Erro ao salvar chave IA:", error);
        return jsonResponse({ error: "Não foi possível salvar a chave" }, 500);
      }

      return jsonResponse({ success: true });
    }

    if (body.action === "delete_key") {
      const { error } = await supabaseAdmin
        .from("settings")
        .delete()
        .eq("company_id", companyId)
        .eq("key", keyNameByProvider[body.provider]);

      if (error) {
        console.error("Erro ao remover chave IA:", error);
        return jsonResponse({ error: "Não foi possível remover a chave" }, 500);
      }

      return jsonResponse({ success: true });
    }

    if (body.action === "save_model") {
      const settingKey = modelNameByProvider[body.provider];
      const model = body.model?.trim();

      if (!settingKey) {
        return jsonResponse({ error: "Modelo não suportado para este provedor" }, 400);
      }

      if (!model) {
        return jsonResponse({ error: "Informe um modelo válido" }, 400);
      }

      const { error } = await supabaseAdmin
        .from("settings")
        .upsert(
          {
            company_id: companyId,
            key: settingKey,
            value: model,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "company_id,key" },
        );

      if (error) {
        console.error("Erro ao salvar modelo IA:", error);
        return jsonResponse({ error: "Não foi possível salvar o modelo" }, 500);
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Ação inválida" }, 400);
  } catch (error) {
    console.error("Erro inesperado em company-ai-settings:", error);
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return jsonResponse({ error: message }, 500);
  }
});