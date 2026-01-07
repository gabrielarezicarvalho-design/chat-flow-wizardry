import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// WhatsApp HKDF contexts for different media types
const HKDF_CONTEXTS: Record<string, Uint8Array> = {
  audio: new TextEncoder().encode("WhatsApp Audio Keys"),
  ptt: new TextEncoder().encode("WhatsApp Audio Keys"),
  voice: new TextEncoder().encode("WhatsApp Audio Keys"),
  image: new TextEncoder().encode("WhatsApp Image Keys"),
  video: new TextEncoder().encode("WhatsApp Video Keys"),
  document: new TextEncoder().encode("WhatsApp Document Keys"),
  sticker: new TextEncoder().encode("WhatsApp Image Keys"),
};

// HMAC-SHA256 implementation
async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new Uint8Array(data));
  return new Uint8Array(signature);
}

// HKDF implementation for WhatsApp media decryption
async function hkdf(
  ikm: Uint8Array,
  length: number,
  info: Uint8Array
): Promise<Uint8Array> {
  const salt = new Uint8Array(32); // Empty salt for WhatsApp
  
  // Extract step
  const prk = await hmacSha256(salt, ikm);
  
  // Expand step
  const numBlocks = Math.ceil(length / 32);
  const okm = new Uint8Array(length);
  let prev: Uint8Array = new Uint8Array(0);
  
  for (let i = 0; i < numBlocks; i++) {
    const block = new Uint8Array(prev.length + info.length + 1);
    block.set(prev, 0);
    block.set(info, prev.length);
    block[block.length - 1] = i + 1;
    
    const hmacResult = await hmacSha256(prk, block);
    prev = new Uint8Array(hmacResult);
    okm.set(prev.slice(0, Math.min(32, length - i * 32)), i * 32);
  }
  
  return okm;
}

// Decrypt WhatsApp encrypted media
async function decryptWhatsAppMedia(
  encryptedData: Uint8Array,
  mediaKey: string,
  mediaType: string
): Promise<Uint8Array | null> {
  try {
    console.log("🔐 Decrypting WhatsApp media...");
    console.log("   - Media type:", mediaType);
    console.log("   - Encrypted data size:", encryptedData.length, "bytes");
    
    // Decode base64 media key
    const mediaKeyBytes = Uint8Array.from(atob(mediaKey), c => c.charCodeAt(0));
    console.log("   - Media key size:", mediaKeyBytes.length, "bytes");
    
    // Get HKDF context for media type
    const context = HKDF_CONTEXTS[mediaType] || HKDF_CONTEXTS.audio;
    
    // Derive keys using HKDF (112 bytes = IV(16) + Cipher Key(32) + MAC Key(32) + Ref Key(32))
    const expandedKey = await hkdf(mediaKeyBytes, 112, context);
    
    const iv = expandedKey.slice(0, 16);
    const cipherKey = expandedKey.slice(16, 48);
    // MAC key is 48-80, Ref key is 80-112 (not needed for decryption)
    
    console.log("   - IV derived:", iv.length, "bytes");
    console.log("   - Cipher key derived:", cipherKey.length, "bytes");
    
    // Encrypted data format: [encrypted content][10 bytes MAC]
    // Remove last 10 bytes (MAC)
    if (encryptedData.length <= 10) {
      console.error("❌ Encrypted data too small");
      return null;
    }
    
    const encDataWithoutMac = encryptedData.slice(0, -10);
    console.log("   - Data after MAC removal:", encDataWithoutMac.length, "bytes");
    
    // Import key for AES-CBC decryption
    const aesKey = await crypto.subtle.importKey(
      "raw",
      new Uint8Array(cipherKey),
      { name: "AES-CBC" },
      false,
      ["decrypt"]
    );
    
    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv: new Uint8Array(iv) },
      aesKey,
      new Uint8Array(encDataWithoutMac)
    );
    
    const decrypted = new Uint8Array(decryptedBuffer);
    console.log("✅ Decryption successful, size:", decrypted.length, "bytes");
    
    return decrypted;
  } catch (error: any) {
    console.error("❌ Decryption failed:", error.message);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioUrl, audioBase64, userId, mediaKey, fileSHA256, connectionToken, connectionBaseUrl } = await req.json();
    
    if (!audioUrl && !audioBase64) {
      throw new Error('audioUrl or audioBase64 is required');
    }

    console.log("🎤 Transcribing audio...");
    console.log("   - audioUrl:", audioUrl?.substring(0, 80));
    console.log("   - audioBase64:", audioBase64 ? `${audioBase64.length} chars` : "not provided");
    console.log("   - mediaKey:", mediaKey ? "provided" : "not provided");
    console.log("   - fileSHA256:", fileSHA256 ? "provided" : "not provided");
    console.log("   - userId:", userId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to get user's API keys
    let openaiApiKey: string | null = null;
    let geminiApiKey: string | null = null;
    
    if (userId) {
      const { data: providerKeys } = await supabase
        .from("ai_provider_keys")
        .select("api_key, provider")
        .eq("user_id", userId)
        .eq("is_valid", true);
      
      if (providerKeys && providerKeys.length > 0) {
        for (const key of providerKeys) {
          if (key.provider === "openai" && key.api_key) {
            openaiApiKey = key.api_key;
            console.log("🔑 Found OpenAI API key");
          }
          if (key.provider === "google" && key.api_key) {
            geminiApiKey = key.api_key;
            console.log("🔑 Found Gemini API key");
          }
        }
      }
    }

    // Fallback to Lovable AI if no Gemini key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!geminiApiKey && LOVABLE_API_KEY) {
      console.log("🔑 Using Lovable AI Gateway (fallback)");
    }

    // Get audio data - PRIORITY: base64 directly, then download + decrypt
    let audioBuffer: ArrayBuffer | null = null;
    let contentType = 'audio/ogg';
    let needsDecryption = false;
    
    if (audioBase64) {
      console.log("📥 Using base64 audio directly");
      
      let cleanBase64 = audioBase64;
      if (cleanBase64.includes(',')) {
        const parts = cleanBase64.split(',');
        const match = parts[0].match(/data:([^;]+)/);
        if (match) contentType = match[1];
        cleanBase64 = parts[1];
      }
      
      try {
        const binaryString = atob(cleanBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioBuffer = bytes.buffer as ArrayBuffer;
        console.log("✅ Base64 decoded, size:", audioBuffer.byteLength, "bytes");
      } catch (decodeError: any) {
        console.error("❌ Failed to decode base64:", decodeError.message);
      }
    }

    // Try direct URL download
    if (!audioBuffer && audioUrl) {
      console.log("📥 Downloading audio from URL...");
      
      const audioResponse = await fetch(audioUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (audioResponse.ok) {
        audioBuffer = await audioResponse.arrayBuffer();
        contentType = audioResponse.headers.get('content-type') || 'audio/ogg';
        
        if (contentType === 'application/octet-stream' || audioUrl.includes('.enc')) {
          console.log("⚠️ Encrypted WhatsApp audio detected");
          needsDecryption = true;
          contentType = 'audio/ogg';
        }
        
        console.log("📥 Audio downloaded, size:", audioBuffer.byteLength, "bytes");
        console.log("   - Content-Type:", contentType);
        console.log("   - Needs decryption:", needsDecryption);
      } else {
        console.error("❌ Failed to download audio:", audioResponse.status);
      }
    }

    // Decrypt WhatsApp encrypted audio if mediaKey is available
    if (needsDecryption && audioBuffer && mediaKey) {
      console.log("🔐 Attempting to decrypt WhatsApp audio...");
      
      const encryptedData = new Uint8Array(audioBuffer);
      const decrypted = await decryptWhatsAppMedia(encryptedData, mediaKey, 'audio');
      
      if (decrypted) {
        audioBuffer = decrypted.buffer as ArrayBuffer;
        console.log("✅ Audio decrypted successfully, new size:", audioBuffer.byteLength, "bytes");
      } else {
        console.log("⚠️ Decryption failed, using encrypted data (may cause bad transcription)");
      }
    } else if (needsDecryption && !mediaKey) {
      console.log("⚠️ Encrypted audio but no mediaKey provided - transcription may fail");
    }

    if (!audioBuffer) {
      console.log("❌ No audio data available");
      return new Response(JSON.stringify({
        success: true,
        text: '',
        words: [],
        error: 'No audio data available'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let transcription = '';
    const audioBytes = new Uint8Array(audioBuffer);
    
    // Convert to base64 for Gemini
    let base64Audio = '';
    const chunkSize = 32768;
    for (let i = 0; i < audioBytes.length; i += chunkSize) {
      const chunk = audioBytes.slice(i, i + chunkSize);
      base64Audio += String.fromCharCode.apply(null, [...chunk]);
    }
    base64Audio = btoa(base64Audio);

    // Try Gemini FIRST (either user's key or Lovable AI Gateway)
    if (geminiApiKey || LOVABLE_API_KEY) {
      console.log("🎙️ Using Gemini for transcription...");
      
      try {
        let geminiResponse;
        
        if (geminiApiKey) {
          // Use user's Gemini key directly
          geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    {
                      text: `Transcreva o áudio a seguir para texto em português brasileiro. 
REGRAS: Retorne SOMENTE o texto falado, sem explicações. Se inaudível, retorne: [inaudível]`
                    },
                    {
                      inlineData: {
                        mimeType: 'audio/ogg',
                        data: base64Audio
                      }
                    }
                  ]
                }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
              }),
            }
          );

          if (geminiResponse.ok) {
            const result = await geminiResponse.json();
            transcription = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
            transcription = transcription.replace(/^["']|["']$/g, '').replace(/^\[.*?\]\s*/g, '').trim();
            
            if (transcription.includes('[inaudível]') || transcription.length < 3) {
              transcription = '';
            }
            
            if (transcription) {
              console.log("✅ Gemini transcription:", transcription.substring(0, 100));
            }
          } else {
            console.error("❌ Gemini API error:", geminiResponse.status);
          }
        }
        
        // Fallback to Lovable AI Gateway with Gemini
        if (!transcription && LOVABLE_API_KEY) {
          console.log("🎙️ Trying Lovable AI Gateway...");
          
          const lovableResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { 
                  role: "user", 
                  content: [
                    {
                      type: "text",
                      text: `Transcreva o áudio a seguir para texto em português brasileiro. Retorne SOMENTE o texto falado, sem explicações. Se inaudível, retorne: [inaudível]`
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: `data:audio/ogg;base64,${base64Audio}`
                      }
                    }
                  ]
                }
              ],
              max_tokens: 1000
            }),
          });

          if (lovableResponse.ok) {
            const lovableData = await lovableResponse.json();
            transcription = lovableData.choices?.[0]?.message?.content?.trim() || '';
            transcription = transcription.replace(/^["']|["']$/g, '').replace(/^\[.*?\]\s*/g, '').trim();
            
            if (transcription.includes('[inaudível]') || transcription.length < 3) {
              transcription = '';
            }
            
            if (transcription) {
              console.log("✅ Lovable AI transcription:", transcription.substring(0, 100));
            }
          } else {
            const errText = await lovableResponse.text();
            console.error("❌ Lovable AI error:", lovableResponse.status, errText);
          }
        }
      } catch (geminiError: any) {
        console.error("❌ Gemini/Lovable AI error:", geminiError.message);
      }
    }

    // Fallback to OpenAI Whisper if Gemini failed
    if (!transcription && openaiApiKey) {
      console.log("🎙️ Fallback to OpenAI Whisper...");
      
      try {
        let fileExtension = 'ogg';
        let mimeType = 'audio/ogg';
        
        if (contentType.includes('mpeg') || contentType.includes('mp3')) {
          fileExtension = 'mp3';
          mimeType = 'audio/mpeg';
        } else if (contentType.includes('wav')) {
          fileExtension = 'wav';
          mimeType = 'audio/wav';
        } else if (contentType.includes('webm')) {
          fileExtension = 'webm';
          mimeType = 'audio/webm';
        }
        
        const formData = new FormData();
        const audioBlob = new Blob([audioBuffer], { type: mimeType });
        formData.append('file', audioBlob, `audio.${fileExtension}`);
        formData.append('model', 'whisper-1');
        formData.append('language', 'pt');
        formData.append('response_format', 'json');

        console.log("📤 Sending to Whisper:", `audio.${fileExtension}`, mimeType, audioBuffer.byteLength, "bytes");

        const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: formData,
        });

        if (whisperResponse.ok) {
          const whisperData = await whisperResponse.json();
          transcription = whisperData.text?.trim() || '';
          console.log("✅ Whisper transcription:", transcription.substring(0, 100));
        } else {
          const errorText = await whisperResponse.text();
          console.error("❌ Whisper API error:", whisperResponse.status, errorText);
        }
      } catch (whisperError: any) {
        console.error("❌ Whisper error:", whisperError.message);
      }
    }

    if (!transcription) {
      console.log("⚠️ All transcription methods failed");
    }

    console.log("📝 Final transcription result:", transcription ? transcription.substring(0, 100) : "(empty)");

    return new Response(JSON.stringify({
      success: true,
      text: transcription,
      words: []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("❌ Transcription error:", error);
    return new Response(JSON.stringify({
      success: true,
      text: '',
      words: []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
