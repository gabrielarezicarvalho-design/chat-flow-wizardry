import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Global platform secrets that admin manages
const PLATFORM_SECRETS = [
  { name: 'LOVABLE_API_KEY', label: 'Lovable AI Gateway', category: 'ai', description: 'IA nativa (chat, embeddings, imagens)' },
  { name: 'OPENAI_API_KEY', label: 'OpenAI (fallback)', category: 'ai', description: 'Chave OpenAI global (fallback quando empresa não tem chave própria)' },
  { name: 'ELEVENLABS_API_KEY', label: 'ElevenLabs', category: 'ai', description: 'Text-to-speech e voz clonada' },
  { name: 'META_APP_ID', label: 'Meta App ID', category: 'whatsapp', description: 'ID do app no Meta Developers' },
  { name: 'META_APP_SECRET', label: 'Meta App Secret', category: 'whatsapp', description: 'Secret do app Meta (WhatsApp Cloud)' },
  { name: 'META_CONFIG_ID', label: 'Meta Config ID', category: 'whatsapp', description: 'Configuration ID do embedded signup' },
  { name: 'EVOLUTION_BASE_URL', label: 'Evolution API Base URL', category: 'whatsapp', description: 'URL do servidor Evolution API v2 (atual)' },
  { name: 'EVOLUTION_API_KEY', label: 'Evolution API Key', category: 'whatsapp', description: 'API Key global do servidor Evolution' },
  { name: 'UZAPI_BASE_URL_PROD', label: 'UAZAPI Base URL (Prod)', category: 'whatsapp', description: 'URL do servidor UAZAPI produção (legado)' },
  { name: 'UZAPI_ADMIN_TOKEN_PROD', label: 'UAZAPI Admin Token (Prod)', category: 'whatsapp', description: 'Token admin UAZAPI produção (legado)' },
  { name: 'UZAPI_BASE_URL_TESTE', label: 'UAZAPI Base URL (Teste)', category: 'whatsapp', description: 'URL do servidor UAZAPI teste (legado)' },
  { name: 'UZAPI_ADMIN_TOKEN_TESTE', label: 'UAZAPI Admin Token (Teste)', category: 'whatsapp', description: 'Token admin UAZAPI teste (legado)' },
  { name: 'UZAPI_ENV', label: 'UAZAPI Ambiente Ativo', category: 'whatsapp', description: 'prod ou teste (legado)' },
  { name: 'GOOGLE_CLIENT_ID', label: 'Google OAuth Client ID', category: 'auth', description: 'Login com Google' },
  { name: 'GOOGLE_CLIENT_SECRET', label: 'Google OAuth Secret', category: 'auth', description: 'Secret do OAuth Google' },
  { name: 'TELEGRAM_BOT_TOKEN', label: 'Telegram Bot Token', category: 'notifications', description: 'Bot de notificações internas' },
  { name: 'TELEGRAM_CHAT_ID', label: 'Telegram Chat ID', category: 'notifications', description: 'Chat de destino das notificações' },
  { name: 'NOTIFICAME_API_TOKEN', label: 'Notificame API', category: 'notifications', description: 'Serviço externo de notificações' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autenticado');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) throw new Error('Não autenticado');

    const { data: roleRow } = await supabase
      .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!roleRow) throw new Error('Acesso negado');

    const secrets = PLATFORM_SECRETS.map((s) => ({
      ...s,
      configured: !!Deno.env.get(s.name),
    }));

    // Public info: webhook base URL of the project
    const projectUrl = Deno.env.get('SUPABASE_URL') || '';
    const webhooks = [
      { name: 'WhatsApp Meta Webhook', url: `${projectUrl}/functions/v1/wa-webhook-listener`, description: 'Recebe eventos do WhatsApp Cloud API' },
      { name: 'UAZAPI Webhook', url: `${projectUrl}/functions/v1/wa-webhook-uzapi`, description: 'Recebe eventos do UAZAPI' },
      { name: 'Asaas Webhook', url: `${projectUrl}/functions/v1/asaas-webhook`, description: 'Recebe eventos de pagamento Asaas' },
    ];

    return new Response(JSON.stringify({ secrets, webhooks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
