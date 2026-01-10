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
    const { secret_key, email, password, username, full_name, company_id, is_company_admin } = await req.json();
    
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

    // Use username-based email - ALWAYS use internal.marketflow.local domain
    const userUsername = username || "admin";
    // Force internal email format for username-based login
    const userEmail = `${userUsername}@internal.marketflow.local`;
    const userPassword = password || "@marketflow2026#";
    const userFullName = full_name || userUsername;

    // Check if user already exists by email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const adminExists = existingUsers?.users?.some(u => u.email === userEmail);
    
    if (adminExists) {
      const adminUser = existingUsers?.users?.find(u => u.email === userEmail);
      
      if (adminUser) {
        // Ensure admin role exists
        await supabase
          .from("user_roles")
          .upsert({ user_id: adminUser.id, role: "admin" }, { onConflict: "user_id,role" });
        
        // Update profile
        const profileUpdate: Record<string, any> = {
          username: userUsername, 
          full_name: userFullName
        };
        
        if (company_id) {
          profileUpdate.company_id = company_id;
        }
        if (is_company_admin !== undefined) {
          profileUpdate.is_company_admin = is_company_admin;
        }
        
        await supabase
          .from("profiles")
          .update(profileUpdate)
          .eq("id", adminUser.id);
      }
      
      return new Response(
        JSON.stringify({ message: "Admin user already exists and updated", email: userEmail, username: userUsername }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true,
      user_metadata: {
        full_name: userFullName,
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

    // Assign admin role (or moderator for company admins)
    const role = is_company_admin ? "moderator" : "admin";
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role });

    if (roleError) {
      console.error("Error assigning role:", roleError);
    }

    // Update profile with company info
    const profileUpdate: Record<string, any> = {
      full_name: userFullName,
      username: userUsername,
      is_company_admin: is_company_admin || false
    };
    
    if (company_id) {
      profileUpdate.company_id = company_id;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update(profileUpdate)
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