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
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller has admin role
    const { data: callerRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .single();

    if (roleError || callerRole?.role !== 'admin') {
      console.error("Role check failed:", roleError, callerRole);
      return new Response(
        JSON.stringify({ success: false, error: "Apenas administradores podem excluir usuários" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id } = await req.json();

    console.log("Admin", caller.id, "deleting user:", user_id);

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "user_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent admin from deleting themselves
    if (user_id === caller.id) {
      return new Response(
        JSON.stringify({ success: false, error: "Você não pode excluir sua própria conta" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First, unassign user from all conversations to avoid FK constraint
    console.log("Unassigning user from conversations...");
    const { error: unassignError } = await supabaseAdmin
      .from("conversations")
      .update({ assigned_agent: null })
      .eq("assigned_agent", user_id);

    if (unassignError) {
      console.error("Error unassigning conversations:", unassignError);
      // Continue anyway, this might not exist
    }

    // Delete user roles
    console.log("Deleting user roles...");
    const { error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", user_id);

    if (rolesError) {
      console.error("Error deleting roles:", rolesError);
    }

    // Delete profile first (before auth user)
    console.log("Deleting profile...");
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", user_id);

    if (profileError) {
      console.error("Error deleting profile:", profileError);
      return new Response(
        JSON.stringify({ success: false, error: profileError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete user from auth
    console.log("Deleting auth user...");
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteAuthError) {
      console.error("Auth delete error:", deleteAuthError);
      // If auth user doesn't exist, that's okay - profile was already deleted
      if (!deleteAuthError.message.includes("User not found")) {
        return new Response(
          JSON.stringify({ success: false, error: deleteAuthError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log("User deleted successfully:", user_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Usuário excluído com sucesso!"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("Error deleting user:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
