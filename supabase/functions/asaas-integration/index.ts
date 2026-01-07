import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_URL = "https://api.asaas.com/v3";

interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  phone: string;
}

interface AsaasPayment {
  id: string;
  customer: string;
  value: number;
  netValue: number;
  status: string;
  dueDate: string;
  billingType: string;
  invoiceUrl: string;
  bankSlipUrl: string;
  pixQrCodeId?: string;
  description?: string;
}

interface AsaasPixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

// Buscar cliente por CPF/CNPJ
async function searchCustomerByCpfCnpj(apiKey: string, cpfCnpj: string): Promise<AsaasCustomer | null> {
  // Remove caracteres especiais do CPF/CNPJ
  const cleanDocument = cpfCnpj.replace(/[^\d]/g, '');
  
  const response = await fetch(`${ASAAS_API_URL}/customers?cpfCnpj=${cleanDocument}`, {
    headers: {
      'access_token': apiKey,
    }
  });

  if (!response.ok) {
    console.error("Erro ao buscar cliente:", await response.text());
    return null;
  }

  const data = await response.json();
  return data.data?.[0] || null;
}

// Buscar cobranças de um cliente
async function getCustomerPayments(apiKey: string, customerId: string, status?: string): Promise<AsaasPayment[]> {
  let url = `${ASAAS_API_URL}/payments?customer=${customerId}`;
  if (status) {
    url += `&status=${status}`;
  }
  
  const response = await fetch(url, {
    headers: {
      'access_token': apiKey,
    }
  });

  if (!response.ok) {
    console.error("Erro ao buscar cobranças:", await response.text());
    return [];
  }

  const data = await response.json();
  return data.data || [];
}

// Buscar QR Code PIX de uma cobrança
async function getPixQrCode(apiKey: string, paymentId: string): Promise<AsaasPixQrCode | null> {
  const response = await fetch(`${ASAAS_API_URL}/payments/${paymentId}/pixQrCode`, {
    headers: {
      'access_token': apiKey,
    }
  });

  if (!response.ok) {
    console.error("Erro ao buscar QR Code PIX:", await response.text());
    return null;
  }

  return await response.json();
}

// Formatar valor em reais
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Formatar data
function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, cpfCnpj, customerId, paymentId, status } = await req.json();

    console.log("🏦 Asaas Integration");
    console.log("   Action:", action);
    console.log("   User ID:", userId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar chave API Asaas do usuário
    const { data: asaasKey, error: keyError } = await supabase
      .from("ai_provider_keys")
      .select("api_key")
      .eq("user_id", userId)
      .eq("provider", "asaas")
      .eq("is_configured", true)
      .eq("is_valid", true)
      .single();

    if (keyError || !asaasKey?.api_key) {
      console.error("❌ Chave Asaas não encontrada:", keyError);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Chave API Asaas não configurada. Configure em Configurações > IA."
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = asaasKey.api_key;

    switch (action) {
      case "search_customer": {
        if (!cpfCnpj) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "CPF/CNPJ é obrigatório"
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const customer = await searchCustomerByCpfCnpj(apiKey, cpfCnpj);
        
        if (!customer) {
          return new Response(JSON.stringify({ 
            success: false,
            found: false,
            message: "Cliente não encontrado com este CPF/CNPJ"
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ 
          success: true,
          found: true,
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            cpfCnpj: customer.cpfCnpj,
            phone: customer.phone
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_pending_payments": {
        if (!customerId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "ID do cliente é obrigatório"
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Buscar cobranças pendentes (PENDING, OVERDUE)
        const pendingPayments = await getCustomerPayments(apiKey, customerId, "PENDING");
        const overduePayments = await getCustomerPayments(apiKey, customerId, "OVERDUE");
        
        const allPending = [...pendingPayments, ...overduePayments];

        if (allPending.length === 0) {
          return new Response(JSON.stringify({ 
            success: true,
            found: false,
            message: "Não há cobranças pendentes para este cliente"
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Formatar cobranças para resposta
        const formattedPayments = allPending.map(p => ({
          id: p.id,
          value: p.value,
          valueFormatted: formatCurrency(p.value),
          dueDate: p.dueDate,
          dueDateFormatted: formatDate(p.dueDate),
          status: p.status,
          statusText: p.status === "OVERDUE" ? "VENCIDA" : "PENDENTE",
          billingType: p.billingType,
          description: p.description,
          invoiceUrl: p.invoiceUrl,
          bankSlipUrl: p.bankSlipUrl
        }));

        const totalValue = allPending.reduce((sum, p) => sum + p.value, 0);

        return new Response(JSON.stringify({ 
          success: true,
          found: true,
          payments: formattedPayments,
          totalValue,
          totalValueFormatted: formatCurrency(totalValue),
          count: formattedPayments.length
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_payment_pix": {
        if (!paymentId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "ID da cobrança é obrigatório"
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const pixData = await getPixQrCode(apiKey, paymentId);
        
        if (!pixData) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "Não foi possível obter o QR Code PIX para esta cobrança"
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ 
          success: true,
          pix: {
            payload: pixData.payload,
            qrCodeBase64: pixData.encodedImage,
            expirationDate: pixData.expirationDate
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_customer_invoices": {
        // Ação completa: buscar cliente por CPF e retornar faturas pendentes com PIX
        if (!cpfCnpj) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "CPF/CNPJ é obrigatório"
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 1. Buscar cliente
        const customer = await searchCustomerByCpfCnpj(apiKey, cpfCnpj);
        
        if (!customer) {
          return new Response(JSON.stringify({ 
            success: false,
            found: false,
            message: `Não encontrei nenhum cliente cadastrado com o CPF/CNPJ ${cpfCnpj}. Verifique se o documento está correto.`
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 2. Buscar cobranças pendentes
        const pendingPayments = await getCustomerPayments(apiKey, customer.id, "PENDING");
        const overduePayments = await getCustomerPayments(apiKey, customer.id, "OVERDUE");
        const allPending = [...pendingPayments, ...overduePayments];

        if (allPending.length === 0) {
          return new Response(JSON.stringify({ 
            success: true,
            found: true,
            customerName: customer.name,
            hasPayments: false,
            message: `${customer.name}, você não possui faturas pendentes no momento. Está tudo em dia! ✅`
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 3. Para a primeira cobrança, buscar o PIX
        const firstPayment = allPending[0];
        let pixPayload = null;
        
        try {
          const pixData = await getPixQrCode(apiKey, firstPayment.id);
          if (pixData) {
            pixPayload = pixData.payload;
          }
        } catch (e) {
          console.error("Erro ao buscar PIX:", e);
        }

        // 4. Formatar resposta
        const formattedPayments = allPending.map(p => ({
          id: p.id,
          value: p.value,
          valueFormatted: formatCurrency(p.value),
          dueDate: p.dueDate,
          dueDateFormatted: formatDate(p.dueDate),
          status: p.status,
          statusText: p.status === "OVERDUE" ? "VENCIDA" : "PENDENTE",
          invoiceUrl: p.invoiceUrl,
          bankSlipUrl: p.bankSlipUrl
        }));

        const totalValue = allPending.reduce((sum, p) => sum + p.value, 0);

        return new Response(JSON.stringify({ 
          success: true,
          found: true,
          hasPayments: true,
          customerName: customer.name,
          customerId: customer.id,
          payments: formattedPayments,
          totalValue,
          totalValueFormatted: formatCurrency(totalValue),
          count: formattedPayments.length,
          pixPayload,
          firstPayment: formattedPayments[0]
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ 
          success: false,
          error: `Ação desconhecida: ${action}`
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

  } catch (error) {
    console.error("❌ Erro asaas-integration:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
