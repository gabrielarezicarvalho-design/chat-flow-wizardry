import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller is authenticated and is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const caller = { id: claimsData.claims.sub as string };

    // Check if caller has admin role
    const { data: callerRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .single();

    if (roleError || callerRole?.role !== 'admin') {
      console.error("Role check failed:", roleError, callerRole);
      return new Response(
        JSON.stringify({ success: false, error: "Apenas administradores podem criar usuários" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { username, full_name, password, role, company_id, permissions, is_company_admin } = await req.json();

    console.log("Admin", caller.id, "creating user:", { username, full_name, role, company_id, is_company_admin });

    if (!username || !full_name || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Campos obrigatórios: username, full_name, password" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate email from username (for internal use only)
    const email = `${username}@internal.marketflow.local`;

    // Check if username already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .maybeSingle();

    if (existingProfile) {
      // User exists - update password instead of creating new
      console.log("User already exists, updating password:", existingProfile.id);
      
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        existingProfile.id,
        { password }
      );

      if (updateAuthError) {
        console.error("Error updating user password:", updateAuthError);
        return new Response(
          JSON.stringify({ success: false, error: updateAuthError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update profile
      const profileUpdate: Record<string, unknown> = { full_name };
      if (company_id) profileUpdate.company_id = company_id;
      if (is_company_admin !== undefined) profileUpdate.is_company_admin = is_company_admin;
      if (permissions) profileUpdate.permissions = permissions;

      await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', existingProfile.id);

      // Update role if needed
      if (role) {
        await supabaseAdmin
          .from('user_roles')
          .upsert({ user_id: existingProfile.id, role }, { onConflict: 'user_id' });
      }

      console.log("User updated successfully:", existingProfile.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          user_id: existingProfile.id,
          message: "Usuário atualizado com sucesso!",
          updated: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user via Admin API
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        username
      }
    });

    if (createAuthError) {
      console.error("Auth error:", createAuthError);
      return new Response(
        JSON.stringify({ success: false, error: createAuthError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user!.id;
    console.log("User created in auth:", userId);

    // Update profile with username, company_id (if provided), and permissions
    const profileUpdate: Record<string, unknown> = { 
      username,
      full_name
    };
    
    // Only add company_id if it's provided (for company users)
    if (company_id) {
      profileUpdate.company_id = company_id;
    }
    
    // Mark as company admin if specified
    if (is_company_admin) {
      profileUpdate.is_company_admin = true;
    }
    
    // Add permissions if provided
    if (permissions) {
      profileUpdate.permissions = permissions;
    }
    
    console.log("Updating profile with:", profileUpdate);
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
      // Don't fail the whole operation, just log the error
    } else {
      console.log("Profile updated successfully for user:", userId);
    }

    // First check if role already exists (trigger may have created it)
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingRole) {
      // Update existing role
      const { error: roleUpdateError } = await supabaseAdmin
        .from('user_roles')
        .update({ role: role || 'agent' })
        .eq('user_id', userId);

      if (roleUpdateError) {
        console.error("Role update error:", roleUpdateError);
      }
    } else {
      // Insert new role
      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .insert({ 
          user_id: userId, 
          role: role || 'agent' 
        });

      if (roleInsertError) {
        console.error("Role insert error:", roleInsertError);
      }
    }

    console.log("User created successfully:", userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: userId,
        message: "Usuário criado com sucesso!"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("Error creating user:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});