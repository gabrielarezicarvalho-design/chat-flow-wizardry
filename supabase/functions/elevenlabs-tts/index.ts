import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice, stability, similarity, speed, saveToStorage, userId, provider } = await req.json();
    
    if (!text) {
      throw new Error('text is required');
    }

    console.log("🔊 Generating TTS for text:", text.substring(0, 50));
    console.log("   Provider requested:", provider || 'auto');

    let audioBuffer: ArrayBuffer;
    let usedProvider = 'openai';

    // Try ElevenLabs first if API key is configured and provider is not explicitly set to openai
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (ELEVENLABS_API_KEY && provider !== 'openai') {
      try {
        console.log("🎤 Trying ElevenLabs TTS...");
        
        // Use provided voice or default
        const voiceId = voice || 'pFZP5JQG7iQjIQuC4Bku'; // Lily - default voice
        
        // Voice settings with defaults
        const voiceStability = stability ?? 0.5;
        const voiceSimilarity = similarity ?? 0.75;
        const voiceSpeed = speed ?? 1.0;

        console.log("   Voice ID:", voiceId);

        // Call ElevenLabs TTS API
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': ELEVENLABS_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text,
              model_id: 'eleven_multilingual_v2',
              voice_settings: {
                stability: voiceStability,
                similarity_boost: voiceSimilarity,
                style: 0.3,
                use_speaker_boost: true,
                speed: voiceSpeed,
              },
            }),
          }
        );

        if (response.ok) {
          audioBuffer = await response.arrayBuffer();
          usedProvider = 'elevenlabs';
          console.log("✅ ElevenLabs TTS success, size:", audioBuffer.byteLength);
        } else {
          const errorText = await response.text();
          console.error("⚠️ ElevenLabs TTS failed:", response.status, errorText);
          throw new Error(`ElevenLabs error: ${response.status}`);
        }
      } catch (elevenLabsError) {
        console.log("⚠️ ElevenLabs failed, falling back to OpenAI TTS...");
        console.error("   Error:", elevenLabsError);
      }
    }

    // Fallback to OpenAI TTS if ElevenLabs failed or wasn't tried
    if (!audioBuffer!) {
      console.log("🤖 Using OpenAI TTS...");
      
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('LOVABLE_API_KEY');
      
      if (!OPENAI_API_KEY) {
        throw new Error('No TTS API key configured (OPENAI_API_KEY or LOVABLE_API_KEY)');
      }

      // Map voice to OpenAI voices
      // OpenAI voices: alloy, echo, fable, onyx, nova, shimmer
      const openaiVoice = mapVoiceToOpenAI(voice);
      console.log("   OpenAI Voice:", openaiVoice);

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: openaiVoice,
          response_format: 'mp3',
          speed: speed ?? 1.0,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ OpenAI TTS error:", response.status, errorText);
        throw new Error(`OpenAI TTS error: ${response.status}`);
      }

      audioBuffer = await response.arrayBuffer();
      usedProvider = 'openai';
      console.log("✅ OpenAI TTS success, size:", audioBuffer.byteLength);
    }

    // If saveToStorage is true, upload to Supabase Storage and return URL
    if (saveToStorage && userId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const fileName = `tts/${userId}/${Date.now()}.mp3`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ai-audio')
        .upload(fileName, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: false
        });

      if (uploadError) {
        console.error("❌ Storage upload error:", uploadError);
        // Fall back to base64 response
      } else {
        const { data: urlData } = supabase.storage
          .from('ai-audio')
          .getPublicUrl(fileName);

        console.log("✅ Audio saved to storage:", urlData.publicUrl);

        return new Response(JSON.stringify({
          success: true,
          audioUrl: urlData.publicUrl,
          provider: usedProvider
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
      provider: usedProvider
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

// Map ElevenLabs voice IDs or names to OpenAI voices
function mapVoiceToOpenAI(voice?: string): string {
  if (!voice) return 'nova'; // Default female voice
  
  // If it's already an OpenAI voice name
  const openaiVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  if (openaiVoices.includes(voice.toLowerCase())) {
    return voice.toLowerCase();
  }
  
  // Map common ElevenLabs voice IDs to OpenAI equivalents
  const voiceMap: Record<string, string> = {
    // Female voices -> nova or shimmer
    'pFZP5JQG7iQjIQuC4Bku': 'nova',      // Lily
    'EXAVITQu4vr4xnSDxMaL': 'nova',      // Sarah
    'FGY2WhTYpPnrIDTdsKH5': 'shimmer',   // Laura
    'Xb7hH8MSUJpSbSDYk0k2': 'shimmer',   // Alice
    'XrExE9yKIg1WjnnlVkGX': 'nova',      // Matilda
    'cgSgspJ2msm6clMCkdW9': 'nova',      // Jessica
    
    // Male voices -> onyx, echo, or fable
    'CwhRBWXzGAHq8TQ4Fs17': 'onyx',      // Roger
    'IKne3meq5aSn9XLyUdCD': 'echo',      // Charlie
    'JBFqnCBsd6RMkjVDRZzb': 'onyx',      // George
    'N2lVS1w4EtoT3dr4eOWO': 'echo',      // Callum
    'TX3LPaxmHKxFdv7VOQHJ': 'fable',     // Liam
    'bIHbv24MWmeRgasZH58o': 'echo',      // Will
    'cjVigY5qzO86Huf0OWal': 'onyx',      // Eric
    'iP95p4xoKVk53GoZ742B': 'echo',      // Chris
    'nPczCjzI2devNBz1zQrb': 'onyx',      // Brian
    'onwK4e9ZLuTAKqWW03F9': 'fable',     // Daniel
    'pqHfZKP75CvOlQylNhV4': 'onyx',      // Bill
  };
  
  return voiceMap[voice] || 'nova';
}
