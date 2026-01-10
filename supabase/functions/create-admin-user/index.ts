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
    const { secret_key, email, password, username } = await req.json();
    
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

    const userEmail = email || "admin@marketflow.com.br";
    const userPassword = password || "@marketflow2026#";
    const userUsername = username || "admin";

    // Check if admin already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const adminExists = existingUsers?.users?.some(u => u.email === userEmail);
    
    if (adminExists) {
      const adminUser = existingUsers?.users?.find(u => u.email === userEmail);
      
      if (adminUser) {
        // Ensure admin role exists
        await supabase
          .from("user_roles")
          .upsert({ user_id: adminUser.id, role: "admin" }, { onConflict: "user_id,role" });
        
        // Update profile username
        await supabase
          .from("profiles")
          .update({ username: userUsername, full_name: userUsername })
          .eq("id", adminUser.id);
      }
      
      return new Response(
        JSON.stringify({ message: "Admin user already exists and updated", email: userEmail }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true,
      user_metadata: {
        full_name: userUsername,
        username: userUsername
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

    // Update profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: userUsername,
        username: userUsername,
        is_company_admin: true
      })
      .eq("id", newUser.user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Admin user created successfully",
        email: userEmail,
        username: userUsername
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
