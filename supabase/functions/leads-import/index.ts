import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireActivePlan } from "../_shared/planGuard.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })

  const blocked = await requireActivePlan(req, corsHeaders);
  if (blocked) return blocked;
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Não autenticado')
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      throw new Error('Arquivo não encontrado')
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    // Primeira linha são os headers
    const headers = lines[0].split(',').map(h => h.trim())
    const leadsData = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const lead: any = { user_id: user.id }
      
      headers.forEach((header, index) => {
        lead[header] = values[index] || ''
      })
      
      leadsData.push(lead)
    }

    const { data, error } = await supabase
      .from('leads')
      .insert(leadsData)
      .select()

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: data.length,
        message: `${data.length} leads importados com sucesso` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})