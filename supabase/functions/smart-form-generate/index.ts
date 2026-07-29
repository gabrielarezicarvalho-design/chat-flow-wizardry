import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// Generate unique token
function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Check if current time is within business hours
function isWithinBusinessHours(businessHours: any): boolean {
  if (!businessHours?.enabled) return true; // If not enabled, always available
  
  const timezone = businessHours.timezone || 'America/Sao_Paulo';
  const now = new Date();
  
  // Convert to timezone
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short'
  });
  
  const timeStr = now.toLocaleTimeString('en-US', options);
  const [hour, minute] = timeStr.split(':').map(Number);
  const currentMinutes = hour * 60 + minute;
  
  // Get day of week (0 = Sunday, 1 = Monday, etc)
  const dayOfWeek = now.getDay();
  const days = businessHours.days || [1, 2, 3, 4, 5]; // Default Mon-Fri
  
  if (!days.includes(dayOfWeek)) {
    return false;
  }
  
  // Parse start and end times
  const [startHour, startMin] = (businessHours.start || '08:00').split(':').map(Number);
  const [endHour, endMin] = (businessHours.end || '18:00').split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { 
      form_id, 
      phone, 
      connection_id, 
      conversation_id,
      check_business_hours,
      user_id 
    } = await req.json();

    console.log("🔗 Generating Smart Form Link");
    console.log("   Form ID:", form_id);
    console.log("   Phone:", phone);
    console.log("   Check Business Hours:", check_business_hours);

    // Get form configuration
    const { data: form, error: formError } = await supabase
      .from("smart_forms")
      .select("*, departments(business_hours)")
      .eq("id", form_id)
      .single();

    if (formError || !form) {
      console.error("❌ Form not found:", formError);
      return new Response(
        JSON.stringify({ success: false, error: "Form not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Check business hours if enabled
    if (check_business_hours && form.department_id) {
      const businessHours = form.departments?.business_hours;
      const withinHours = isWithinBusinessHours(businessHours);
      
      console.log("⏰ Within business hours:", withinHours);
      
      if (withinHours) {
        // During business hours - don't send form
        return new Response(
          JSON.stringify({ 
            success: true, 
            within_business_hours: true,
            message: "Within business hours - no form needed"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generate unique token
    const uniqueToken = generateToken();

    // Create submission record
    const { data: submission, error: subError } = await supabase
      .from("smart_form_submissions")
      .insert({
        user_id: user_id || form.user_id,
        form_id: form_id,
        connection_id,
        department_id: form.department_id,
        unique_token: uniqueToken,
        phone: phone.replace(/\D/g, ''),
        status: 'pendente',
        conversation_id
      })
      .select()
      .single();

    if (subError) {
      console.error("❌ Error creating submission:", subError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create submission" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Generate public URL - using fixed Next ProChat domain
    const baseUrl = 'https://ia.nextprochat.com.br';
    const formUrl = `${baseUrl}/f/${uniqueToken}`;

    console.log("✅ Form link generated:", formUrl);

    return new Response(
      JSON.stringify({ 
        success: true,
        form_url: formUrl,
        token: uniqueToken,
        submission_id: submission.id,
        within_business_hours: false,
        welcome_message: form.welcome_message
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
