import { requireActivePlan } from "../_shared/planGuard.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Strip emojis and special unicode characters from text
function stripEmojis(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    .replace(/[\u{20E3}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const blocked = await requireActivePlan(req, corsHeaders);
  if (blocked) return blocked;

  try {
    const { text, voice, stability, similarity, speed, saveToStorage, userId } = await req.json();
    
    if (!text) {
      throw new Error('text is required');
    }

    const cleanText = stripEmojis(text);
    if (!cleanText) {
      throw new Error('text is empty after removing emojis');
    }

    console.log("🔊 Generating TTS for text:", cleanText.substring(0, 50));

    // Try connector key first, then fallback to regular key
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY_1') || Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Use Sarah (soft, delicate, realistic female voice) as default
    const voiceId = voice || 'EXAVITQu4vr4xnSDxMaL';
    const voiceStability = stability ?? 0.45;
    const voiceSimilarity = similarity ?? 0.8;
    const voiceSpeed = speed ?? 0.95;

    console.log("🎤 Using ElevenLabs TTS, Voice ID:", voiceId);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: voiceStability,
            similarity_boost: voiceSimilarity,
            style: 0.45,
            use_speaker_boost: true,
            speed: voiceSpeed,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ ElevenLabs TTS error:", response.status, errorText);
      throw new Error(`ElevenLabs TTS error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log("✅ ElevenLabs TTS success, size:", audioBuffer.byteLength);

    // If saveToStorage is true, upload to Supabase Storage and return URL
    if (saveToStorage && userId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const fileName = `tts/${userId}/${Date.now()}.mp3`;
      
      const { error: uploadError } = await supabase.storage
        .from('ai-audio')
        .upload(fileName, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: false
        });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('ai-audio')
          .getPublicUrl(fileName);

        return new Response(JSON.stringify({
          success: true,
          audioUrl: urlData.publicUrl,
          provider: 'elevenlabs'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Return base64 encoded audio
    const base64Audio = base64Encode(audioBuffer);

    return new Response(JSON.stringify({
      success: true,
      audioContent: base64Audio,
      provider: 'elevenlabs'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("❌ TTS error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
