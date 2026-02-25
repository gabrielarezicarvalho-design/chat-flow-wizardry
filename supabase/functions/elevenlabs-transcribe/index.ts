import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioUrl, audioBase64 } = await req.json();
    
    if (!audioUrl && !audioBase64) {
      throw new Error('audioUrl or audioBase64 is required');
    }

    console.log("🎤 Transcribing audio with ElevenLabs Scribe...");

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY_1') || Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Get audio data
    let audioBuffer: ArrayBuffer | null = null;
    let contentType = 'audio/ogg';
    
    if (audioBase64) {
      console.log("📥 Using base64 audio directly");
      let cleanBase64 = audioBase64;
      if (cleanBase64.includes(',')) {
        const parts = cleanBase64.split(',');
        const match = parts[0].match(/data:([^;]+)/);
        if (match) contentType = match[1];
        cleanBase64 = parts[1];
      }
      
      const binaryString = atob(cleanBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      audioBuffer = bytes.buffer as ArrayBuffer;
      console.log("✅ Base64 decoded, size:", audioBuffer.byteLength, "bytes");
    } else if (audioUrl) {
      console.log("📥 Downloading audio from URL...");
      const audioResponse = await fetch(audioUrl);
      if (audioResponse.ok) {
        audioBuffer = await audioResponse.arrayBuffer();
        contentType = audioResponse.headers.get('content-type') || 'audio/ogg';
        console.log("📥 Audio downloaded, size:", audioBuffer.byteLength, "bytes");
      }
    }

    if (!audioBuffer) {
      return new Response(JSON.stringify({ success: true, text: '', words: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine file extension
    let fileExtension = 'ogg';
    let mimeType = contentType;
    if (contentType.includes('webm')) { fileExtension = 'webm'; mimeType = 'audio/webm'; }
    else if (contentType.includes('mp3') || contentType.includes('mpeg')) { fileExtension = 'mp3'; mimeType = 'audio/mpeg'; }
    else if (contentType.includes('wav')) { fileExtension = 'wav'; mimeType = 'audio/wav'; }

    // Use ElevenLabs Scribe v2 for transcription
    console.log("🎙️ Sending to ElevenLabs Scribe v2...");
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: mimeType });
    formData.append('file', audioBlob, `audio.${fileExtension}`);
    formData.append('model_id', 'scribe_v2');
    formData.append('language_code', 'por');
    formData.append('tag_audio_events', 'false');
    formData.append('diarize', 'false');

    const scribeResponse = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!scribeResponse.ok) {
      const errText = await scribeResponse.text();
      console.error("❌ ElevenLabs Scribe error:", scribeResponse.status, errText);
      throw new Error(`ElevenLabs Scribe error: ${scribeResponse.status}`);
    }

    const scribeData = await scribeResponse.json();
    const transcription = scribeData.text?.trim() || '';
    console.log("✅ ElevenLabs transcription:", transcription.substring(0, 100));

    return new Response(JSON.stringify({
      success: true,
      text: transcription,
      words: scribeData.words || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("❌ Transcription error:", error);
    return new Response(JSON.stringify({
      success: true,
      text: '',
      words: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});