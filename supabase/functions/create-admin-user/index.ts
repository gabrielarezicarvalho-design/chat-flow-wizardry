import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { secret_key } = await req.json();
    
    // Simple secret to prevent unauthorized access
    if (secret_key !== "MARKETFLOW_ADMIN_SETUP_2026") {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if admin already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const adminExists = existingUsers?.users?.some(u => u.email === "admin@marketflow.com.br");
    
    if (adminExists) {
      // Find the user and ensure they have admin role
      const adminUser = existingUsers?.users?.find(u => u.email === "admin@marketflow.com.br");
      
      if (adminUser) {
        // Ensure admin role exists
        await supabase
          .from("user_roles")
          .upsert({ user_id: adminUser.id, role: "admin" }, { onConflict: "user_id,role" });
      }
      
      return new Response(
        JSON.stringify({ message: "Admin user already exists", email: "admin@marketflow.com.br" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: "admin@marketflow.com.br",
      password: "@marketflow2026#",
      email_confirm: true,
      user_metadata: {
        full_name: "MarketFlow Admin",
        company_name: "MarketFlow"
      }
    });

    if (createError) {
      console.error("Error creating admin:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign admin role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: "admin" });

    if (roleError) {
      console.error("Error assigning role:", roleError);
    }

    // Create profile
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: newUser.user.id,
        full_name: "MarketFlow Admin",
        company_name: "MarketFlow",
        is_company_admin: true
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Admin user created successfully",
        email: "admin@marketflow.com.br",
        password: "@marketflow2026#"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
