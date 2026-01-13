import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instance_id, token, environment, base_url } = await req.json();

    console.log("🗑️ Deleting instance:", { instance_id, hasToken: !!token, environment });

    // Get base url based on environment or use provided one
    let BASE_URL = base_url;
    if (!BASE_URL) {
      BASE_URL = environment?.toUpperCase() === "PROD"
        ? Deno.env.get("UZAPI_BASE_URL_PROD")
        : Deno.env.get("UZAPI_BASE_URL_TESTE");
    }

    const ADMIN_TOKEN = environment?.toUpperCase() === "PROD"
      ? Deno.env.get("UZAPI_ADMIN_TOKEN_PROD")
      : Deno.env.get("UZAPI_ADMIN_TOKEN_TESTE");

    if (!BASE_URL) {
      return new Response(JSON.stringify({ 
        error: "BASE_URL not configured" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // If we have a token, use it directly with /instance/delete
    if (token) {
      console.log("🗑️ Deleting with instance token using DELETE method...");
      
      // Try DELETE method first (standard REST)
      let deleteResponse = await fetch(`${BASE_URL}/instance/delete`, {
        method: "DELETE",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "token": token
        }
      });

      // If DELETE fails, try POST
      if (deleteResponse.status === 405) {
        console.log("🔄 DELETE failed, trying POST...");
        deleteResponse = await fetch(`${BASE_URL}/instance/delete`, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "token": token
          }
        });
      }

      // If still fails, try /instance/logout (disconnects and removes)
      if (!deleteResponse.ok) {
        console.log("🔄 Trying /instance/logout endpoint...");
        deleteResponse = await fetch(`${BASE_URL}/instance/logout`, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "token": token
          }
        });
      }

      const responseText = await deleteResponse.text();
      console.log("📡 Delete response:", responseText);

      let deleteData;
      try {
        deleteData = responseText ? JSON.parse(responseText) : {};
      } catch {
        deleteData = { raw: responseText };
      }

      if (deleteResponse.ok) {
        return new Response(JSON.stringify({
          success: true,
          message: "Instance deleted successfully",
          instance_id
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({
        error: "Failed to delete instance with token",
        details: deleteData
      }), {
        status: deleteResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // No token provided - try to get info and delete
    if (!instance_id) {
      return new Response(JSON.stringify({ 
        error: "instance_id or token is required" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!ADMIN_TOKEN) {
      return new Response(JSON.stringify({ 
        error: "Admin token not configured" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // First, get instance info to retrieve the token
    console.log("🔍 Fetching instance info...");
    const infoResponse = await fetch(`${BASE_URL}/instance/info/${instance_id}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "admintoken": ADMIN_TOKEN
      }
    });

    if (!infoResponse.ok) {
      // Try alternative endpoint
      console.log("🔄 Trying alternative info endpoint...");
      const altInfoResponse = await fetch(`${BASE_URL}/instance/${instance_id}`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "admintoken": ADMIN_TOKEN
        }
      });

      if (!altInfoResponse.ok) {
        const errorData = await altInfoResponse.text();
        console.log("❌ Could not get instance info:", errorData);
        return new Response(JSON.stringify({
          error: "Could not retrieve instance info",
          instance_id,
          details: errorData
        }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const altData = await altInfoResponse.json();
      const instanceToken = altData?.token || altData?.instance?.token;
      
      if (instanceToken) {
        // Try to delete with this token
        console.log("🗑️ Got token, attempting delete...");
        const deleteResponse = await fetch(`${BASE_URL}/instance/delete`, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "token": instanceToken
          }
        });

        if (deleteResponse.ok) {
          return new Response(JSON.stringify({
            success: true,
            message: "Instance deleted successfully",
            instance_id
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
    }

    const infoData = await infoResponse.json();
    console.log("📡 Instance info:", JSON.stringify(infoData));

    const instanceToken = infoData?.token || infoData?.instance?.token;
    
    if (!instanceToken) {
      return new Response(JSON.stringify({
        error: "Could not retrieve instance token",
        instance_id,
        info: infoData
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Delete using the retrieved token
    console.log("🗑️ Deleting with retrieved token...");
    const deleteResponse = await fetch(`${BASE_URL}/instance/delete`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "token": instanceToken
      }
    });

    const deleteText = await deleteResponse.text();
    console.log("📡 Delete response:", deleteText);

    let deleteData;
    try {
      deleteData = deleteText ? JSON.parse(deleteText) : {};
    } catch {
      deleteData = { raw: deleteText };
    }

    if (!deleteResponse.ok) {
      return new Response(JSON.stringify({
        error: "Failed to delete instance",
        details: deleteData
      }), {
        status: deleteResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("✅ Instance deleted successfully:", instance_id);

    return new Response(JSON.stringify({
      success: true,
      message: "Instance deleted successfully",
      instance_id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("❌ Error deleting instance:", err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
