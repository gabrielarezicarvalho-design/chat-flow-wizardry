import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { environment } = await req.json();

    console.log("📋 Listing instances for environment:", environment);

    // Get admin token and base url based on environment
    const envUpper = environment?.toUpperCase();
    let ADMIN_TOKEN: string | undefined;
    let BASE_URL: string | undefined;
    if (envUpper === "BTZAP") {
      ADMIN_TOKEN = Deno.env.get("UZAPI_ADMIN_TOKEN_BTZAP");
      BASE_URL = Deno.env.get("UZAPI_BASE_URL_BTZAP") || "https://server.btzap.com.br";
    } else if (envUpper === "PROD") {
      ADMIN_TOKEN = Deno.env.get("UZAPI_ADMIN_TOKEN_PROD");
      BASE_URL = Deno.env.get("UZAPI_BASE_URL_PROD");
    } else {
      ADMIN_TOKEN = Deno.env.get("UZAPI_ADMIN_TOKEN_TESTE");
      BASE_URL = Deno.env.get("UZAPI_BASE_URL_TESTE");
    }

    if (!ADMIN_TOKEN || !BASE_URL) {
      return new Response(JSON.stringify({ 
        error: "Configuration not found for environment",
        environment 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 1. List all instances from UAZAPI - try multiple endpoints
    console.log("🔍 Fetching instances from UAZAPI...");
    
    // Try /instance/all first (common endpoint)
    let uazapiResponse = await fetch(`${BASE_URL}/instance/all`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "admintoken": ADMIN_TOKEN
      }
    });

    // If not found, try /instances
    if (uazapiResponse.status === 404) {
      console.log("🔄 Trying /instances endpoint...");
      uazapiResponse = await fetch(`${BASE_URL}/instances`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "admintoken": ADMIN_TOKEN
        }
      });
    }

    // If still not found, try /admin/instances
    if (uazapiResponse.status === 404) {
      console.log("🔄 Trying /admin/instances endpoint...");
      uazapiResponse = await fetch(`${BASE_URL}/admin/instances`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "admintoken": ADMIN_TOKEN
        }
      });
    }

    const uazapiData = await uazapiResponse.json();
    console.log("📡 UAZAPI response:", JSON.stringify(uazapiData, null, 2));

    if (!uazapiResponse.ok) {
      return new Response(JSON.stringify({
        error: "Failed to list instances from UAZAPI",
        details: uazapiData
      }), {
        status: uazapiResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Extract instances array from response
    const uazapiInstances = uazapiData?.instances || uazapiData || [];
    console.log(`📊 Found ${uazapiInstances.length} instances in UAZAPI`);

    // 2. Get all connections from Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: dbConnections, error: dbError } = await supabase
      .from("connections")
      .select("id, instance_id, instance_name, status, phone_number, created_at");

    if (dbError) {
      console.error("❌ Database error:", dbError);
      return new Response(JSON.stringify({
        error: "Failed to fetch connections from database",
        details: dbError
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`📊 Found ${dbConnections?.length || 0} connections in database`);

    // 3. Compare and categorize
    const uazapiInstanceIds = new Set(uazapiInstances.map((i: any) => i.id));
    const dbInstanceIds = new Set(dbConnections?.map(c => c.instance_id).filter(Boolean));

    // Instances only in UAZAPI (orphaned in UAZAPI)
    const onlyInUazapi = uazapiInstances.filter((i: any) => !dbInstanceIds.has(i.id)).map((i: any) => ({
      id: i.id,
      name: i.name,
      status: i.status,
      token: i.token, // Include token for deletion
      can_delete: true
    }));
    
    // Connections only in DB (orphaned in DB - instance was deleted in UAZAPI)
    const onlyInDb = (dbConnections?.filter((c: any) => c.instance_id && !uazapiInstanceIds.has(c.instance_id)) || []).map((c: any) => ({
      db_id: c.id,
      instance_id: c.instance_id,
      instance_name: c.instance_name,
      status: c.status,
      can_cleanup: true
    }));
    
    // Synced (exists in both)
    const synced = (dbConnections?.filter((c: any) => c.instance_id && uazapiInstanceIds.has(c.instance_id)) || []).map((c: any) => {
      const uazapiInstance = uazapiInstances.find((i: any) => i.id === c.instance_id);
      return {
        db_id: c.id,
        instance_id: c.instance_id,
        instance_name: c.instance_name,
        db_status: c.status,
        uazapi_status: uazapiInstance?.status || "unknown"
      };
    });

    const formattedUazapiInstances = uazapiInstances.map((i: any) => ({
      id: i.id,
      name: i.name,
      status: i.status,
      token: i.token,
      owner: i.owner || i.profileName,
      connected: i.status === "connected",
      created: i.created
    }));

    const result = {
      success: true,
      environment,
      base_url: BASE_URL,
      summary: {
        total_uazapi: uazapiInstances.length,
        total_db: dbConnections?.length || 0,
        synced: synced.length,
        only_in_uazapi: onlyInUazapi.length,
        only_in_db: onlyInDb.length
      },
      uazapi_instances: formattedUazapiInstances,
      only_in_uazapi: onlyInUazapi,
      only_in_db: onlyInDb,
      synced: synced
    };

    console.log("✅ Sync report generated:", JSON.stringify(result.summary));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("❌ Error listing instances:", err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
