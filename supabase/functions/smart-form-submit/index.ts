import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { submission_id, answers, name } = await req.json();

    console.log("📋 Smart Form Submit");
    console.log("   Submission ID:", submission_id);

    // Get submission details
    const { data: submission, error: subError } = await supabase
      .from("smart_form_submissions")
      .select("*")
      .eq("id", submission_id)
      .single();

    if (subError || !submission) {
      console.error("❌ Submission not found:", subError);
      return new Response(
        JSON.stringify({ success: false, error: "Submission not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Get form configuration
    let formConfig = null;
    if (submission.form_id) {
      const { data: form } = await supabase
        .from("smart_forms")
        .select("*")
        .eq("id", submission.form_id)
        .single();
      formConfig = form;
    }

    // Send WhatsApp confirmation if enabled
    if (formConfig?.whatsapp_confirmation && submission.connection_id && submission.phone) {
      // Get connection details
      const { data: connection } = await supabase
        .from("connections")
        .select("*")
        .eq("id", submission.connection_id)
        .single();

      if (connection?.token) {
        const environment = connection.environment || "TESTE";
        const BASE_URL = environment === "PROD" 
          ? "https://app.uazapi.com" 
          : "https://free.uazapi.com";

        const confirmationMessage = formConfig.success_message || 
          "✅ *Recebemos suas informações!*\n\nNossa equipe entrará em contato em breve durante o horário comercial.\n\nObrigado pela preferência! 🙏";

        try {
          await fetch(`${BASE_URL}/send/text`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "token": connection.token
            },
            body: JSON.stringify({
              number: submission.phone,
              text: confirmationMessage
            })
          });
          console.log("✅ WhatsApp confirmation sent");
        } catch (e) {
          console.error("❌ Failed to send WhatsApp confirmation:", e);
        }
      }
    }

    // Also save to form_responses for backward compatibility
    try {
      await supabase.from("form_responses").insert({
        user_id: submission.user_id,
        conversation_id: submission.conversation_id,
        flow_id: null,
        phone: submission.phone,
        name: name || submission.name,
        collected_data: answers,
        status: "novo"
      });
      console.log("✅ Saved to form_responses");
    } catch (e) {
      console.log("⚠️ Could not save to form_responses:", e);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Form submitted successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
