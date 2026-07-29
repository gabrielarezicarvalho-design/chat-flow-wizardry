import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Authenticate via X-Api-Key header
async function authenticateApiKey(req: Request, supabaseAdmin: any) {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey) {
    return { error: 'Missing X-Api-Key header', status: 401 }
  }

  const { data: keyData, error } = await supabaseAdmin
    .from('external_api_keys')
    .select('*, companies(name)')
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !keyData) {
    return { error: 'Invalid or inactive API key', status: 401 }
  }

  // Update last_used_at
  await supabaseAdmin
    .from('external_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyData.id)

  return { keyData }
}

// Log API call
async function logApiCall(supabaseAdmin: any, params: {
  api_key_id: string,
  company_id: string,
  endpoint: string,
  method: string,
  status_code: number,
  request_body?: any,
  response_body?: any,
  ip_address?: string
}) {
  await supabaseAdmin.from('external_api_logs').insert(params)
}

// Parse route: /external-api/v1/{resource}/{action?}/{id?}
function parseRoute(url: URL) {
  const path = url.pathname.replace(/^\/external-api/, '').replace(/^\//, '')
  const parts = path.split('/').filter(Boolean)
  return {
    version: parts[0] || 'v1',
    resource: parts[1] || '',
    action: parts[2] || '',
    id: parts[3] || '',
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const url = new URL(req.url)
  const { resource, action, id } = parseRoute(url)
  const method = req.method

  // Public endpoint: API docs
  if (resource === '' || resource === 'docs') {
    return new Response(JSON.stringify({
      name: 'Next Pro External API',
      version: 'v1',
      endpoints: {
        'GET /v1/connections': 'List WhatsApp connections',
        'POST /v1/connections/start-signup': 'Start Meta Embedded Signup flow',
        'POST /v1/connections/callback': 'Handle Embedded Signup callback',
        'GET /v1/conversations': 'List conversations',
        'GET /v1/conversations/:id/messages': 'Get messages for a conversation',
        'POST /v1/messages/send': 'Send a WhatsApp message',
        'POST /v1/messages/send-template': 'Send a template message',
        'GET /v1/contacts': 'List contacts/leads',
        'POST /v1/webhooks/test': 'Test webhook delivery',
      },
      authentication: 'Include X-Api-Key header with your API key',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Authenticate
  const auth = await authenticateApiKey(req, supabaseAdmin)
  if (auth.error) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { keyData } = auth
  const companyId = keyData.company_id
  let body: any = {}
  
  if (['POST', 'PUT'].includes(method)) {
    try { body = await req.json() } catch { body = {} }
  }

  let responseData: any = { error: 'Not found' }
  let statusCode = 404

  try {
    // ==================== CONNECTIONS ====================
    if (resource === 'connections') {
      if (!keyData.permissions.includes('connections')) {
        responseData = { error: 'Permission denied: connections' }
        statusCode = 403
      } else if (method === 'GET' && !action) {
        // List connections
        const { data, error } = await supabaseAdmin
          .from('whatsapp_connections')
          .select('id, provider, status, meta_phone_number_id, meta_waba_id, meta_business_id, created_at, updated_at')
          .eq('company_id', companyId)

        if (error) throw error
        responseData = { connections: data || [] }
        statusCode = 200

      } else if (method === 'POST' && action === 'start-signup') {
        // Start Meta Embedded Signup - returns the config needed for the popup
        const { data: appSettings } = await supabaseAdmin
          .from('app_settings')
          .select('*')
          .limit(1)
          .maybeSingle()

        const metaAppId = Deno.env.get('META_APP_ID')
        const metaConfigId = Deno.env.get('META_CONFIG_ID')

        if (!metaAppId || !metaConfigId) {
          responseData = { error: 'Meta API not configured on server' }
          statusCode = 500
        } else {
          responseData = {
            meta_app_id: metaAppId,
            meta_config_id: metaConfigId,
            callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/external-api/v1/connections/callback`,
            instructions: 'Use the Facebook SDK to launch Embedded Signup with these parameters. After completion, POST the result to the callback_url with X-Api-Key header.',
          }
          statusCode = 200
        }

      } else if (method === 'POST' && action === 'callback') {
        // Handle Embedded Signup callback from external system
        const { code, waba_id, phone_number_id } = body

        if (!waba_id || !phone_number_id) {
          responseData = { error: 'Missing waba_id or phone_number_id' }
          statusCode = 400
        } else {
          // Exchange code for access token if provided
          let accessToken = body.access_token
          if (code && !accessToken) {
            const metaAppId = Deno.env.get('META_APP_ID')
            const metaAppSecret = Deno.env.get('META_APP_SECRET')
            const tokenRes = await fetch(
              `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${metaAppId}&client_secret=${metaAppSecret}&code=${code}`
            )
            const tokenData = await tokenRes.json()
            accessToken = tokenData.access_token
          }

          // Create connection
          const { data: conn, error } = await supabaseAdmin
            .from('whatsapp_connections')
            .insert({
              company_id: companyId,
              provider: 'meta',
              status: 'connected',
              meta_waba_id: waba_id,
              meta_phone_number_id: phone_number_id,
              meta_business_id: body.business_id || null,
              meta_access_token: accessToken || null,
              meta_connected_at: new Date().toISOString(),
            })
            .select('id, provider, status, meta_waba_id, meta_phone_number_id, created_at')
            .single()

          if (error) throw error
          responseData = { connection: conn, message: 'Connection created successfully' }
          statusCode = 201
        }

      } else if (method === 'GET' && action) {
        // Get specific connection
        const { data, error } = await supabaseAdmin
          .from('whatsapp_connections')
          .select('id, provider, status, meta_phone_number_id, meta_waba_id, meta_business_id, created_at, updated_at')
          .eq('id', action)
          .eq('company_id', companyId)
          .maybeSingle()

        if (error) throw error
        if (!data) {
          responseData = { error: 'Connection not found' }
          statusCode = 404
        } else {
          responseData = { connection: data }
          statusCode = 200
        }
      }

    // ==================== CONVERSATIONS ====================
    } else if (resource === 'conversations') {
      if (!keyData.permissions.includes('conversations')) {
        responseData = { error: 'Permission denied: conversations' }
        statusCode = 403
      } else if (method === 'GET' && !action) {
        // List conversations
        const limit = parseInt(url.searchParams.get('limit') || '50')
        const offset = parseInt(url.searchParams.get('offset') || '0')
        const status = url.searchParams.get('status')

        let query = supabaseAdmin
          .from('conversations')
          .select('*')
          .eq('company_id', companyId)
          .order('updated_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (status) query = query.eq('status', status)

        const { data, error, count } = await query
        if (error) throw error
        responseData = { conversations: data || [], total: count, limit, offset }
        statusCode = 200

      } else if (method === 'GET' && action && id === 'messages') {
        // Get messages for a conversation
        const limit = parseInt(url.searchParams.get('limit') || '100')
        
        // Verify conversation belongs to company
        const { data: conv } = await supabaseAdmin
          .from('conversations')
          .select('id')
          .eq('id', action)
          .eq('company_id', companyId)
          .maybeSingle()

        if (!conv) {
          responseData = { error: 'Conversation not found' }
          statusCode = 404
        } else {
          const { data, error } = await supabaseAdmin
            .from('messages')
            .select('*')
            .eq('conversation_id', action)
            .order('created_at', { ascending: true })
            .limit(limit)

          if (error) throw error
          responseData = { messages: data || [] }
          statusCode = 200
        }

      } else if (method === 'GET' && action) {
        // Get single conversation
        const { data, error } = await supabaseAdmin
          .from('conversations')
          .select('*')
          .eq('id', action)
          .eq('company_id', companyId)
          .maybeSingle()

        if (error) throw error
        if (!data) {
          responseData = { error: 'Conversation not found' }
          statusCode = 404
        } else {
          responseData = { conversation: data }
          statusCode = 200
        }
      }

    // ==================== MESSAGES ====================
    } else if (resource === 'messages') {
      if (!keyData.permissions.includes('messages')) {
        responseData = { error: 'Permission denied: messages' }
        statusCode = 403
      } else if (method === 'POST' && action === 'send') {
        // Send message
        const { phone, content, connection_id, message_type } = body
        if (!phone || !content) {
          responseData = { error: 'Missing phone or content' }
          statusCode = 400
        } else {
          // Find connection
          let connQuery = supabaseAdmin
            .from('connections')
            .select('*')
            .eq('company_id', companyId)
            .eq('is_active', true)

          if (connection_id) {
            connQuery = connQuery.eq('id', connection_id)
          }

          const { data: connections } = await connQuery.limit(1)
          const connection = connections?.[0]

          if (!connection) {
            responseData = { error: 'No active connection found' }
            statusCode = 404
          } else {
            // Send via Evolution
            const sendUrl = `${connection.base_url}/sendText`
            const sendRes = await fetch(sendUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Token': connection.token,
              },
              body: JSON.stringify({
                phone: phone,
                message: content,
              }),
            })

            const sendData = await sendRes.json()

            // Save message to DB
            // Find or create conversation
            const cleanPhone = phone.replace(/\D/g, '')
            let { data: conv } = await supabaseAdmin
              .from('conversations')
              .select('id')
              .eq('company_id', companyId)
              .eq('contact_phone', cleanPhone)
              .maybeSingle()

            if (!conv) {
              const { data: newConv } = await supabaseAdmin
                .from('conversations')
                .insert({
                  company_id: companyId,
                  contact_phone: cleanPhone,
                  contact_name: body.contact_name || cleanPhone,
                  connection_id: connection.id,
                  status: 'open',
                  last_message: content,
                  last_message_at: new Date().toISOString(),
                })
                .select('id')
                .single()
              conv = newConv
            }

            if (conv) {
              await supabaseAdmin.from('messages').insert({
                conversation_id: conv.id,
                sender_type: 'agent',
                content: content,
                message_type: message_type || 'text',
                status: 'sent',
              })

              await supabaseAdmin
                .from('conversations')
                .update({ last_message: content, last_message_at: new Date().toISOString() })
                .eq('id', conv.id)
            }

            responseData = { success: true, provider_response: sendData, conversation_id: conv?.id }
            statusCode = 200
          }
        }

      } else if (method === 'POST' && action === 'send-template') {
        // Send template message via Meta
        const { phone, template_name, template_language, connection_id, components } = body
        if (!phone || !template_name) {
          responseData = { error: 'Missing phone or template_name' }
          statusCode = 400
        } else {
          // Find Meta connection
          const { data: metaConn } = await supabaseAdmin
            .from('whatsapp_connections')
            .select('*')
            .eq('company_id', companyId)
            .eq('provider', 'meta')
            .eq('status', 'connected')
            .limit(1)

          const conn = metaConn?.[0]
          if (!conn || !conn.meta_access_token || !conn.meta_phone_number_id) {
            responseData = { error: 'No active Meta connection found' }
            statusCode = 404
          } else {
            const sendRes = await fetch(
              `https://graph.facebook.com/v22.0/${conn.meta_phone_number_id}/messages`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${conn.meta_access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  to: phone.replace(/\D/g, ''),
                  type: 'template',
                  template: {
                    name: template_name,
                    language: { code: template_language || 'pt_BR' },
                    components: components || [],
                  },
                }),
              }
            )

            const sendData = await sendRes.json()
            responseData = { success: sendRes.ok, provider_response: sendData }
            statusCode = sendRes.ok ? 200 : 502
          }
        }
      }

    // ==================== CONTACTS/LEADS ====================
    } else if (resource === 'contacts' || resource === 'leads') {
      if (method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') || '50')
        const offset = parseInt(url.searchParams.get('offset') || '0')

        const { data, error } = await supabaseAdmin
          .from('leads')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) throw error
        responseData = { contacts: data || [], limit, offset }
        statusCode = 200
      }

    // ==================== WEBHOOKS ====================
    } else if (resource === 'webhooks') {
      if (!keyData.permissions.includes('webhooks')) {
        responseData = { error: 'Permission denied: webhooks' }
        statusCode = 403
      } else if (method === 'POST' && action === 'test') {
        // Test webhook delivery
        if (!keyData.webhook_url) {
          responseData = { error: 'No webhook_url configured for this API key' }
          statusCode = 400
        } else {
          const testPayload = {
            event: 'test',
            timestamp: new Date().toISOString(),
            data: { message: 'This is a test webhook from Next Pro' }
          }

          try {
            const webhookRes = await fetch(keyData.webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(testPayload),
            })
            
            responseData = {
              success: webhookRes.ok,
              status_code: webhookRes.status,
              webhook_url: keyData.webhook_url,
            }
            statusCode = 200
          } catch (e) {
            responseData = { error: `Webhook delivery failed: ${e.message}` }
            statusCode = 502
          }
        }

      } else if (method === 'PUT' && action === 'configure') {
        // Configure webhook URL and events
        const { webhook_url, webhook_events } = body
        const updates: any = {}
        if (webhook_url !== undefined) updates.webhook_url = webhook_url
        if (webhook_events !== undefined) updates.webhook_events = webhook_events

        const { data, error } = await supabaseAdmin
          .from('external_api_keys')
          .update(updates)
          .eq('id', keyData.id)
          .select('webhook_url, webhook_events')
          .single()

        if (error) throw error
        responseData = { webhook: data, message: 'Webhook configured successfully' }
        statusCode = 200
      }
    }

  } catch (err: any) {
    console.error('API Error:', err)
    responseData = { error: err.message || 'Internal server error' }
    statusCode = 500
  }

  // Log the call
  await logApiCall(supabaseAdmin, {
    api_key_id: keyData.id,
    company_id: companyId,
    endpoint: `${method} /v1/${resource}/${action}`,
    method,
    status_code: statusCode,
    request_body: body,
    response_body: responseData,
  })

  return new Response(JSON.stringify(responseData), {
    status: statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
