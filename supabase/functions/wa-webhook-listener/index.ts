import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// ========================================
// VALIDAÇÃO DE RESPOSTAS
// ========================================

const validators = {
  email: (value: string): { valid: boolean; message: string } => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      valid: regex.test(value.trim()),
      message: "Por favor, digite um email válido (ex: nome@email.com)"
    };
  },
  
  phone: (value: string): { valid: boolean; message: string } => {
    const cleaned = value.replace(/\D/g, "");
    return {
      valid: cleaned.length >= 10 && cleaned.length <= 15,
      message: "Por favor, digite um telefone válido (ex: 11999998888)"
    };
  },
  
  cpf: (value: string): { valid: boolean; message: string } => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length !== 11) {
      return { valid: false, message: "CPF deve ter 11 dígitos" };
    }
    // Validação básica de CPF
    if (/^(\d)\1+$/.test(cleaned)) {
      return { valid: false, message: "CPF inválido" };
    }
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i);
    let d1 = (sum * 10) % 11;
    if (d1 === 10) d1 = 0;
    if (d1 !== parseInt(cleaned[9])) {
      return { valid: false, message: "CPF inválido" };
    }
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i);
    let d2 = (sum * 10) % 11;
    if (d2 === 10) d2 = 0;
    return {
      valid: d2 === parseInt(cleaned[10]),
      message: "CPF inválido"
    };
  },
  
  number: (value: string): { valid: boolean; message: string } => {
    const num = parseFloat(value.replace(",", "."));
    return {
      valid: !isNaN(num),
      message: "Por favor, digite apenas números"
    };
  },
  
  address: (value: string): { valid: boolean; message: string } => {
    return {
      valid: value.trim().length >= 5,
      message: "Por favor, digite um endereço válido (mínimo 5 caracteres)"
    };
  },
  
  text: (_value: string): { valid: boolean; message: string } => {
    return { valid: true, message: "" };
  },
  
  any: (_value: string): { valid: boolean; message: string } => {
    return { valid: true, message: "" };
  }
};

// ========================================
// INTERFACES DO FLOW ENGINE
// ========================================

interface FlowState {
  flow_id: string;
  current_node_id: string;
  waiting_for: "input" | "form" | "menu" | "aiAgent";
  variable_name?: string;
  validation_type?: string;
  error_message?: string;
  form_fields?: any[];
  form_current_index?: number;
  form_collected?: Record<string, any>;
  vars: Record<string, any>;
  started_at: string;
  // Menu state
  menu_options?: any[];
  menu_error_count?: number;
  menu_max_errors?: number;
  // AI Agent state
  ai_agent_id?: string;
  ai_fallback_department_id?: string;
  ai_max_errors?: number;
  ai_error_count?: number;
}

interface FlowContext {
  message: string;
  contact: {
    phone: string;
    name: string;
  };
  vars: Record<string, any>;
  conversationId: string;
  connectionId: string;
  // NEW: Support for media messages (images, documents)
  media?: {
    url: string;
    type: "image" | "document" | "video" | "audio";
    caption?: string;
  };
}

interface FlowNode {
  id: string;
  type: string;
  data: any;
  position: { x: number; y: number };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

// ========================================
// FLOW ENGINE - Execução de Fluxos
// ========================================

async function executeFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  context: FlowContext,
  supabase: any,
  connection: any,
  startFromNodeId?: string
): Promise<{ success: boolean; responses: string[]; paused?: boolean; pauseState?: any }> {
  const responses: string[] = [];
  let currentContext = { ...context };

  console.log("🚀 Iniciando execução do fluxo");
  console.log("📝 Nós:", nodes.length);
  console.log("🔗 Conexões:", edges.length);
  if (startFromNodeId) console.log("▶️ Retomando do nó:", startFromNodeId);

  // Find start node or resume from specific node
  let currentNode: FlowNode | undefined;
  
  if (startFromNodeId) {
    currentNode = nodes.find((n) => n.id === startFromNodeId);
    if (!currentNode) {
      console.log("❌ Nó de retomada não encontrado:", startFromNodeId);
      return { success: false, responses: [] };
    }
  } else {
    currentNode = nodes.find((n) => n.type === "start");
    if (!currentNode) {
      console.log("❌ Fluxo não possui bloco de Início");
      return { success: false, responses: [] };
    }
  }

  const visited = new Set<string>();
  const maxIterations = 50;
  let iterations = 0;

  while (currentNode && iterations < maxIterations) {
    iterations++;
    const nodeId = currentNode.id;

    if (visited.has(nodeId)) {
      console.log("⚠️ Loop detectado no fluxo");
      break;
    }
    visited.add(nodeId);

    console.log(`▶️ Executando bloco: ${currentNode.type} (${nodeId})`);

    try {
      const result = await executeNode(currentNode, currentContext, supabase, connection, responses, nodes, edges);
      currentContext.vars = { ...currentContext.vars, ...result.vars };

      // Check if flow should pause (waiting for input)
      if (result.pauseFlow) {
        console.log("⏸️ Fluxo pausado - aguardando resposta do usuário");
        return { 
          success: true, 
          responses, 
          paused: true, 
          pauseState: result.pauseState 
        };
      }

      // Find next node
      const nextNodeId: string | undefined = result.nextNodeId || findNextNode(currentNode, edges, result.branch);
      if (!nextNodeId) {
        console.log("✅ Fluxo finalizado (sem próximo nó)");
        break;
      }

      currentNode = nodes.find((n: FlowNode) => n.id === nextNodeId);
    } catch (error: any) {
      console.error(`❌ Erro no bloco ${nodeId}:`, error.message);
      break;
    }
  }

  if (iterations >= maxIterations) {
    console.log("⚠️ Limite de iterações excedido");
  }

  console.log(`✅ Fluxo executado. ${responses.length} mensagem(ns) enviada(s)`);
  return { success: true, responses };
}

async function executeNode(
  node: FlowNode,
  context: FlowContext,
  supabase: any,
  connection: any,
  responses: string[],
  nodes: FlowNode[],
  edges: FlowEdge[]
): Promise<{ vars: Record<string, any>; nextNodeId?: string; branch?: string; pauseFlow?: boolean; pauseState?: any }> {
  const data = node.data || {};

  switch (node.type) {
    case "start":
      return { vars: {} };

    case "message":
      return await executeMessageNode(node, data, context, supabase, connection, responses, edges);

    case "aiAgent":
      return await executeAiAgentNode(node, data, context, supabase, connection, edges);

    case "condition":
      return executeConditionNode(data, context);

    case "delay":
      return await executeDelayNode(data);

    case "input":
      return await executeInputNode(node, data, context, supabase, connection, responses, edges);

    case "forward":
      return await executeForwardNode(data, context, supabase);

    case "tag":
      return await executeTagNode(data, context, supabase);

    case "code":
      return await executeCodeNode(data, context);

    case "http":
      return await executeHttpNode(data, context);

    case "form":
      return await executeFormNode(data, context, supabase, connection, responses, edges, node);

    case "smartForm":
      return await executeSmartFormNode(data, context, supabase, connection, responses);

    case "sendForm":
      return await executeSendFormNode(data, context, supabase, connection, responses);

    default:
      console.log(`⚠️ Tipo de bloco não suportado: ${node.type}`);
      return { vars: {} };
  }
}

// ========================================
// INPUT NODE - Aguardar resposta do usuário
// ========================================
async function executeInputNode(
  node: FlowNode,
  data: any,
  context: FlowContext,
  supabase: any,
  connection: any,
  responses: string[],
  edges: FlowEdge[]
): Promise<{ vars: Record<string, any>; pauseFlow?: boolean; pauseState?: any }> {
  const promptMessage = data.promptMessage || "Por favor, responda:";
  const variableName = data.variableName || "resposta";
  const validationType = data.validationType || "any";
  const errorMessage = data.errorMessage || "Por favor, digite um valor válido";

  console.log("📝 Executando bloco de Input");
  console.log(`   - Variável: ${variableName}`);
  console.log(`   - Validação: ${validationType}`);

  // Use connection's base_url or fallback
  let BASE_URL = connection.base_url;
  if (!BASE_URL) {
    const environment = connection.environment || "TESTE";
    BASE_URL = environment === "PROD" 
      ? "https://app.uazapi.com" 
      : "https://free.uazapi.com";
  }

  // Send prompt message
  try {
    await fetch(`${BASE_URL}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': connection.token
      },
      body: JSON.stringify({
        number: context.contact.phone,
        text: promptMessage
      })
    });
    responses.push(promptMessage);
    console.log("📤 Pergunta enviada:", promptMessage);
  } catch (e: any) {
    console.error("❌ Erro ao enviar pergunta:", e.message);
  }

  // Find next node ID for when we resume
  const nextNodeId = findNextNode(node, edges);

  // Save flow state to conversation
  const flowState: FlowState = {
    flow_id: context.vars._flowId || "",
    current_node_id: node.id,
    waiting_for: "input",
    variable_name: variableName,
    validation_type: validationType,
    error_message: errorMessage,
    vars: context.vars,
    started_at: new Date().toISOString()
  };

  await supabase
    .from("conversations")
    .update({ flow_state: flowState })
    .eq("id", context.conversationId);

  console.log("💾 Estado do fluxo salvo - aguardando resposta");

  return { 
    vars: {}, 
    pauseFlow: true,
    pauseState: { ...flowState, nextNodeId }
  };
}

// ========================================
// SMART FORM NODE - Formulário público com link
// ========================================
async function executeSmartFormNode(
  data: any,
  context: FlowContext,
  supabase: any,
  connection: any,
  responses: string[]
): Promise<{ vars: Record<string, any> }> {
  const formId = data.formId;
  const checkBusinessHours = data.checkBusinessHours !== false;
  const messageBeforeLink = data.messageBeforeLink || '';
  const successMessage = data.successMessage || '';

  console.log("📋 Executando bloco Smart Form");
  console.log(`   - Form ID: ${formId}`);
  console.log(`   - Check Business Hours: ${checkBusinessHours}`);

  if (!formId) {
    console.log("⚠️ Smart Form sem formulário selecionado");
    return { vars: {} };
  }

  // Use connection's base_url or fallback
  let BASE_URL = connection.base_url;
  if (!BASE_URL) {
    const environment = connection.environment || "TESTE";
    BASE_URL = environment === "PROD" 
      ? "https://app.uazapi.com" 
      : "https://free.uazapi.com";
  }

  try {
    // Get form configuration with department business hours
    const { data: form, error: formError } = await supabase
      .from("smart_forms")
      .select("*, departments(business_hours)")
      .eq("id", formId)
      .single();

    if (formError || !form) {
      console.error("❌ Smart Form não encontrado:", formError);
      return { vars: { smartFormError: "Form not found" } };
    }

    // Check business hours if enabled
    if (checkBusinessHours && form.department_id) {
      const businessHours = form.departments?.business_hours;
      const withinHours = isWithinBusinessHours(businessHours);
      
      console.log(`⏰ Horário comercial: ${withinHours ? 'DENTRO' : 'FORA'}`);
      
      if (withinHours) {
        console.log("✅ Dentro do horário comercial - não enviando formulário");
        return { vars: { smartFormSent: false, withinBusinessHours: true } };
      }
    }

    // Generate unique token
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let uniqueToken = '';
    for (let i = 0; i < 8; i++) {
      uniqueToken += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Get user_id from connection
    const { data: connData } = await supabase
      .from("connections")
      .select("user_id")
      .eq("id", connection.id)
      .single();

    const userId = connData?.user_id || form.user_id;

    // Create submission record
    const { data: submission, error: subError } = await supabase
      .from("smart_form_submissions")
      .insert({
        user_id: userId,
        form_id: formId,
        connection_id: connection.id,
        department_id: form.department_id,
        unique_token: uniqueToken,
        phone: context.contact.phone.replace(/\D/g, ''),
        name: context.contact.name,
        status: 'pendente',
        conversation_id: context.conversationId
      })
      .select()
      .single();

    if (subError) {
      console.error("❌ Erro ao criar submission:", subError);
      return { vars: { smartFormError: "Failed to create submission" } };
    }

    // Generate public URL - ALWAYS use fixed domain
    const FIXED_FORM_BASE_URL = "https://ia.marketflowchat.com.br";
    const formUrl = `${FIXED_FORM_BASE_URL}/f/${uniqueToken}`;

    console.log("✅ Link do formulário gerado:", formUrl);
    console.log("   Base URL usada:", FIXED_FORM_BASE_URL);

    // Send message before link if configured
    if (messageBeforeLink) {
      await fetch(`${BASE_URL}/send/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': connection.token
        },
        body: JSON.stringify({
          number: context.contact.phone,
          text: messageBeforeLink
        })
      });
      responses.push(messageBeforeLink);
      console.log("📤 Mensagem antes do link enviada");
    }

    // Send form link with formatted message
    const welcomeMessage = form.welcome_message || 'Olá! Estamos fora do horário comercial. Preencha o formulário abaixo!';
    
    // Mensagem formatada estilo WhatsApp profissional
    const linkMessage = `☐ *${form.name || 'Fora do Horário'}*

${welcomeMessage}

👇 Clique no link abaixo para preencher:
${formUrl}

⏳ Responderemos assim que possível!`;
    
    await fetch(`${BASE_URL}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': connection.token
      },
      body: JSON.stringify({
        number: context.contact.phone,
        text: linkMessage
      })
    });
    
    responses.push(linkMessage);
    console.log("📤 Link do formulário enviado com formatação");

    return { 
      vars: { 
        smartFormSent: true, 
        smartFormUrl: formUrl,
        smartFormToken: uniqueToken,
        smartFormSubmissionId: submission.id
      } 
    };

  } catch (error: any) {
    console.error("❌ Erro no Smart Form:", error.message);
    return { vars: { smartFormError: error.message } };
  }
}

// ========================================
// SEND FORM NODE - Formulário com link personalizado
// ========================================
async function executeSendFormNode(
  data: any,
  context: FlowContext,
  supabase: any,
  connection: any,
  responses: string[]
): Promise<{ vars: Record<string, any> }> {
  const initialMessage = data.initialMessage || 'Para agilizar seu atendimento, preencha o formulário abaixo:';
  const questions = data.questions || [];
  const expiresInHours = data.expiresInHours || 24;

  console.log("📋 Executando bloco Send Form");
  console.log(`   - Questions: ${questions.length}`);
  console.log(`   - Expires in: ${expiresInHours}h`);

  // Use connection's base_url or fallback
  let BASE_URL = connection.base_url;
  if (!BASE_URL) {
    const environment = connection.environment || "TESTE";
    BASE_URL = environment === "PROD" 
      ? "https://app.uazapi.com" 
      : "https://free.uazapi.com";
  }

  try {
    // Get user_id from connection
    const { data: connData } = await supabase
      .from("connections")
      .select("user_id")
      .eq("id", connection.id)
      .single();

    const userId = connData?.user_id;

    if (!userId) {
      console.error("❌ User ID não encontrado");
      return { vars: { sendFormError: "User ID not found" } };
    }

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Create flow_forms record
    const { data: formRecord, error: formError } = await supabase
      .from("flow_forms")
      .insert({
        user_id: userId,
        connection_id: connection.id,
        phone: context.contact.phone.replace(/\D/g, ''),
        initial_message: initialMessage,
        questions: questions,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (formError) {
      console.error("❌ Erro ao criar flow_form:", formError);
      return { vars: { sendFormError: "Failed to create form" } };
    }

    // Generate form URL
    const formUrl = `https://lvldqyyzhlygwbgcdqcg.lovable.app/form/${formRecord.id}`;

    console.log("✅ Link do formulário gerado:", formUrl);

    // Send initial message with link
    const linkMessage = `${initialMessage}\n\n🔗 ${formUrl}`;
    
    await fetch(`${BASE_URL}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': connection.token
      },
      body: JSON.stringify({
        number: context.contact.phone,
        text: linkMessage
      })
    });
    
    responses.push(linkMessage);
    console.log("📤 Link do formulário enviado");

    return { 
      vars: { 
        sendFormSent: true, 
        sendFormUrl: formUrl,
        sendFormId: formRecord.id
      } 
    };

  } catch (error: any) {
    console.error("❌ Erro no Send Form:", error.message);
    return { vars: { sendFormError: error.message } };
  }
}

// Helper function to check business hours
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

// ========================================
// FORM NODE - Coleta de dados via formulário
// ========================================
async function executeFormNode(
  data: any,
  context: FlowContext,
  supabase: any,
  connection: any,
  responses: string[],
  edges: FlowEdge[],
  node: FlowNode
): Promise<{ vars: Record<string, any>; pauseFlow?: boolean; pauseState?: any }> {
  const introMessage = data.introMessage || '';
  const fields = data.fields || [];
  const sendAllAtOnce = data.sendAllAtOnce !== false; // Default true
  const completionMessage = data.completionMessage || '';

  console.log("📋 Executando bloco de Formulário");
  console.log(`📝 Campos: ${fields.length}`);
  console.log(`📤 Enviar tudo de uma vez: ${sendAllAtOnce}`);

  if (fields.length === 0) {
    console.log("⚠️ Formulário sem campos configurados");
    return { vars: {} };
  }

  // Use connection's base_url or fallback
  let BASE_URL = connection.base_url;
  if (!BASE_URL) {
    const environment = connection.environment || "TESTE";
    BASE_URL = environment === "PROD" 
      ? "https://app.uazapi.com" 
      : "https://free.uazapi.com";
  }

  try {
    let questionMessage = '';
    
    if (sendAllAtOnce) {
      // Build numbered list of all questions
      if (introMessage) {
        questionMessage = introMessage + '\n\n';
      }
      
      fields.forEach((field: any, index: number) => {
        const fieldLabel = field.label || field.name || `Campo ${index + 1}`;
        const fieldType = field.type || 'text';
        let typeHint = '';
        if (fieldType === 'email') typeHint = ' _(email)_';
        if (fieldType === 'phone') typeHint = ' _(telefone)_';
        if (fieldType === 'number') typeHint = ' _(número)_';
        if (fieldType === 'cpf') typeHint = ' _(CPF)_';
        if (fieldType === 'address') typeHint = ' _(endereço)_';
        
        questionMessage += `${index + 1}: ${fieldLabel}${typeHint}\n`;
      });
      
      console.log(`📤 Enviando formulário completo com ${fields.length} campos`);
    } else {
      // Send first field only
      const firstField = fields[0];
      const fieldLabel = firstField.label || firstField.name || 'Campo 1';
      const fieldType = firstField.type || 'text';
      
      if (introMessage) {
        questionMessage = introMessage + '\n\n';
      }
      questionMessage += fieldLabel;
      if (fieldType === 'email') questionMessage += ' _(email)_';
      if (fieldType === 'phone') questionMessage += ' _(telefone)_';
      if (fieldType === 'number') questionMessage += ' _(número)_';
      if (fieldType === 'cpf') questionMessage += ' _(CPF)_';
      if (fieldType === 'address') questionMessage += ' _(endereço)_';
      
      console.log(`📤 Enviando primeira pergunta do formulário`);
    }
    
    await fetch(`${BASE_URL}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': connection.token
      },
      body: JSON.stringify({
        number: context.contact.phone,
        text: questionMessage.trim()
      })
    });
    
    responses.push(questionMessage);
    console.log("✅ Pergunta enviada:", questionMessage.substring(0, 100));

    // Find next node for when form is complete
    const nextNodeId = findNextNode(node, edges);

    // Save form state to conversation
    const flowState: FlowState = {
      flow_id: context.vars._flowId || "",
      current_node_id: node.id,
      waiting_for: "form",
      form_fields: fields,
      form_current_index: 0,
      form_collected: {},
      form_send_all_at_once: sendAllAtOnce,
      form_completion_message: completionMessage,
      vars: context.vars,
      started_at: new Date().toISOString()
    } as any;

    await supabase
      .from('conversations')
      .update({ flow_state: flowState })
      .eq('id', context.conversationId);

    console.log(`💾 Estado do formulário salvo - aguardando resposta do campo 1`);

    return { 
      vars: {}, 
      pauseFlow: true,
      pauseState: { ...flowState, nextNodeId }
    };
  } catch (e: any) {
    console.error(`❌ Erro no formulário: ${e.message}`);
    return { vars: { formError: e.message } };
  }
}

// ========================================
// FLOW RESUME HANDLER - Retomar fluxo pendente
// ========================================
async function handleFlowResume(
  flowState: FlowState,
  userResponse: string,
  conversationId: string,
  phone: string,
  contactName: string,
  connection: any,
  supabase: any,
  wasAudioMessage: boolean = false
): Promise<{ handled: boolean; responses?: string[]; stillWaiting?: boolean }> {
  const responses: string[] = [];

  // Use connection's base_url or fallback
  let BASE_URL = connection.base_url;
  if (!BASE_URL) {
    const environment = connection.environment || "TESTE";
    BASE_URL = environment === "PROD" 
      ? "https://app.uazapi.com" 
      : "https://free.uazapi.com";
  }

  // Handle INPUT node response
  if (flowState.waiting_for === "input") {
    const validationType = flowState.validation_type || "any";
    const variableName = flowState.variable_name || "resposta";
    const errorMessage = flowState.error_message || "Por favor, digite um valor válido";

    console.log(`📝 Processando resposta para input: ${variableName}`);
    console.log(`   Validação: ${validationType}`);
    console.log(`   Resposta: ${userResponse.substring(0, 50)}`);

    // Validate response
    const validator = validators[validationType as keyof typeof validators] || validators.any;
    const validation = validator(userResponse);

    if (!validation.valid) {
      console.log(`❌ Validação falhou: ${validation.message}`);
      
      // Send error message
      await fetch(`${BASE_URL}/send/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'token': connection.token },
        body: JSON.stringify({ number: phone, text: errorMessage || validation.message })
      });
      
      responses.push(errorMessage || validation.message);
      return { handled: true, responses, stillWaiting: true };
    }

    console.log(`✅ Validação passou`);

    // Save collected value to vars
    const updatedVars = { ...flowState.vars, [variableName]: userResponse };

    // Clear flow state and continue flow
    await supabase
      .from("conversations")
      .update({ flow_state: null })
      .eq("id", conversationId);

    // Get the flow to continue execution
    const { data: flow } = await supabase
      .from("flows")
      .select("flow_json")
      .eq("id", flowState.flow_id)
      .single();

    if (flow?.flow_json) {
      const flowJson = flow.flow_json as any;
      const nodes = flowJson.nodes || [];
      const edges = flowJson.edges || [];

      // Find next node after current input
      const currentNode = nodes.find((n: any) => n.id === flowState.current_node_id);
      if (currentNode) {
        const nextNodeId = findNextNode(currentNode, edges);
        
        if (nextNodeId) {
          console.log(`▶️ Continuando fluxo do nó: ${nextNodeId}`);
          
          const flowContext: FlowContext = {
            message: userResponse,
            contact: { phone, name: contactName },
            vars: { ...updatedVars, _flowId: flowState.flow_id },
            conversationId,
            connectionId: connection.id
          };

          const result = await executeFlow(nodes, edges, flowContext, supabase, connection, nextNodeId);
          return { handled: true, responses: result.responses, stillWaiting: result.paused };
        }
      }
    }

    return { handled: true, responses };
  }

  // Handle AI AGENT node response
  if (flowState.waiting_for === "aiAgent") {
    const agentId = flowState.ai_agent_id;
    const fallbackDepartmentId = flowState.ai_fallback_department_id;
    const maxErrors = flowState.ai_max_errors || 3;
    let errorCount = flowState.ai_error_count || 0;

    // ========================================
    // DETECTAR E TRANSCREVER ÁUDIO
    // ========================================
    let messageToProcess = userResponse;
    let isAudioMessage = wasAudioMessage; // Use the parameter passed from main handler
    
    // Check if the message is audio JSON
    if (userResponse.startsWith('{') && userResponse.includes('"URL"')) {
      try {
        const audioData = JSON.parse(userResponse);
        if (audioData.URL && (audioData.mimetype?.includes('audio') || audioData.PTT)) {
          isAudioMessage = true;
          console.log("🎤 Mensagem de áudio detectada - transcrevendo...");
          
          // Get the agent's user_id to use their API key for transcription
          const { data: agentData } = await supabase
            .from("agents")
            .select("user_id")
            .eq("id", agentId)
            .single();
          
          // Call transcription service with userId
          const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
          const transcribeResponse = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-transcribe`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
            },
            body: JSON.stringify({ 
              audioUrl: audioData.URL,
              userId: agentData?.user_id 
            })
          });
          
          if (transcribeResponse.ok) {
            const transcribeData = await transcribeResponse.json();
            if (transcribeData.success && transcribeData.text && transcribeData.text.length > 2) {
              messageToProcess = transcribeData.text;
              console.log("✅ Áudio transcrito:", messageToProcess.substring(0, 100));
            } else if (transcribeData.rateLimited) {
              console.log("⚠️ Rate limited na transcrição, usando mensagem genérica");
              messageToProcess = "O usuário enviou um áudio. Por favor, responda que você recebeu o áudio mas não conseguiu ouvi-lo, e peça para ele digitar a mensagem.";
            } else {
              console.log("⚠️ Transcrição vazia ou falhou, usando mensagem genérica");
              messageToProcess = "O usuário enviou um áudio. Por favor, responda que você recebeu o áudio mas não conseguiu ouvi-lo, e peça para ele digitar a mensagem.";
            }
          } else {
            console.error("❌ Erro na transcrição:", await transcribeResponse.text());
            messageToProcess = "O usuário enviou um áudio. Por favor, responda que você recebeu o áudio mas não conseguiu ouvi-lo, e peça para ele digitar a mensagem.";
          }
        }
      } catch (parseError) {
        // Not JSON or invalid, continue with original message
        console.log("📝 Mensagem não é áudio, processando como texto");
      }
    }

    console.log("=".repeat(60));
    console.log("🤖 PROCESSANDO MENSAGEM PARA ASSISTENTE IA");
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Mensagem: ${messageToProcess.substring(0, 50)}`);
    console.log(`   É áudio: ${isAudioMessage}`);
    console.log(`   Erros: ${errorCount}/${maxErrors}`);
    console.log(`   Fallback Dept: ${fallbackDepartmentId}`);
    console.log("=".repeat(60));

    if (!agentId) {
      console.log("⚠️ Nenhum agente configurado");
      await supabase.from("conversations").update({ flow_state: null }).eq("id", conversationId);
      return { handled: true, responses };
    }

    // Check for human transfer keywords BEFORE calling AI
    const humanTransferKeywords = [
      "atendente", "humano", "pessoa", "humana", "atendimento humano",
      "falar com alguem", "falar com alguém", "falar com pessoa",
      "quero atendente", "quero humano", "preciso de ajuda humana",
      "transferir", "transferencia", "transferência", "agente",
      "operador", "suporte humano", "nao quero robô", "não quero robô",
      "nao quero robo", "não quero robo", "quero falar com gente"
    ];
    
    const normalizedInput = messageToProcess.toLowerCase().trim();
    const wantsHuman = humanTransferKeywords.some(keyword => 
      normalizedInput.includes(keyword) || normalizedInput === keyword
    );

    if (wantsHuman && fallbackDepartmentId) {
      console.log("👤 Usuário solicitou atendimento humano por palavra-chave");
      
      const transferMessage = "Claro! Vou transferir você para um de nossos atendentes. Aguarde um momento! ⏳";
      await fetch(`${BASE_URL}/send/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "token": connection.token },
        body: JSON.stringify({ number: phone, text: transferMessage })
      });
      responses.push(transferMessage);

      await transferToFallback(conversationId, fallbackDepartmentId, supabase, connection, phone, responses, BASE_URL);
      return { handled: true, responses };
    }

    try {
      // Buscar configuração do agente
      const { data: agent, error: agentError } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agentId)
        .single();

      if (agentError || !agent) {
        console.error("❌ Agente não encontrado:", agentError);
        throw new Error("Agent not found");
      }

      console.log("📋 Agente:", agent.name);
      console.log("   - Model:", agent.model);
      console.log("   - Prompt:", agent.system_prompt?.substring(0, 50) || "Padrão");

      // ========================================
      // CHAMAR AI-ASSISTANT-CHAT EDGE FUNCTION
      // ========================================
      console.log("🤖 Chamando ai-assistant-chat para processamento...");
      
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const aiChatResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-assistant-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          message: messageToProcess,
          agentId: agentId,
          conversationId: conversationId,
          contactName: contactName,
          contactPhone: phone,
          connectionId: connection.id,
          connectionToken: connection.token,
          connectionBaseUrl: BASE_URL,
          connectionEnvironment: connection.environment,
          connectionInstanceName: (connection as any).instance_name,
          isAudioMessage: isAudioMessage,
          respondWithAudio: agent.voice_enabled && isAudioMessage

        })
      });

      if (!aiChatResponse.ok) {
        const errorText = await aiChatResponse.text();
        console.error("❌ Erro ai-assistant-chat:", aiChatResponse.status, errorText);
        
        if (aiChatResponse.status === 429 || aiChatResponse.status === 402) {
          errorCount++;
          console.log(`⚠️ Erro de limite/pagamento. Erro ${errorCount}/${maxErrors}`);
          
          if (errorCount >= maxErrors && fallbackDepartmentId) {
            console.log("🔄 Transferindo para departamento de fallback...");
            await transferToFallback(conversationId, fallbackDepartmentId, supabase, connection, phone, responses, BASE_URL);
            return { handled: true, responses };
          }
          
          await supabase
            .from("conversations")
            .update({ flow_state: { ...flowState, ai_error_count: errorCount } })
            .eq("id", conversationId);
          
          return { handled: true, responses, stillWaiting: true };
        }
        
        throw new Error(`AI Assistant error: ${aiChatResponse.status}`);
      }

      const aiData = await aiChatResponse.json();
      
      if (aiData.error) {
        throw new Error(aiData.error);
      }
      
      // Check for escalation/transfer from ai-assistant-chat
      if (aiData.escalated) {
        console.log("🔄 IA escalou - transferindo para departamento");
        
        if (fallbackDepartmentId) {
          await transferToFallback(conversationId, fallbackDepartmentId, supabase, connection, phone, responses, BASE_URL);
        }
        return { handled: true, responses };
      }

      let aiText = aiData.message || aiData.response || "";

      if (!aiText) {
        throw new Error("No response from AI");
      }

      console.log("✅ Resposta IA:", aiText.substring(0, 100));

      // Check if AI wants to transfer
      if (aiText.includes("[TRANSFERIR]") && fallbackDepartmentId) {
        console.log("🔄 IA solicitou transferência para humano");
        
        // Send a nicer message instead of the raw response
        const transferMessage = "Vou transferir você para um de nossos atendentes. Aguarde um momento! ⏳";
        
        await fetch(`${BASE_URL}/send/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "token": connection.token },
          body: JSON.stringify({ number: phone, text: transferMessage })
        });
        responses.push(transferMessage);

        await transferToFallback(conversationId, fallbackDepartmentId, supabase, connection, phone, responses, BASE_URL);
        return { handled: true, responses };
      }

      // Check if AI wants to create a ticket ({{abrir_chamado}} or similar)
      const wantsToCreateTicket = aiText.includes("{{abrir_chamado}}") || 
                                   aiText.includes("{{criar_chamado}}") ||
                                   aiText.includes("{{open_ticket}}") ||
                                   (aiText.toLowerCase().includes("vou abrir um chamado") && 
                                    aiText.toLowerCase().includes("suporte"));
      
      if (wantsToCreateTicket) {
        console.log("📋 IA solicitou abertura de chamado");
        
        // Create the AI ticket
        const { data: ticket, error: ticketError } = await supabase
          .from("ai_tickets")
          .insert({
            user_id: agent.user_id,
            conversation_id: conversationId,
            connection_id: connection.id,
            agent_id: agentId,
            contact_name: contactName || "Cliente",
            contact_phone: phone,
            reason: messageToProcess.substring(0, 200) || "Solicitação de suporte via chatbot",
            dissatisfaction_level: "medium",
            ai_summary: `Conversa com ${contactName || 'cliente'}. Último assunto: ${messageToProcess.substring(0, 100)}`,
            status: "pending",
            priority: "normal"
          })
          .select()
          .single();

        if (ticketError) {
          console.error("❌ Erro ao criar chamado:", ticketError);
        } else {
          console.log("✅ Chamado IA criado:", ticket.id);
          
          // Replace placeholder with actual ticket confirmation
          const ticketCode = ticket.id.substring(0, 8).toUpperCase();
          aiText = aiText
            .replace(/\{\{abrir_chamado\}\}/g, '')
            .replace(/\{\{criar_chamado\}\}/g, '')
            .replace(/\{\{open_ticket\}\}/g, '')
            .trim();
          
          // If response is now empty or too short, provide a proper message
          if (!aiText || aiText.length < 20) {
            aiText = `✅ Chamado aberto com sucesso!\n\n📋 Protocolo: ${ticketCode}\n\nNossa equipe de suporte entrará em contato em breve para resolver sua questão. Obrigado pela paciência!`;
          } else {
            // Append ticket info to existing response
            aiText = aiText.replace(
              /pronto.*chamado.*aberto/i,
              `Pronto! ✅ Chamado aberto com protocolo: ${ticketCode}`
            );
          }
        }
      }

      // ai-assistant-chat already handles:
      // - Sending the WhatsApp message (text or audio)
      // - Saving to database
      // - Sending Asaas payment data (PIX button, PDF, boleto)
      // - Updating agent stats
      // So we should NOT duplicate these actions here
      
      console.log("✅ ai-assistant-chat já tratou envio e salvamento");
      responses.push(aiText);

      // Keep the flow paused waiting for more messages (AI continues conversation)
      console.log("⏳ Ainda aguardando mais respostas");
      return { handled: true, responses, stillWaiting: true };

    } catch (error: any) {
      console.error("❌ Erro no Assistente IA:", error.message);
      errorCount++;

      // If max errors reached, transfer to fallback
      if (errorCount >= maxErrors && fallbackDepartmentId) {
        console.log("🔄 Máximo de erros atingido - transferindo para fallback");
        await transferToFallback(conversationId, fallbackDepartmentId, supabase, connection, phone, responses, BASE_URL);
        return { handled: true, responses };
      }

      // Update error count and continue waiting
      await supabase
        .from("conversations")
        .update({ 
          flow_state: { ...flowState, ai_error_count: errorCount } 
        })
        .eq("id", conversationId);

      // Send error message to user
      const errorMsg = "Desculpe, estou enfrentando dificuldades. Pode tentar novamente?";
      await fetch(`${BASE_URL}/send/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "token": connection.token },
        body: JSON.stringify({ number: phone, text: errorMsg })
      });
      responses.push(errorMsg);

      return { handled: true, responses, stillWaiting: true };
    }
  }

  // Handle MENU node response (buttons/list)
  if (flowState.waiting_for === "menu") {
    const menuOptions = flowState.menu_options || [];
    const errorMessage = flowState.error_message || "Não entendi sua resposta. Por favor, digite apenas o número da opção desejada.";
    const maxErrors = flowState.menu_max_errors || 3;
    let errorCount = flowState.menu_error_count || 0;

    console.log("=".repeat(60));
    console.log(`📋 PROCESSANDO RESPOSTA DE MENU`);
    console.log(`   Opções disponíveis: ${menuOptions.length}`);
    console.log(`   Opções: ${JSON.stringify(menuOptions.map((o: any) => ({ text: o.text, keywords: o.keywords })))}`);
    console.log(`   Resposta do usuário: "${userResponse}"`);
    console.log(`   Erros atuais: ${errorCount}/${maxErrors}`);
    console.log(`   Flow ID: ${flowState.flow_id}`);
    console.log(`   Nó atual: ${flowState.current_node_id}`);
    console.log("=".repeat(60));

    // Try to match user response to an option
    const normalizedResponse = userResponse.trim().toLowerCase();
    let matchedOptionIndex = -1;

    // Try to match by number first
    const numberMatch = normalizedResponse.match(/^(\d+)$/);
    if (numberMatch) {
      const num = parseInt(numberMatch[1]);
      if (num >= 1 && num <= menuOptions.length) {
        matchedOptionIndex = num - 1;
        console.log(`✅ Correspondência por número: opção ${num}`);
      }
    }

    // If no number match, try keywords/variations
    if (matchedOptionIndex === -1) {
      for (let i = 0; i < menuOptions.length; i++) {
        const option = menuOptions[i];
        const optionText = (option.text || option.title || "").toLowerCase();
        const keywords = (option.keywords || "").toLowerCase().split(",").map((k: string) => k.trim()).filter(Boolean);
        
        // Check if response matches option text or any keyword
        if (normalizedResponse === optionText || 
            optionText.includes(normalizedResponse) ||
            keywords.some((kw: string) => kw === normalizedResponse || normalizedResponse.includes(kw))) {
          matchedOptionIndex = i;
          console.log(`✅ Correspondência por palavra-chave: opção ${i + 1} (${keywords.join(", ")})`);
          break;
        }
      }
    }

    // If no match found, handle error
    if (matchedOptionIndex === -1) {
      errorCount++;
      console.log(`❌ Nenhuma correspondência encontrada. Erro ${errorCount}/${maxErrors}`);

      // Check if we've reached max errors
      if (errorMessage && errorCount >= maxErrors) {
        console.log(`⚠️ Máximo de erros atingido - usando saída de erro`);
        
        // Clear flow state
        await supabase
          .from("conversations")
          .update({ flow_state: null })
          .eq("id", conversationId);

        // Get flow to find error path
        const { data: flow } = await supabase
          .from("flows")
          .select("flow_json")
          .eq("id", flowState.flow_id)
          .single();

        if (flow?.flow_json) {
          const flowJson = flow.flow_json as any;
          const nodes = flowJson.nodes || [];
          const edges = flowJson.edges || [];

          // Find error edge from current node
          const errorEdge = edges.find((e: FlowEdge) => 
            e.source === flowState.current_node_id && e.sourceHandle === "error"
          );

          if (errorEdge) {
            console.log(`▶️ Seguindo caminho de erro para: ${errorEdge.target}`);
            
            const flowContext: FlowContext = {
              message: userResponse,
              contact: { phone, name: contactName },
              vars: { ...flowState.vars, menuError: true, menuErrorCount: errorCount, _flowId: flowState.flow_id },
              conversationId,
              connectionId: connection.id
            };

            const result = await executeFlow(nodes, edges, flowContext, supabase, connection, errorEdge.target);
            return { handled: true, responses: result.responses, stillWaiting: result.paused };
          }
        }

        return { handled: true, responses };
      }

      // Send error message and keep waiting
      if (errorMessage) {
        await fetch(`${BASE_URL}/send/text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'token': connection.token },
          body: JSON.stringify({ number: phone, text: errorMessage })
        });
        responses.push(errorMessage);
      }

      // Update error count in flow state
      const updatedState: FlowState = {
        ...flowState,
        menu_error_count: errorCount
      };

      await supabase
        .from("conversations")
        .update({ flow_state: updatedState })
        .eq("id", conversationId);

      return { handled: true, responses, stillWaiting: true };
    }

    // Match found - save selected option and continue flow
    const selectedOption = menuOptions[matchedOptionIndex];
    console.log(`✅ Opção selecionada: ${matchedOptionIndex + 1} - ${selectedOption.text || selectedOption.title}`);

    // Clear flow state
    await supabase
      .from("conversations")
      .update({ flow_state: null })
      .eq("id", conversationId);

    // Get flow to continue
    const { data: flow } = await supabase
      .from("flows")
      .select("flow_json")
      .eq("id", flowState.flow_id)
      .single();

    if (flow?.flow_json) {
      const flowJson = flow.flow_json as any;
      const nodes = flowJson.nodes || [];
      const edges = flowJson.edges || [];

      // Find edge for selected option
      const optionEdge = edges.find((e: FlowEdge) => 
        e.source === flowState.current_node_id && e.sourceHandle === `option-${matchedOptionIndex}`
      );

      if (optionEdge) {
        console.log(`▶️ Seguindo caminho da opção ${matchedOptionIndex + 1} para: ${optionEdge.target}`);
        
        const flowContext: FlowContext = {
          message: userResponse,
          contact: { phone, name: contactName },
          vars: { 
            ...flowState.vars, 
            menuSelection: matchedOptionIndex + 1,
            menuSelectedText: selectedOption.text || selectedOption.title,
            _flowId: flowState.flow_id 
          },
          conversationId,
          connectionId: connection.id
        };

        const result = await executeFlow(nodes, edges, flowContext, supabase, connection, optionEdge.target);
        return { handled: true, responses: result.responses, stillWaiting: result.paused };
      } else {
        console.log(`⚠️ Nenhuma conexão encontrada para opção ${matchedOptionIndex + 1}`);
      }
    }

    return { handled: true, responses };
  }

  // Handle FORM node response
  if (flowState.waiting_for === "form") {
    const fields = flowState.form_fields || [];
    const currentIndex = flowState.form_current_index || 0;
    const collected = flowState.form_collected || {};
    const currentField = fields[currentIndex];

    if (!currentField) {
      console.log("❌ Campo atual não encontrado");
      await supabase.from("conversations").update({ flow_state: null }).eq("id", conversationId);
      return { handled: true, responses };
    }

    console.log(`📝 Processando resposta do formulário: campo ${currentIndex + 1}/${fields.length}`);
    console.log(`   Campo: ${currentField.name}`);
    console.log(`   Tipo: ${currentField.type}`);

    // Validate field
    const fieldType = currentField.type || "any";
    const validator = validators[fieldType as keyof typeof validators] || validators.any;
    const validation = validator(userResponse);

    if (!validation.valid) {
      console.log(`❌ Validação falhou: ${validation.message}`);
      
      await fetch(`${BASE_URL}/send/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'token': connection.token },
        body: JSON.stringify({ number: phone, text: validation.message })
      });
      
      responses.push(validation.message);
      return { handled: true, responses, stillWaiting: true };
    }

    // Save this field's response
    collected[currentField.name] = userResponse;
    const nextIndex = currentIndex + 1;

    // Check if more fields to collect
    if (nextIndex < fields.length) {
      const nextField = fields[nextIndex];
      let questionMessage = nextField.label || nextField.name || `Campo ${nextIndex + 1}`;
      if (nextField.type === 'email') questionMessage += ' _(email)_';
      if (nextField.type === 'phone') questionMessage += ' _(telefone)_';
      if (nextField.type === 'number') questionMessage += ' _(número)_';
      if (nextField.type === 'cpf') questionMessage += ' _(CPF)_';

      // Send next question
      await fetch(`${BASE_URL}/send/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'token': connection.token },
        body: JSON.stringify({ number: phone, text: questionMessage })
      });
      
      responses.push(questionMessage);

      // Update flow state with next field
      const updatedState: FlowState = {
        ...flowState,
        form_current_index: nextIndex,
        form_collected: collected
      };

      await supabase
        .from("conversations")
        .update({ flow_state: updatedState })
        .eq("id", conversationId);

      console.log(`📋 Aguardando campo ${nextIndex + 1}/${fields.length}`);
      return { handled: true, responses, stillWaiting: true };
    }

    // All fields collected - continue flow
    console.log(`✅ Formulário completo! ${Object.keys(collected).length} campos coletados`);
    
    // Save form response to form_responses table
    try {
      const { data: conversation } = await supabase
        .from("conversations")
        .select("user_id")
        .eq("id", conversationId)
        .single();

      if (conversation?.user_id) {
        // Extract name from collected data (common field names)
        const leadName = collected.nome || collected.name || collected.Nome || collected.Name || contactName || null;
        
        await supabase
          .from("form_responses")
          .insert({
            user_id: conversation.user_id,
            conversation_id: conversationId,
            flow_id: flowState.flow_id,
            phone: phone,
            name: leadName,
            collected_data: collected,
            status: 'novo'
          });
        
        console.log(`💾 Formulário salvo na tabela form_responses`);
      }
    } catch (saveError: any) {
      console.error(`⚠️ Erro ao salvar formulário: ${saveError.message}`);
      // Continue flow even if save fails
    }
    
    // Clear flow state
    await supabase
      .from("conversations")
      .update({ flow_state: null })
      .eq("id", conversationId);

    // Get the flow to continue
    const { data: flow } = await supabase
      .from("flows")
      .select("flow_json")
      .eq("id", flowState.flow_id)
      .single();

    if (flow?.flow_json) {
      const flowJson = flow.flow_json as any;
      const nodes = flowJson.nodes || [];
      const edges = flowJson.edges || [];

      // Find next node after form
      const currentNode = nodes.find((n: any) => n.id === flowState.current_node_id);
      if (currentNode) {
        const nextNodeId = findNextNode(currentNode, edges);
        
        if (nextNodeId) {
          console.log(`▶️ Continuando fluxo após formulário: ${nextNodeId}`);
          
          const flowContext: FlowContext = {
            message: userResponse,
            contact: { phone, name: contactName },
            vars: { ...flowState.vars, ...collected, formData: collected, _flowId: flowState.flow_id },
            conversationId,
            connectionId: connection.id
          };

          const result = await executeFlow(nodes, edges, flowContext, supabase, connection, nextNodeId);
          return { handled: true, responses: result.responses, stillWaiting: result.paused };
        }
      }
    }

    return { handled: true, responses };
  }

  return { handled: false };
}

// ========================================
// TRANSFER TO FALLBACK - Transferir para departamento humano
// ========================================
async function transferToFallback(
  conversationId: string,
  departmentId: string,
  supabase: any,
  connection: any,
  phone: string,
  responses: string[],
  BASE_URL: string
): Promise<void> {
  console.log(`🔄 Transferindo conversa para departamento: ${departmentId}`);

  // Clear flow state and update department
  await supabase
    .from("conversations")
    .update({
      department_id: departmentId,
      assigned_to: null,
      status: "waiting",
      attendance_type: "agent",
      updated_at: new Date().toISOString()
    })
    .eq("id", conversationId);

  // Get department name for logging
  const { data: dept } = await supabase
    .from("departments")
    .select("name")
    .eq("id", departmentId)
    .single();

  console.log(`✅ Conversa transferida para: ${dept?.name || departmentId}`);
}

// ========================================
// CODE NODE - Execução de JavaScript customizado
// ========================================
async function executeCodeNode(
  data: any,
  context: FlowContext
): Promise<{ vars: Record<string, any>; nextNodeId?: string }> {
  const code = data.code || 'return { vars: {}, next: null };';
  
  console.log("🔧 Executando bloco de código JavaScript");
  console.log(`📝 Código: ${code.substring(0, 100)}...`);

  try {
    // Create a safe execution context with available variables
    const { vars, message, contact } = context;
    
    // Build a function that returns the result
    const asyncFunction = new Function(
      'vars', 'message', 'contact', 'console',
      `return (async () => {
        try {
          ${code}
        } catch (e) {
          console.log('Erro no código:', e.message);
          return { vars: {}, next: null };
        }
      })();`
    );
    
    const result = await asyncFunction(vars, message, contact, console);
    
    console.log("✅ Código executado com sucesso");
    console.log(`📊 Resultado vars:`, JSON.stringify(result?.vars || {}));
    
    return { 
      vars: result?.vars || {},
      nextNodeId: result?.next || undefined
    };
  } catch (e: any) {
    console.error(`❌ Erro ao executar código: ${e.message}`);
    return { vars: { codeError: e.message } };
  }
}

// ========================================
// HTTP NODE - Requisições HTTP externas
// ========================================
async function executeHttpNode(
  data: any,
  context: FlowContext
): Promise<{ vars: Record<string, any> }> {
  const method = data.method || 'GET';
  let url = data.url || '';
  const headers = data.headers || {};
  let body = data.body || '';
  const responseVar = data.responseVariable || 'httpResponse';
  const jsonPath = data.jsonPath || '';
  const timeout = (data.timeout || 30) * 1000;
  const continueOnError = data.continueOnError || false;

  console.log(`🌐 Executando HTTP Request: ${method} ${url}`);

  // Replace variables in URL
  url = url.replace(/\{\{(\w+)\}\}/g, (_match: string, varName: string) => {
    if (varName === "nome" || varName === "name") return context.contact.name;
    if (varName === "telefone" || varName === "phone") return context.contact.phone;
    if (varName === "mensagem" || varName === "message") return context.message;
    return context.vars[varName] ?? `{{${varName}}}`;
  });

  // Replace variables in body
  if (body && typeof body === 'string') {
    body = body.replace(/\{\{(\w+)\}\}/g, (_match: string, varName: string) => {
      if (varName === "nome" || varName === "name") return context.contact.name;
      if (varName === "telefone" || varName === "phone") return context.contact.phone;
      if (varName === "mensagem" || varName === "message") return context.message;
      return context.vars[varName] ?? `{{${varName}}}`;
    });
  }

  // Replace variables in headers
  const processedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      processedHeaders[key] = value.replace(/\{\{(\w+)\}\}/g, (_match: string, varName: string) => {
        if (varName === "nome" || varName === "name") return context.contact.name;
        if (varName === "telefone" || varName === "phone") return context.contact.phone;
        if (varName === "mensagem" || varName === "message") return context.message;
        return context.vars[varName] ?? `{{${varName}}}`;
      });
    } else {
      processedHeaders[key] = String(value);
    }
  }

  console.log(`📤 URL: ${url}`);
  console.log(`📤 Headers: ${JSON.stringify(processedHeaders)}`);
  if (body) console.log(`📤 Body: ${body.substring(0, 200)}...`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const fetchOptions: RequestInit = {
      method,
      headers: processedHeaders,
      signal: controller.signal
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      fetchOptions.body = body;
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    const responseText = await response.text();
    console.log(`📥 Status: ${response.status}`);
    console.log(`📥 Response: ${responseText.substring(0, 500)}...`);

    let responseData: any = responseText;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      // Keep as text if not JSON
    }

    // Extract value using jsonPath if provided
    let extractedValue = responseData;
    if (jsonPath && typeof responseData === 'object') {
      const pathParts = jsonPath.split('.');
      for (const part of pathParts) {
        if (extractedValue && typeof extractedValue === 'object') {
          extractedValue = extractedValue[part];
        }
      }
      console.log(`📊 JSONPath "${jsonPath}" extraiu:`, extractedValue);
    }

    const resultVars: Record<string, any> = {
      [responseVar]: extractedValue,
      [`${responseVar}_status`]: response.status,
      [`${responseVar}_ok`]: response.ok
    };

    console.log("✅ HTTP Request executado com sucesso");
    return { vars: resultVars };

  } catch (e: any) {
    console.error(`❌ Erro HTTP: ${e.message}`);
    
    if (!continueOnError) {
      throw new Error(`HTTP Request falhou: ${e.message}`);
    }
    
    return { 
      vars: { 
        [responseVar]: null,
        [`${responseVar}_error`]: e.message,
        [`${responseVar}_ok`]: false
      } 
    };
  }
}

async function executeMessageNode(
  node: FlowNode,
  data: any,
  context: FlowContext,
  supabase: any,
  connection: any,
  responses: string[],
  edges: FlowEdge[]
): Promise<{ vars: Record<string, any>; pauseFlow?: boolean; pauseState?: any }> {
  const messageType = data.messageType || "text";
  let content = data.content || data.label || "";

  // Replace variables in content
  const replaceVars = (text: string) => {
    return text.replace(/\{\{(\w+)\}\}/g, (_match: string, varName: string) => {
      if (varName === "nome" || varName === "name") return context.contact.name;
      if (varName === "telefone" || varName === "phone") return context.contact.phone;
      if (varName === "mensagem" || varName === "message") return context.message;
      return context.vars[varName] ?? `{{${varName}}}`;
    });
  };

  content = replaceVars(content);

  // Use connection's base_url or fallback to environment-based URL
  let BASE_URL = connection.base_url;
  if (!BASE_URL) {
    const environment = connection.environment || "TESTE";
    BASE_URL = environment === "PROD" 
      ? "https://app.uazapi.com" 
      : "https://free.uazapi.com";
  }
  
  console.log(`🌐 BASE_URL: ${BASE_URL}`);
  console.log(`📝 Tipo de mensagem: ${messageType}`);

  // Check if this is a menu type that needs to wait for user response
  const isMenuType = messageType === "buttons" || messageType === "list";
  // Get options and include keywords if available
  const rawMenuOptions = messageType === "buttons" ? (data.buttons || []) : (data.listItems || []);
  const menuOptions = rawMenuOptions.map((opt: any, idx: number) => ({
    ...opt,
    text: opt.text || opt.title || `Opção ${idx + 1}`,
    keywords: opt.keywords || ""
  }));
  const hasMenuOptions = isMenuType && menuOptions.length > 0;
  
  console.log(`🔍 Is menu type: ${isMenuType}, Has options: ${hasMenuOptions}, Options count: ${menuOptions.length}`);

  try {
    let endpoint = "";
    let body: any = {};

    switch (messageType) {
      case "text":
        if (!content) {
          console.log("⚠️ Mensagem vazia, pulando");
          return { vars: {} };
        }
        endpoint = "/send/text";
        body = {
          number: context.contact.phone,
          text: content
        };
        console.log(`📤 Enviando texto: ${content.substring(0, 50)}...`);
        break;

      case "buttons":
        // UAZAPI não suporta botões interativos - enviar como texto formatado com opções
        const buttonOptions = (data.buttons || []).slice(0, 10);
        if (buttonOptions.length === 0) {
          console.log("⚠️ Nenhum botão configurado, enviando como texto simples");
          endpoint = "/send/text";
          body = { number: context.contact.phone, text: content };
        } else {
          // Formatar botões como lista numerada com emojis
          const buttonEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
          const formattedButtons = buttonOptions.map((btn: any, idx: number) => {
            const emoji = buttonEmojis[idx] || `${idx + 1}.`;
            return `${emoji} ${replaceVars(btn.text || `Opção ${idx + 1}`)}`;
          }).join("\n");
          
          const buttonText = content 
            ? `${content}\n\n${formattedButtons}\n\n_Responda com o número da opção desejada._`
            : `${formattedButtons}\n\n_Responda com o número da opção desejada._`;
          
          endpoint = "/send/text";
          body = { number: context.contact.phone, text: buttonText };
        }
        console.log(`📤 Enviando opções como texto formatado (${buttonOptions.length} opções)`);
        break;

      case "list":
        // UAZAPI /send/menu com type="list"
        const listOptions = (data.listItems || []).slice(0, 10);
        if (listOptions.length === 0) {
          console.log("⚠️ Nenhum item na lista, enviando como texto simples");
          endpoint = "/send/text";
          body = { number: context.contact.phone, text: content };
        } else {
          // Formato choices para lista: "[Seção]" para headers, "Título|id|Descrição" para itens
          const choices = listOptions.map((item: any, idx: number) => {
            const title = replaceVars(item.title || `Item ${idx + 1}`);
            const itemId = item.id || `item_${idx}`;
            const desc = item.description ? replaceVars(item.description) : "";
            return `${title}|${itemId}|${desc}`;
          });
          
          endpoint = "/send/menu";
          body = {
            number: context.contact.phone,
            type: "list",
            text: content || "Escolha uma opção:",
            footerText: "",
            listButton: replaceVars(data.listButtonText || "Ver opções"),
            selectableCount: 1,
            choices: choices
          };
        }
        console.log(`📤 Enviando lista com ${listOptions.length} itens`);
        break;

      case "image":
        const imageUrl = data.mediaUrl;
        const caption = replaceVars(data.caption || content || "");
        
        if (!imageUrl) {
          console.log("⚠️ URL da imagem não configurada");
          if (caption) {
            endpoint = "/send/text";
            body = { number: context.contact.phone, text: caption };
          } else {
            return { vars: {} };
          }
        } else {
          endpoint = "/send/image";
          body = {
            number: context.contact.phone,
            image: imageUrl,
            caption: caption
          };
        }
        console.log(`📤 Enviando imagem: ${imageUrl?.substring(0, 50)}...`);
        break;

      case "audio":
        const audioUrl = data.mediaUrl;
        if (!audioUrl) {
          console.log("⚠️ URL do áudio não configurada");
          return { vars: {} };
        }
        endpoint = "/send/audio";
        body = {
          number: context.contact.phone,
          audio: audioUrl
        };
        console.log(`📤 Enviando áudio: ${audioUrl.substring(0, 50)}...`);
        break;

      case "document":
        const docUrl = data.mediaUrl;
        if (!docUrl) {
          console.log("⚠️ URL do documento não configurada");
          return { vars: {} };
        }
        endpoint = "/send/document";
        body = {
          number: context.contact.phone,
          document: docUrl,
          fileName: data.fileName || "documento"
        };
        console.log(`📤 Enviando documento: ${docUrl.substring(0, 50)}...`);
        break;

      case "video":
        const videoUrl = data.mediaUrl;
        if (!videoUrl) {
          console.log("⚠️ URL do vídeo não configurada");
          return { vars: {} };
        }
        endpoint = "/send/video";
        body = {
          number: context.contact.phone,
          video: videoUrl,
          caption: replaceVars(data.caption || "")
        };
        console.log(`📤 Enviando vídeo: ${videoUrl.substring(0, 50)}...`);
        break;

      default:
        console.log(`⚠️ Tipo de mensagem desconhecido: ${messageType}, tratando como texto`);
        if (!content) return { vars: {} };
        endpoint = "/send/text";
        body = { number: context.contact.phone, text: content };
    }

    console.log(`🔗 Endpoint: ${endpoint}`);
    console.log(`📦 Body: ${JSON.stringify(body).substring(0, 200)}...`);

    const sendResponse = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": connection.token
      },
      body: JSON.stringify(body)
    });

    // Read the response as text first, then try to parse as JSON
    const responseText = await sendResponse.text();
    console.log("📨 Resposta UAZAPI (raw):", responseText.substring(0, 200));

    let sendResult: any = {};
    try {
      sendResult = JSON.parse(responseText);
    } catch {
      console.log("⚠️ Resposta UAZAPI não é JSON válido");
      sendResult = { raw: responseText };
    }

    if (sendResponse.ok || sendResult?.status === "success" || sendResult?.id || sendResult?.key) {
      responses.push(content || `[${messageType}]`);
      console.log("✅ Mensagem enviada com sucesso!");

      // Save sent message to database
      await supabase
        .from("messages")
        .insert({
          id_da_conversa: context.conversationId,
          remetente: "sistema",
          conteudo: content || `[${messageType}]`,
          tipo: messageType,
          recebido: false
        });

      // Update conversation last message
      await supabase
        .from("conversations")
        .update({
          last_message: content || `[${messageType}]`,
          updated_at: new Date().toISOString()
        })
        .eq("id", context.conversationId);

      // If this is a menu, pause the flow and wait for user response
      if (hasMenuOptions) {
        console.log("📋 Menu enviado - pausando fluxo para aguardar resposta");
        console.log(`   - Opções do menu: ${JSON.stringify(menuOptions.map((o: any) => ({ text: o.text, keywords: o.keywords })))}`);
        console.log(`   - Flow ID: ${context.vars._flowId || "(detectando...)"}`);
        
        // Get flow ID from context or find it
        let flowId = context.vars._flowId;
        if (!flowId && context.connectionId) {
          // Try to get the active flow from the database
          const { data: activeFlow } = await supabase
            .from("flows")
            .select("id")
            .eq("status", "active")
            .or(`connection_id.eq.${context.connectionId},connection_id.is.null`)
            .limit(1)
            .single();
          
          if (activeFlow) {
            flowId = activeFlow.id;
            console.log(`   - Flow ID detectado: ${flowId}`);
          }
        }
        
        const flowState: FlowState = {
          flow_id: flowId || "",
          current_node_id: node.id,
          waiting_for: "menu",
          error_message: data.errorMessage || "Não entendi sua resposta. Por favor, digite apenas o número da opção desejada.",
          vars: { ...context.vars, _flowId: flowId },
          started_at: new Date().toISOString(),
          menu_options: menuOptions,
          menu_error_count: 0,
          menu_max_errors: data.maxErrors || 3
        };

        console.log(`💾 Salvando flow_state com ${menuOptions.length} opções`);
        
        const { error: updateError } = await supabase
          .from("conversations")
          .update({ flow_state: flowState })
          .eq("id", context.conversationId);
        
        if (updateError) {
          console.error("❌ Erro ao salvar flow_state:", updateError);
        } else {
          console.log("✅ Estado do menu salvo - aguardando seleção do usuário");
        }

        return { 
          vars: { lastMessage: content }, 
          pauseFlow: true,
          pauseState: flowState
        };
      }
    } else {
      console.error("❌ UZAPI retornou erro:", JSON.stringify(sendResult));
    }
  } catch (error: any) {
    console.error("❌ Erro ao enviar mensagem:", error.message);
  }

  return { vars: { lastMessage: content } };
}

// ========================================
// AI AGENT NODE - Assistente IA no fluxo
// ========================================
async function executeAiAgentNode(
  node: FlowNode,
  data: any,
  context: FlowContext,
  supabase: any,
  connection: any,
  edges: FlowEdge[]
): Promise<{ vars: Record<string, any>; nextNodeId?: string; pauseFlow?: boolean; pauseState?: any }> {
  const agentId = data.agentId;
  const fallbackDepartmentId = data.fallbackDepartmentId;
  const maxErrors = data.maxErrors || 3;

  console.log("🤖 Executando bloco Assistente IA");
  console.log(`   - Agent ID: ${agentId}`);
  console.log(`   - Fallback Dept: ${fallbackDepartmentId}`);

  if (!agentId) {
    console.log("⚠️ Nenhum assistente configurado");
    // Find success path
    const successEdge = edges.find(e => e.source === node.id && e.sourceHandle === "success");
    return { vars: {}, nextNodeId: successEdge?.target };
  }

  // Verificar se o agente está ativo
  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .eq("status", "active")
    .single();

  if (!agent) {
    console.log("⚠️ Assistente IA não encontrado ou inativo");
    const successEdge = edges.find(e => e.source === node.id && e.sourceHandle === "success");
    return { vars: { aiAgentError: "Agent not found" }, nextNodeId: successEdge?.target };
  }

  console.log("✅ Assistente IA ativo:", agent.name);

  // Atribuir o assistente IA à conversa com estado correto
  const flowState: FlowState = {
    flow_id: context.vars._flowId || "",
    current_node_id: node.id,
    waiting_for: "aiAgent",
    vars: context.vars,
    started_at: new Date().toISOString(),
    ai_agent_id: agentId,
    ai_fallback_department_id: fallbackDepartmentId,
    ai_max_errors: maxErrors,
    ai_error_count: 0
  };

  const { error: assignAiError } = await supabase
    .from("conversations")
    .update({
      assigned_to: agentId,
      attendance_type: "ai",
      status: "open",
      updated_at: new Date().toISOString()
    })
    .eq("id", context.conversationId);

  if (assignAiError) {
    console.error("❌ Falha ao atualizar conversa para IA:", assignAiError.message);
  } else {
    console.log("✅ Assistente IA atribuído à conversa (attendance_type → ai)");
  }

  // ========================================
  // CHAMAR AI-ASSISTANT-CHAT EDGE FUNCTION
  // ========================================
  console.log("🤖 Chamando ai-assistant-chat para responder à primeira mensagem...");
  
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Determinar BASE_URL
    let BASE_URL = connection.base_url;
    if (!BASE_URL) {
      BASE_URL = connection.environment === "PROD" 
        ? "https://app.uazapi.com" 
        : "https://free.uazapi.com";
    }

    // Chamar a edge function ai-assistant-chat que tem integração com Asaas
    const aiChatResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-assistant-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        message: context.message,
        agentId: agentId,
        conversationId: context.conversationId,
        contactName: context.contact.name,
        contactPhone: context.contact.phone,
        connectionId: connection.id,
        connectionToken: connection.token,
        connectionBaseUrl: BASE_URL,
        connectionEnvironment: connection.environment,
        connectionInstanceName: (connection as any).instance_name,

        // Suporte a mídia
        mediaUrl: context.media?.url,
        mediaType: context.media?.type,
        mediaCaption: context.media?.caption
      })
    });

    if (!aiChatResponse.ok) {
      const errorText = await aiChatResponse.text();
      console.error("❌ Erro ai-assistant-chat:", aiChatResponse.status, errorText);
      throw new Error(`AI Assistant error: ${aiChatResponse.status}`);
    }

    const aiData = await aiChatResponse.json();
    console.log("✅ Resposta ai-assistant-chat recebida");
    
    // Check for escalation/transfer
    if (aiData.escalated && fallbackDepartmentId) {
      console.log("🔄 IA escalou - transferindo para departamento");
      
      await supabase
        .from("conversations")
        .update({
          department_id: fallbackDepartmentId,
          status: "waiting",
          assigned_to: null,
          attendance_type: "agent",
          updated_at: new Date().toISOString()
        })
        .eq("id", context.conversationId);

      console.log("✅ Conversa transferida para departamento de fallback");
      
      return { 
        vars: { aiAgentAssigned: false, transferred: true },
        pauseFlow: true,
        pauseState: { transferred: true }
      };
    }

    // Update agent stats
    await supabase
      .from("agents")
      .update({ 
        conversations_today: (agent.conversations_today || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq("id", agentId);

  } catch (error: any) {
    console.error("❌ Erro ao chamar ai-assistant-chat:", error.message);
    // Continue anyway - the flow is paused and next messages will retry
  }

  // O fluxo pausa aqui - a IA vai responder automaticamente via webhook
  return { 
    vars: { aiAgentAssigned: true, aiAgentId: agentId },
    pauseFlow: true,
    pauseState: {
      aiAgent: true,
      agentId,
      fallbackDepartmentId,
      maxErrors
    }
  };
}

function executeConditionNode(
  data: any,
  context: FlowContext
): { vars: Record<string, any>; branch: string } {
  const condition = data.condition || "false";
  const { vars, message, contact } = context;

  let result = false;
  try {
    // Simple condition evaluation
    if (condition.includes("==")) {
      const [left, right] = condition.split("==").map((s: string) => s.trim());
      const leftVal = left === "message" ? message : (vars[left] ?? left);
      const rightVal = right.replace(/['"]/g, "");
      result = leftVal.toLowerCase().includes(rightVal.toLowerCase());
    } else if (condition.includes("contains")) {
      const match = condition.match(/(\w+)\s*contains\s*['"](.+)['"]/i);
      if (match) {
        const varName = match[1];
        const searchVal = match[2];
        const varVal = varName === "message" ? message : (vars[varName] ?? "");
        result = varVal.toLowerCase().includes(searchVal.toLowerCase());
      }
    } else if (condition === "true") {
      result = true;
    }
  } catch (e) {
    console.error("Erro ao avaliar condição:", e);
  }

  console.log(`🔀 Condição "${condition}" = ${result}`);
  return {
    vars: { conditionResult: result },
    branch: result ? "yes" : "no"
  };
}

async function executeDelayNode(data: any): Promise<{ vars: Record<string, any> }> {
  const seconds = data.seconds || data.delay || 1;
  console.log(`⏳ Aguardando ${seconds} segundo(s)...`);
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  return { vars: {} };
}

async function executeForwardNode(
  data: any,
  context: FlowContext,
  supabase: any
): Promise<{ vars: Record<string, any> }> {
  const departmentId = data.departmentId;
  const specificAgentId = data.specificAgentId;
  const transferType = data.transferType || 'queue';
  const transferMessage = data.transferMessage || data.message || '';
  
  console.log("=".repeat(60));
  console.log("🔄 EXECUTANDO BLOCO ENCAMINHAR (FORWARD)");
  console.log(`   Tipo de Transferência: ${transferType}`);
  console.log(`   Departamento ID: ${departmentId}`);
  console.log(`   Atendente ID: ${specificAgentId}`);
  console.log(`   Conversation ID: ${context.conversationId}`);
  console.log(`   Mensagem: ${transferMessage.substring(0, 50)}`);
  console.log("=".repeat(60));
  
  // Transferência direta para ATENDENTE ESPECÍFICO (Usuário)
  if (transferType === 'agent' && specificAgentId) {
    console.log("👤 Transferindo diretamente para atendente específico...");
    
    // Get agent name for logging
    const { data: agentProfile } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", specificAgentId)
      .single();
    
    const agentName = agentProfile?.full_name || agentProfile?.username || 'Atendente';
    
    const updateData: any = {
      assigned_to: specificAgentId,
      status: "in_attendance",
      department_id: null,
      attendance_type: "agent",
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from("conversations")
      .update(updateData)
      .eq("id", context.conversationId);
    
    if (error) {
      console.error("❌ Erro ao transferir para atendente:", error);
    } else {
      console.log(`✅ Conversa transferida para atendente: ${agentName}!`);
      console.log(`   Status: in_attendance`);
      console.log(`   Atendente: ${specificAgentId}`);
    }
    
    return { vars: { forwarded: true, specificAgentId, agentName, transferType: 'agent' } };
  }
  
  // Transferência para FILA do DEPARTAMENTO
  if (departmentId) {
    console.log("📋 Transferindo para fila do departamento...");
    
    const updateData: any = {
      department_id: departmentId,
      status: "waiting",
      assigned_to: null,
      attendance_type: "agent",
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from("conversations")
      .update(updateData)
      .eq("id", context.conversationId);
    
    if (error) {
      console.error("❌ Erro ao encaminhar para fila:", error);
    } else {
      console.log("✅ Conversa movida para fila do departamento!");
      console.log(`   Status: waiting`);
      console.log(`   Departamento: ${departmentId}`);
    }
    
    // Get department name for logging
    const { data: dept } = await supabase
      .from("departments")
      .select("name")
      .eq("id", departmentId)
      .single();
    
    const deptName = dept?.name || 'Departamento';
    console.log(`📋 Departamento: ${deptName}`);
    
    return { vars: { forwarded: true, departmentId, departmentName: deptName, transferType: 'queue' } };
  }
  
  // Fallback: nenhuma configuração válida
  console.log("⚠️ Nenhum departamento ou atendente especificado - mantendo na fila geral");
  
  await supabase
    .from("conversations")
    .update({
      status: "waiting",
      attendance_type: "agent",
      assigned_to: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", context.conversationId);

  return { vars: { forwarded: true, transferType: 'fallback' } };
}

async function executeTagNode(
  data: any,
  context: FlowContext,
  supabase: any
): Promise<{ vars: Record<string, any> }> {
  const tagName = data.tagName || data.tag;
  
  if (tagName) {
    console.log(`🏷️ Aplicando tag: ${tagName}`);
    // Get lead from conversation
    const { data: conv } = await supabase
      .from("conversations")
      .select("lead_id")
      .eq("id", context.conversationId)
      .single();

    if (conv?.lead_id) {
      // Get current tags
      const { data: lead } = await supabase
        .from("leads")
        .select("tags")
        .eq("id", conv.lead_id)
        .single();

      const currentTags = lead?.tags || [];
      if (!currentTags.includes(tagName)) {
        await supabase
          .from("leads")
          .update({ tags: [...currentTags, tagName] })
          .eq("id", conv.lead_id);
      }
    }
  }

  return { vars: { tagApplied: tagName } };
}

function findNextNode(
  currentNode: FlowNode,
  edges: FlowEdge[],
  branch?: string
): string | undefined {
  const outgoingEdges = edges.filter((e) => e.source === currentNode.id);

  if (branch && outgoingEdges.length > 0) {
    const branchEdge = outgoingEdges.find((e) => e.sourceHandle === branch);
    if (branchEdge) return branchEdge.target;
  }

  if (outgoingEdges.length > 0) {
    return outgoingEdges[0].target;
  }

  return undefined;
}

// ========================================
// WEBHOOK HANDLER
// ========================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("=".repeat(80));
    console.log("📩 WEBHOOK UZAPI → MARKETFLOW");
    console.log("⏰ Timestamp:", new Date().toISOString());
    console.log("=".repeat(80));
    console.log("📦 Payload:", JSON.stringify(payload, null, 2));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ========================================
    // NORMALIZAÇÃO - FORMATO UZAPI
    // ========================================
    let telefone = "";
    let mensagem = "";
    let tipo = "text";
    let timestamp = Date.now();
    let messageId = null;
    let contactName = "";
    let isFromMe = false;
    let instanceToken = "";

    // Helper to extract text from content (can be string or object)
    const extractText = (content: any): string => {
      if (!content) return "";
      if (typeof content === "string") return content;
      if (typeof content === "object") {
        // Try to extract meaningful text fields first
        const textValue = content.text || content.body || content.caption || content.message || "";
        if (textValue && typeof textValue === "string") return textValue;
        // For media messages (image, document, etc), return caption or empty - NEVER JSON.stringify
        if (content.URL || content.url || content.mediaKey || content.fileSHA256 || 
            content.mimetype || content.directPath || content.fileLength ||
            content.mediaUrl || content.imageURL || content.documentUrl) {
          return content.caption || content.title || "";
        }
        // Only stringify simple objects without media fields
        const keys = Object.keys(content);
        if (keys.length <= 3 && !keys.some(k => k.toLowerCase().includes('url') || k.toLowerCase().includes('media') || k.toLowerCase().includes('sha'))) {
          return JSON.stringify(content);
        }
        return "";
      }
      return String(content);
    };

    // FORMATO EVOLUTION API v2: payload.data com key.remoteJid + message.*
    if (payload.data && typeof payload.data === "object" && (payload.data.key || payload.data.remoteJid)) {
      const d: any = payload.data;
      const key = d.key || {};
      const jid: string = key.remoteJid || d.remoteJid || d.senderPn || "";
      // Evolution às vezes traz o número real em senderPn (para JIDs @lid)
      telefone = key.senderPn || d.senderPn || jid || "";
      const m = d.message || {};
      const rawMessageType: string = d.messageType || "";
      // Extrai texto conforme o tipo de mensagem Evolution
      mensagem =
        (typeof m.conversation === "string" ? m.conversation : "") ||
        m.extendedTextMessage?.text ||
        m.imageMessage?.caption ||
        m.videoMessage?.caption ||
        m.documentMessage?.caption ||
        m.documentWithCaptionMessage?.message?.documentMessage?.caption ||
        m.buttonsResponseMessage?.selectedDisplayText ||
        m.listResponseMessage?.title ||
        m.templateButtonReplyMessage?.selectedDisplayText ||
        m.reactionMessage?.text ||
        "";

      if (m.imageMessage || rawMessageType === "imageMessage") tipo = "image";
      else if (m.videoMessage || rawMessageType === "videoMessage") tipo = "video";
      else if (m.audioMessage || rawMessageType === "audioMessage") tipo = m.audioMessage?.ptt ? "audio" : "audio";
      else if (m.documentMessage || m.documentWithCaptionMessage || rawMessageType.includes("document")) tipo = "document";
      else if (m.stickerMessage) tipo = "sticker";
      else if (m.locationMessage) tipo = "location";
      else if (m.contactMessage || m.contactsArrayMessage) tipo = "contact";
      else tipo = "text";

      timestamp = (d.messageTimestamp ? Number(d.messageTimestamp) * 1000 : Date.now());
      messageId = key.id || d.messageId || null;
      contactName = d.pushName || d.notifyName || "";
      isFromMe = key.fromMe === true;
      instanceToken = payload.apikey || "";

      console.log("📋 FORMATO: Evolution API v2 (payload.data)");
      console.log(`📱 remoteJid: ${jid}, senderPn: ${key.senderPn || d.senderPn}, messageType: ${rawMessageType} -> tipo: ${tipo}`);
    }
    // FORMATO UZAPI: Dados dentro de payload.message
    else if (payload.message && typeof payload.message === "object") {
      const msg = payload.message;
      // IMPORTANTE: Preferir sender_pn (número real) sobre sender (que pode ser LID do Facebook/Instagram)
      // O sender_pn contém o número de telefone real no formato "555121601725@s.whatsapp.net"
      telefone = msg.sender_pn || msg.chatid || msg.sender || msg.from || "";
      // Handle content that might be an object with { text: "..." }
      mensagem = extractText(msg.content) || extractText(msg.text) || extractText(msg.body) || "";
      
      // IMPORTANTE: UAZAPI envia tipo em vários campos diferentes
      // messageType pode ser: "ImageMessage", "DocumentMessage", "AudioMessage", "VideoMessage"
      // mediaType pode ser: "image", "document", "audio", "video"
      // type pode ser: "text", "image", etc
      const rawMessageType = msg.messageType || "";
      const rawMediaType = msg.mediaType || "";
      const rawType = msg.type || "";
      
      // Normalizar tipo baseado nos campos do UAZAPI
      if (rawMessageType === "ImageMessage" || rawMediaType === "image" || rawType === "image") {
        tipo = "image";
      } else if (rawMessageType === "DocumentMessage" || rawMediaType === "document" || rawType === "document") {
        tipo = "document";
      } else if (rawMessageType === "AudioMessage" || rawMediaType === "audio" || rawMediaType === "ptt" || rawType === "audio" || rawType === "ptt") {
        tipo = "audio";
      } else if (rawMessageType === "VideoMessage" || rawMediaType === "video" || rawType === "video") {
        tipo = "video";
      } else {
        tipo = rawType || "text";
      }
      
      timestamp = msg.messageTimestamp || Date.now();
      messageId = msg.id || msg.messageid || null;
      contactName = msg.senderName || payload.chat?.name || payload.chat?.wa_name || "";
      isFromMe = msg.fromMe === true;
      instanceToken = payload.token || "";
      
      console.log("📋 FORMATO: payload.message (UZAPI padrão)");
      console.log(`📱 sender_pn: ${msg.sender_pn}, sender: ${msg.sender}, chatid: ${msg.chatid}`);
      console.log(`📎 messageType: ${rawMessageType}, mediaType: ${rawMediaType}, type: ${rawType} -> tipo: ${tipo}`);
    }
    // FORMATO ALTERNATIVO: Array de messages
    else if (payload.messages && Array.isArray(payload.messages) && payload.messages.length > 0) {
      const msg = payload.messages[0];
      // Preferir sender_pn sobre sender
      telefone = msg.sender_pn || msg.from || msg.sender || "";
      mensagem = extractText(msg.text) || extractText(msg.content) || extractText(msg.body) || "";
      tipo = msg.type || "text";
      timestamp = msg.timestamp || Date.now();
      messageId = msg.id || null;
      contactName = msg.name || msg.pushName || "";
      isFromMe = msg.fromMe === true;
      
      console.log("📋 FORMATO: payload.messages[] (array)");
    }
    // FORMATO LEGADO: Campos diretos
    else if (payload.sender || payload.phone || payload.from) {
      telefone = payload.sender_pn || payload.sender || payload.phone || payload.from || "";
      mensagem = extractText(payload.content) || extractText(payload.text) || extractText(payload.body) || "";
      tipo = payload.type || "text";
      timestamp = payload.timestamp || Date.now();
      messageId = payload.id || null;
      contactName = payload.name || "";
      isFromMe = payload.fromMe === true;
      
      console.log("📋 FORMATO: campos diretos (legado)");
    }

    // Dados normalizados
    const dadosNormalizados = { telefone, mensagem, tipo, timestamp, contactName, isFromMe };
    console.log("-".repeat(80));
    console.log("📝 DADOS NORMALIZADOS:", JSON.stringify(dadosNormalizados, null, 2));
    console.log("-".repeat(80));

    // Verificar evento
    const eventType = payload.EventType || payload.event || payload.wook || "";
    console.log("🔔 Tipo de evento:", eventType);

    // ========================================
    // HANDLE LABEL EVENTS - Sync labels from WhatsApp to system
    // ========================================
    const labelEventTypes = ["labels", "label", "label.edit", "label.association", "labels.chat", "LABELS_UPDATE", "LABEL_EDIT", "chat_labels"];
    if (eventType && labelEventTypes.some(t => eventType.toLowerCase().includes(t.toLowerCase()))) {
      console.log("🏷️ Evento de LABEL detectado:", eventType);
      console.log("📝 Payload completo:", JSON.stringify(payload, null, 2));
      
      try {
        // Find connection by instance_id first (most reliable), then token
        const payloadToken = payload.token || instanceToken || "";
        const payloadInstanceId = payload.instance_id || payload.instanceId || payload.id || "";
        let connection = null;
        
        // First: try by instance_id (most reliable from UAZAPI)
        if (!connection && payloadInstanceId) {
          console.log("🔍 Buscando conexão pelo instance_id:", payloadInstanceId);
          const { data: connByInstance } = await supabase
            .from("connections")
            .select("*")
            .eq("instance_id", payloadInstanceId)
            .single();
          if (connByInstance) {
            connection = connByInstance;
            console.log("✅ Conexão encontrada pelo instance_id");
          }
        }
        
        // Second: try by token
        if (!connection && payloadToken) {
          console.log("🔍 Buscando conexão pelo token");
          const { data: connData } = await supabase
            .from("connections")
            .select("*")
            .eq("token", payloadToken)
            .single();
          if (connData) {
            connection = connData;
            console.log("✅ Conexão encontrada pelo token");
          }
        }
        
        // Third: try fallback to any active connection
        if (!connection) {
          console.log("🔍 Tentando fallback para conexão ativa...");
          const { data: activeConn } = await supabase
            .from("connections")
            .select("*")
            .eq("status", "connected")
            .limit(1)
            .single();
          if (activeConn) {
            connection = activeConn;
            console.log("✅ Conexão encontrada (fallback ativa)");
          }
        }
        
        if (connection) {
          console.log("🔗 Conexão ID:", connection.id, "User ID:", connection.user_id);
          
          // Extract label info from UAZAPI payload formats
          // UAZAPI sends: { event: "labels", data: { labels: [...], chatId: "..." } }
          // Or: { event: "chat_labels", id: "...", chatId: "...", labels: [...] }
          const labelData = payload.data || payload;
          const labels = labelData.labels || payload.labels || [];
          const chatId = labelData.chatId || payload.chatId || payload.chat?.id || payload.message?.chatid || "";
          const action = labelData.action || payload.action || "add"; // add, remove, edit
          
          console.log("🏷️ Label info:", { chatId, labelsCount: labels.length, action });
          console.log("🏷️ Labels recebidas:", JSON.stringify(labels));
          
          // Extract phone from chatId (format: "5511999999999@s.whatsapp.net" or "5511999999999@c.us")
          const phone = chatId.replace(/@.*$/, "").replace(/\D/g, "");
          
          if (phone && labels.length > 0) {
            console.log(`📱 Syncing ${labels.length} label(s) for phone ${phone}`);
            
            // Find lead by phone
            const { data: leads, error: leadError } = await supabase
              .from("leads")
              .select("id, tags, user_id")
              .or(`phone.eq.${phone},phone.ilike.%${phone}%`)
              .eq("user_id", connection.user_id)
              .limit(1);
            
            if (leadError) {
              console.error("❌ Erro ao buscar lead:", leadError);
            }
            
            if (leads && leads.length > 0) {
              const lead = leads[0];
              console.log("✅ Lead encontrado:", lead.id);
              const currentTags = lead.tags || [];
              
              // Process each label
              for (const label of labels) {
                const labelName = label.name || label.displayName || label.title || "";
                const labelId = label.id || label.labelId || "";
                
                if (!labelName) {
                  console.log("⚠️ Label sem nome, pulando:", JSON.stringify(label));
                  continue;
                }
                
                console.log(`🏷️ Processando label: "${labelName}" (ID: ${labelId})`);
                
                if (action === "remove") {
                  // Remove tag
                  const newTags = currentTags.filter((t: string) => t.toLowerCase() !== labelName.toLowerCase());
                  await supabase
                    .from("leads")
                    .update({ tags: newTags, updated_at: new Date().toISOString() })
                    .eq("id", lead.id);
                  console.log(`✅ Tag "${labelName}" removida do lead ${lead.id}`);
                } else {
                  // Add tag if not exists
                  if (!currentTags.some((t: string) => t.toLowerCase() === labelName.toLowerCase())) {
                    const newTags = [...currentTags, labelName];
                    await supabase
                      .from("leads")
                      .update({ tags: newTags, updated_at: new Date().toISOString() })
                      .eq("id", lead.id);
                    currentTags.push(labelName); // Update local array for next iteration
                    console.log(`✅ Tag "${labelName}" adicionada ao lead ${lead.id}`);
                  } else {
                    console.log(`ℹ️ Tag "${labelName}" já existe no lead ${lead.id}`);
                  }
                }
                
                // Also ensure tag exists in tags table
                const { data: existingTag } = await supabase
                  .from("tags")
                  .select("id")
                  .eq("user_id", connection.user_id)
                  .ilike("name", labelName)
                  .single();
                
                if (!existingTag) {
                  await supabase
                    .from("tags")
                    .insert({
                      user_id: connection.user_id,
                      name: labelName,
                      color: label.color || "#3b82f6"
                    });
                  console.log(`✅ Tag "${labelName}" criada na tabela tags`);
                }
              }
            } else {
              console.log(`⚠️ Lead não encontrado para o telefone ${phone}`);
              
              // Try to find in conversations
              const { data: conversations } = await supabase
                .from("conversations")
                .select("id, tags, contact_phone")
                .or(`contact_phone.eq.${phone},contact_phone.ilike.%${phone}%`)
                .eq("user_id", connection.user_id)
                .limit(1);
              
              if (conversations && conversations.length > 0) {
                const conv = conversations[0];
                console.log("✅ Conversa encontrada:", conv.id);
                const currentTags = conv.tags || [];
                
                for (const label of labels) {
                  const labelName = label.name || label.displayName || label.title || "";
                  if (!labelName) continue;
                  
                  if (!currentTags.some((t: string) => t.toLowerCase() === labelName.toLowerCase())) {
                    await supabase
                      .from("conversations")
                      .update({ tags: [...currentTags, labelName], updated_at: new Date().toISOString() })
                      .eq("id", conv.id);
                    console.log(`✅ Tag "${labelName}" adicionada à conversa ${conv.id}`);
                  }
                }
              }
            }
          } else if (!phone) {
            console.log("⚠️ ChatId não encontrado no payload");
          } else {
            console.log("⚠️ Nenhuma label no payload");
          }
        } else {
          console.log("⚠️ Conexão não encontrada - instance_id:", payloadInstanceId, "token:", payloadToken ? "presente" : "ausente");
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          eventType: "label",
          processed: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (labelError: any) {
        console.error("❌ Erro ao processar evento de label:", labelError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: labelError.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ========================================
    // HANDLE POLL VOTE EVENTS - Save poll responses
    // ========================================
    const pollEventTypes = ["poll", "poll.vote", "poll_vote", "pollUpdate", "messages.update"];
    const isPollEvent = eventType && pollEventTypes.some(t => eventType.toLowerCase().includes(t.toLowerCase()));
    const hasPollUpdates = payload.pollUpdates || payload.data?.pollUpdates || payload.message?.pollUpdates;
    
    // UAZAPI specific: check if messageType is PollUpdateMessage
    const messageType = payload.message?.messageType || "";
    const isPollUpdateMessage = messageType === "PollUpdateMessage";
    const hasVoteInChat = payload.chat?.wa_lastMessageTextVote && payload.chat?.wa_lastMessageType === "PollUpdateMessage";
    
    if (isPollEvent || hasPollUpdates || isPollUpdateMessage || hasVoteInChat) {
      console.log("📊 Evento de ENQUETE detectado:", eventType);
      console.log("📊 messageType:", messageType);
      console.log("📊 hasVoteInChat:", hasVoteInChat);
      console.log("📊 wa_lastMessageTextVote:", payload.chat?.wa_lastMessageTextVote);
      
      try {
        // Extract poll vote data - UAZAPI format
        let votedOptions: string[] = [];
        let voterPhone = "";
        let voterName = "";
        
        // UAZAPI specific format: vote is in chat.wa_lastMessageTextVote
        if (hasVoteInChat) {
          const voteText = payload.chat.wa_lastMessageTextVote;
          if (voteText) {
            // Can be single vote or comma-separated for multi-vote
            votedOptions = voteText.split(",").map((v: string) => v.trim()).filter((v: string) => v);
          }
          voterPhone = payload.message?.chatid || payload.chat?.wa_chatid || "";
          voterName = payload.chat?.wa_contactName || payload.chat?.name || "";
        } else {
          // Fallback to other formats
          const pollData = payload.data || payload.pollUpdates || payload.message?.pollUpdates || payload;
          const pollResult = pollData.pollResult || pollData.results || pollData.votes || [];
          voterPhone = pollData.voter || pollData.from || payload.message?.sender_pn || payload.message?.sender || telefone || "";
          
          if (Array.isArray(pollResult)) {
            const cleanPhone = voterPhone.replace(/@.*$/, "").replace(/\D/g, "");
            pollResult.forEach((opt: any) => {
              const voters = opt.voters || [];
              if (voters.some((v: string) => v.includes(cleanPhone))) {
                votedOptions.push(opt.name || opt.option || opt.text || "");
              }
            });
          } else if (pollData.selectedOptions || pollData.vote?.selectedOptions) {
            votedOptions = pollData.selectedOptions || pollData.vote?.selectedOptions || [];
          }
        }
        
        const cleanVoterPhone = voterPhone.replace(/@.*$/, "").replace(/\D/g, "");
        
        console.log("📊 Votante:", cleanVoterPhone);
        console.log("📊 Nome:", voterName);
        console.log("📊 Opções votadas:", votedOptions);
        
        if (cleanVoterPhone && votedOptions.length > 0) {
          // Find connection by instance name or token
          const instanceName = payload.instanceName || payload.instance || "";
          let connection = null;
          
          if (instanceName) {
            const { data: connByName } = await supabase
              .from("connections")
              .select("*")
              .eq("instance_name", instanceName)
              .single();
            connection = connByName;
          }
          
          if (!connection) {
            const payloadToken = payload.token || instanceToken || "";
            const payloadInstanceId = payload.instance_id || payload.instanceId || payload.id || "";
            
            if (payloadInstanceId) {
              const { data: connByInstance } = await supabase
                .from("connections")
                .select("*")
                .eq("instance_id", payloadInstanceId)
                .single();
              connection = connByInstance;
            }
            
            if (!connection && payloadToken) {
              const { data: connData } = await supabase
                .from("connections")
                .select("*")
                .eq("token", payloadToken)
                .single();
              connection = connData;
            }
          }
          
          if (connection) {
            const userId = connection.user_id;
            
            // Get contact name from leads or use UAZAPI provided name
            let contactName = voterName;
            if (!contactName) {
              const { data: lead } = await supabase
                .from("leads")
                .select("name")
                .eq("phone", cleanVoterPhone)
                .eq("user_id", userId)
                .single();
              contactName = lead?.name || cleanVoterPhone;
            }
            
            // Save poll response to campaign_responses
            for (const option of votedOptions) {
              const { error: insertError } = await supabase
                .from("campaign_responses")
                .insert({
                  user_id: userId,
                  contact_phone: cleanVoterPhone,
                  contact_name: contactName,
                  response_type: "poll",
                  response_value: option,
                  response_text: `Votou na opção: ${option}`,
                  responded_at: new Date().toISOString()
                });
              
              if (insertError) {
                console.error("❌ Erro ao salvar voto:", insertError);
              } else {
                console.log(`✅ Voto salvo: ${contactName} votou em "${option}"`);
              }
            }
            
            return new Response(JSON.stringify({ 
              success: true, 
              eventType: "poll",
              processed: true,
              votedOptions,
              contact: contactName
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          } else {
            console.log("⚠️ Conexão não encontrada para evento de enquete");
          }
        } else {
          console.log("⚠️ Sem votante ou opções votadas");
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          eventType: "poll",
          processed: false,
          reason: "No valid vote data found"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (pollError: any) {
        console.error("❌ Erro ao processar evento de enquete:", pollError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: pollError.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ========================================
    // HANDLE SENDER/CAMPAIGN STATUS EVENTS - Update campaign delivery status
    // ========================================
    const senderEventTypes = ["sender", "sender.update", "sender.status", "sender.message", "campaign", "campaign.update", "SENDER_STATUS", "sender_update"];
    const isSenderEvent = eventType && senderEventTypes.some(t => eventType.toLowerCase().includes(t.toLowerCase()));
    
    // Also check for folder_id in payload which indicates it's a campaign update
    const hasFolderId = payload.folder_id || payload.folderId || payload.data?.folder_id;
    
    if (isSenderEvent || hasFolderId) {
      console.log("📤 Evento de STATUS DE ENVIO detectado:", eventType);
      console.log("📝 Payload completo:", JSON.stringify(payload, null, 2));
      
      try {
        // Extract folder_id from various possible locations
        const folderId = payload.folder_id || payload.folderId || payload.data?.folder_id || "";
        const messageStatus = payload.status || payload.messageStatus || payload.data?.status || "";
        const messageNumber = payload.number || payload.phone || payload.to || payload.data?.number || "";
        const messageId = payload.message_id || payload.messageId || payload.id || payload.data?.message_id || "";
        const success = payload.success !== false && !payload.error && messageStatus !== "failed";
        const errorMessage = payload.error || payload.errorMessage || payload.data?.error || "";
        
        console.log("📊 Dados do evento de envio:");
        console.log(`   - Folder ID: ${folderId}`);
        console.log(`   - Status: ${messageStatus}`);
        console.log(`   - Número: ${messageNumber}`);
        console.log(`   - Sucesso: ${success}`);
        console.log(`   - Erro: ${errorMessage}`);
        
        // Find connection by token
        const payloadToken = payload.token || instanceToken || "";
        let connection = null;
        
        if (payloadToken) {
          const { data: connData } = await supabase
            .from("connections")
            .select("*")
            .eq("token", payloadToken)
            .single();
          if (connData) {
            connection = connData;
          }
        }
        
        if (connection) {
          console.log("🔗 Conexão encontrada:", connection.id);
          
          // Find campaigns that might be queued (status = 'queued' or 'sending')
          // We'll update based on folder_id match if available, or by user_id if not
          const { data: campaigns, error: campaignError } = await supabase
            .from("campaigns")
            .select("*")
            .eq("user_id", connection.user_id)
            .in("status", ["queued", "sending", "processing"])
            .order("created_at", { ascending: false })
            .limit(10);
          
          if (campaignError) {
            console.error("❌ Erro ao buscar campanhas:", campaignError);
          }
          
          if (campaigns && campaigns.length > 0) {
            console.log(`📋 ${campaigns.length} campanha(s) em andamento encontradas`);
            
            // Update campaign counts based on the event
            for (const campaign of campaigns) {
              const currentSent = campaign.sent_count || 0;
              const currentFailed = campaign.failed_count || 0;
              const totalContacts = campaign.total_contacts || 0;
              
              let newSentCount = currentSent;
              let newFailedCount = currentFailed;
              
              // If this is a delivery status update for a specific message
              if (messageStatus === "sent" || messageStatus === "delivered" || success) {
                newSentCount = currentSent + 1;
              } else if (messageStatus === "failed" || messageStatus === "error" || !success) {
                newFailedCount = currentFailed + 1;
              }
              
              // Determine new campaign status
              const totalProcessed = newSentCount + newFailedCount;
              let newStatus = campaign.status;
              
              if (totalProcessed >= totalContacts) {
                // All messages processed
                newStatus = newFailedCount === totalContacts ? "failed" : "completed";
                console.log(`✅ Campanha ${campaign.id} finalizada: ${newSentCount} enviados, ${newFailedCount} falhas`);
              } else if (newSentCount > 0 || newFailedCount > 0) {
                newStatus = "sending";
              }
              
              // Update campaign
              const updateData: any = {
                sent_count: newSentCount,
                failed_count: newFailedCount,
                status: newStatus,
                updated_at: new Date().toISOString()
              };
              
              if (newStatus === "completed" || newStatus === "failed") {
                updateData.completed_at = new Date().toISOString();
              }
              
              await supabase
                .from("campaigns")
                .update(updateData)
                .eq("id", campaign.id);
              
              console.log(`📊 Campanha ${campaign.id} atualizada: ${newSentCount}/${totalContacts} enviados, ${newFailedCount} falhas, status: ${newStatus}`);
              
              // Only update one campaign per event (the most recent one)
              break;
            }
          } else {
            console.log("ℹ️ Nenhuma campanha em andamento encontrada");
          }
        } else {
          console.log("⚠️ Conexão não encontrada para atualizar status de campanha");
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          eventType: "sender_status",
          processed: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (senderError: any) {
        console.error("❌ Erro ao processar evento de status de envio:", senderError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: senderError.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Skip non-message events (aceita eventos UAZAPI e Evolution)
    const messageEventTypes = [
      "messages", "message", "RECEIVE_MESSAGE",
      "messages.upsert", "MESSAGES_UPSERT",
      "message.any", "message.received", "message-received"
    ];
    if (eventType && !messageEventTypes.includes(eventType)) {
      console.log("⚠️ Evento não é mensagem, ignorando:", eventType);
      return new Response(JSON.stringify({ 
        success: true, 
        skipped: true,
        reason: `Event type: ${eventType}`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Skip messages from me
    if (isFromMe) {
      console.log("⚠️ Mensagem enviada por nós, ignorando");
      return new Response(JSON.stringify({ 
        success: true, 
        skipped: true,
        reason: "Message from me"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Handle audio messages - try to transcribe if it's an audio type
    let audioUrl = "";
    let audioBase64 = "";
    let audioMediaKey = "";
    let audioFileSHA256 = "";
    let isAudioMessage = false;
    
    // NEW: Handle image and document messages for AI vision
    let isImageMessage = false;
    let isDocumentMessage = false;
    let mediaUrl = "";
    let mediaType = "";
    let mediaCaption = "";
    
    if (tipo === "audio" || tipo === "ptt" || tipo === "voice" || 
        payload.message?.mediaType === "ptt" || payload.message?.messageType === "AudioMessage") {
      isAudioMessage = true;
      // Extract audio URL, base64, and crypto keys from payload
      const msg = payload.message || payload.messages?.[0] || payload;
      const content = msg.content || {};
      
      // URL can be in various places
      audioUrl = content.URL || content.url || msg.mediaUrl || msg.audio || msg.media?.url || "";
      
      // UAZAPI pode enviar o base64 diretamente no webhook - PRIORITÁRIO
      audioBase64 = msg.base64 || msg.mediaBase64 || content.base64 || msg.media?.base64 || "";
      
      // Media decryption keys (from UAZAPI webhook)
      audioMediaKey = content.mediaKey || msg.mediaKey || "";
      audioFileSHA256 = content.fileSHA256 || msg.fileSHA256 || "";
      
      console.log("🎤 Mensagem de áudio detectada");
      console.log("   - URL do áudio:", audioUrl?.substring(0, 80));
      console.log("   - Base64 disponível:", audioBase64 ? `Sim (${audioBase64.length} chars)` : "Não");
      console.log("   - MediaKey disponível:", audioMediaKey ? "Sim" : "Não");
      console.log("   - FileSHA256 disponível:", audioFileSHA256 ? "Sim" : "Não");
      
      // Transcription will happen after we have the userId (for API key lookup)
      if (audioBase64 || audioUrl) {
        mensagem = "__PENDING_TRANSCRIPTION__";
        console.log("📝 Áudio marcado para transcrição após identificar usuário");
      } else {
        mensagem = "[Áudio sem URL e sem base64]";
      }
    }
    // Handle IMAGE messages for AI vision
    else if (tipo === "image" || tipo === "imageMessage" || 
             payload.message?.messageType === "ImageMessage" ||
             payload.message?.type === "image") {
      isImageMessage = true;
      mediaType = "image";
      
      const msg = payload.message || payload.messages?.[0] || payload;
      const content = typeof msg.content === 'object' ? msg.content : {};
      
      // UAZAPI: Extract image URL from various possible fields
      // O UAZAPI pode enviar a URL em: content.URL, msg.mediaUrl, msg.base64 (inline)
      mediaUrl = content.URL || content.url || content.imageURL || 
                 msg.mediaUrl || msg.imageUrl || msg.image || 
                 msg.media?.url || msg.base64 || "";
      
      // Se tiver base64, converter para data URL se necessário
      if (mediaUrl && !mediaUrl.startsWith('http') && !mediaUrl.startsWith('data:')) {
        // É provavelmente base64 sem prefixo
        if (mediaUrl.length > 100) {
          mediaUrl = `data:image/jpeg;base64,${mediaUrl}`;
          console.log("🖼️ Imagem base64 convertida para data URL");
        }
      }
      
      // Extract caption - pode estar no content ou no texto da mensagem
      mediaCaption = content.caption || msg.caption || msg.text || 
                     (typeof msg.content === 'string' ? msg.content : "") || 
                     mensagem || "";
      
      console.log("🖼️ Mensagem de IMAGEM detectada");
      console.log("   - URL da imagem:", mediaUrl ? (mediaUrl.startsWith('data:') ? 'BASE64 DATA URL' : mediaUrl.substring(0, 80)) : "NÃO ENCONTRADA");
      console.log("   - Caption:", mediaCaption?.substring(0, 50) || "Sem caption");
      console.log("   - Content keys:", typeof msg.content === 'object' ? Object.keys(msg.content).join(', ') : 'string');
      
      // Keep original message but mark as image
      if (mediaUrl) {
        mensagem = mediaCaption || "[Imagem recebida]";
      } else {
        console.log("⚠️ Imagem detectada mas URL não encontrada - verificar payload");
        console.log("   - msg keys:", Object.keys(msg).join(', '));
        mensagem = mediaCaption || "[Imagem recebida - URL não disponível]";
      }
    }
    // Handle DOCUMENT messages
    else if (tipo === "document" || tipo === "documentMessage" ||
             payload.message?.messageType === "DocumentMessage" ||
             payload.message?.type === "document") {
      isDocumentMessage = true;
      mediaType = "document";
      
      const msg = payload.message || payload.messages?.[0] || payload;
      const content = msg.content || {};
      
      // Extract document URL
      mediaUrl = content.URL || content.url || msg.mediaUrl || msg.documentUrl || 
                 msg.document || msg.media?.url || "";
      
      // Extract document name/caption
      mediaCaption = content.caption || content.filename || msg.fileName || 
                     msg.caption || msg.text || mensagem || "";
      
      console.log("📄 Mensagem de DOCUMENTO detectada");
      console.log("   - URL do documento:", mediaUrl?.substring(0, 80));
      console.log("   - Nome/Caption:", mediaCaption?.substring(0, 50));
      
      // Keep original message but mark as document
      if (mediaUrl) {
        mensagem = mediaCaption || "[Documento recebido]";
      }
    }

    // Skip empty messages
    if (!mensagem) {
      console.log("⚠️ Mensagem vazia, ignorando");
      return new Response(JSON.stringify({ 
        success: true, 
        skipped: true,
        reason: "Empty message"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Limpar telefone
    const cleanPhone = telefone.replace(/@.*/, "").replace(/\D/g, "");
    console.log("📱 Telefone limpo:", cleanPhone);

    if (!cleanPhone) {
      console.log("⚠️ Telefone vazio após limpeza");
      return new Response(JSON.stringify({ 
        success: true, 
        skipped: true,
        reason: "Empty phone"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validar se é um número de telefone válido (não é ID do Facebook/Instagram)
    const isValidPhoneNumber = (phone: string): boolean => {
      // Números de telefone válidos: 10-15 dígitos, começando com códigos de país conhecidos
      if (phone.length < 10 || phone.length > 15) return false;
      
      // IDs do Facebook/Instagram são geralmente muito longos (>15 dígitos) ou não seguem padrões de telefone
      if (phone.length > 15) return false;
      
      // Verificar se começa com códigos de país comuns (55 Brasil, 1 EUA, etc)
      const validPrefixes = ['55', '1', '44', '351', '34', '33', '49', '39', '81', '86'];
      const hasValidPrefix = validPrefixes.some(prefix => phone.startsWith(prefix));
      
      // Se não tem prefixo válido mas tem entre 10-11 dígitos, pode ser número local brasileiro
      if (!hasValidPrefix && (phone.length === 10 || phone.length === 11)) {
        return true;
      }
      
      return hasValidPrefix;
    };

    const isValidPhone = isValidPhoneNumber(cleanPhone);
    console.log("📱 Telefone válido:", isValidPhone);

    // Check if it's a group message
    const isGroup = telefone.includes("@g.us") || payload.message?.isGroup === true || payload.chat?.wa_isGroup === true;
    console.log("👥 É grupo:", isGroup);

    // Buscar conexão pelo instance_id, instanceName, token ou fallback
    let connection = null;
    
    // Primeiro: tentar pelo instance_id do payload
    const payloadInstanceId = payload.instance_id || payload.instanceId;
    if (payloadInstanceId) {
      const { data: connByInstanceId, error: err1 } = await supabase
        .from("connections")
        .select("user_id, id, token, environment, base_url, company_id, credentials, instance_name")
        .eq("instance_id", payloadInstanceId)
        .maybeSingle();
      
      if (err1) console.error("❌ Erro busca instance_id:", err1.message);
      if (connByInstanceId) {
        connection = connByInstanceId;
        console.log("✅ Conexão encontrada pelo instance_id:", payloadInstanceId);
      }
    }

    // Segundo: tentar pelo instanceName do payload
    const payloadInstanceName = payload.instanceName || payload.instance_name;
    if (!connection && payloadInstanceName) {
      const { data: connByName, error: err2 } = await supabase
        .from("connections")
        .select("user_id, id, token, environment, base_url, company_id, credentials, instance_name")
        .eq("instance_name", payloadInstanceName)
        .maybeSingle();
      
      if (err2) console.error("❌ Erro busca instanceName:", err2.message);
      if (connByName) {
        connection = connByName;
        console.log("✅ Conexão encontrada pelo instanceName:", payloadInstanceName);
      }
    }
    
    // Terceiro: tentar pelo token (payload.token ou instanceToken)
    const tokenToSearch = payload.token || instanceToken;
    if (!connection && tokenToSearch) {
      const { data: connByToken, error: err3 } = await supabase
        .from("connections")
        .select("user_id, id, token, environment, base_url, company_id, credentials, instance_name")
        .eq("token", tokenToSearch)
        .maybeSingle();
      
      if (err3) console.error("❌ Erro busca token:", err3.message);
      if (connByToken) {
        connection = connByToken;
        console.log("✅ Conexão encontrada pelo token");
      }
    }

    // Quarto: fallback para qualquer conexão ativa
    if (!connection) {
      console.log("⚠️ Tentando fallback para conexão ativa...");
      const { data: activeConns, error: err4 } = await supabase
        .from("connections")
        .select("user_id, id, token, environment, base_url, company_id, credentials, instance_name")
        .eq("status", "connected");
      
      if (err4) console.error("❌ Erro busca fallback:", err4.message);
      if (activeConns && activeConns.length > 0) {
        connection = activeConns[0];
        console.log("✅ Conexão encontrada (fallback ativa), total:", activeConns.length);
      } else {
        console.error("❌ Nenhuma conexão ativa encontrada. Total retornado:", activeConns?.length);
      }
    }

    if (!connection) {
      console.error("❌ Nenhuma conexão encontrada!");
      return new Response(JSON.stringify({ 
        error: "Connection not found"
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check if group messages should be filtered
    if (isGroup) {
      console.log("⚠️ Mensagem de grupo ignorada (filtro ativo)");
      return new Response(JSON.stringify({ 
        success: true, 
        skipped: true,
        reason: "Group message filtered"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const userId = connection.user_id;
    const connectionId = connection.id;
    console.log("👤 User ID:", userId);
    console.log("🔗 Connection ID:", connectionId);

    // ========================================
    // TRANSCRIÇÃO DE ÁUDIO (agora que temos userId para buscar API keys)
    // ========================================
    if (isAudioMessage && mensagem === "__PENDING_TRANSCRIPTION__" && (audioBase64 || audioUrl)) {
      console.log("🎤 Iniciando transcrição de áudio...");
      console.log("   - User ID para buscar keys:", userId);
      console.log("   - Usando base64:", audioBase64 ? "SIM" : "NÃO");
      console.log("   - Usando URL:", audioUrl ? "SIM" : "NÃO");
      console.log("   - MediaKey:", audioMediaKey ? "SIM" : "NÃO");
      
      try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const transcribeResponse = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-transcribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
          },
          body: JSON.stringify({ 
            audioUrl,
            audioBase64,
            userId,
            // Pass media decryption keys for UAZAPI
            mediaKey: audioMediaKey,
            fileSHA256: audioFileSHA256,
            connectionToken: connection.token,
            connectionBaseUrl: connection.base_url || (connection.environment === "PROD" ? "https://app.uazapi.com" : "https://free.uazapi.com")
          })
        });
        
        if (transcribeResponse.ok) {
          const transcription = await transcribeResponse.json();
          console.log("📝 Resultado transcrição:", JSON.stringify(transcription));
          
          if (transcription.success && transcription.text && transcription.text.trim()) {
            mensagem = transcription.text;
            console.log("✅ Áudio transcrito:", mensagem.substring(0, 100));
          } else {
            console.log("⚠️ Transcrição vazia ou falhou");
            mensagem = "[Áudio não transcrito]";
          }
        } else {
          const errText = await transcribeResponse.text();
          console.error("❌ Erro na transcrição:", errText);
          mensagem = "[Áudio recebido]";
        }
      } catch (transcribeError: any) {
        console.error("❌ Erro ao transcrever áudio:", transcribeError.message);
        mensagem = "[Áudio recebido]";
      }
    }

    // ========================================
    // ENVIAR PARA TELEGRAM IMEDIATAMENTE (antes de qualquer operação que possa falhar)
    // ========================================
    try {
      console.log("🔔 Verificando Telegram (envio imediato)...");
      
      const { data: telegramConfigs, error: telegramConfigError } = await supabase
        .from("telegram_notification_configs")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .eq("notify_lead_response", true);

      if (telegramConfigError) {
        console.error("❌ Erro ao buscar configs Telegram:", telegramConfigError.message);
      } else if (telegramConfigs && telegramConfigs.length > 0) {
        console.log(`📋 ${telegramConfigs.length} config(s) Telegram encontrada(s)`);
        
        for (const config of telegramConfigs) {
          if (!config.telegram_chat_id) {
            console.log("⚠️ Config Telegram sem chat_id, pulando...");
            continue;
          }

          // Verificar filtro de conexão
          if (config.connection_id && config.connection_id !== connectionId) {
            console.log("⚠️ Config Telegram para outra conexão, pulando...");
            continue;
          }

          // Verificar filtro de palavras-chave
          const keywords = config.filter_keywords || [];
          const filterMode = config.filter_mode || 'contains';
          
          if (keywords.length > 0) {
            const messageLower = mensagem.toLowerCase();
            let shouldSend = false;

            switch (filterMode) {
              case 'contains':
                shouldSend = keywords.some((kw: string) => messageLower.includes(kw.toLowerCase()));
                break;
              case 'all':
                shouldSend = keywords.some((kw: string) => messageLower.includes(kw.toLowerCase()));
                break;
              case 'exact':
                shouldSend = keywords.some((kw: string) => messageLower === kw.toLowerCase());
                break;
              case 'starts':
                shouldSend = keywords.some((kw: string) => messageLower.startsWith(kw.toLowerCase()));
                break;
              default:
                shouldSend = keywords.some((kw: string) => messageLower.includes(kw.toLowerCase()));
            }

            if (!shouldSend) {
              console.log("⚠️ Mensagem não passou no filtro de palavras-chave");
              continue;
            }
            console.log(`✅ Mensagem passou no filtro (modo: ${filterMode})`);
          }

          console.log("📤 Enviando para Telegram...");

          // Preparar texto da mensagem para Telegram
          let telegramText = mensagem || "";
          
          // Se a mensagem parece ser JSON bruto (começa com { ou [), limpar
          if (telegramText.startsWith('{') || telegramText.startsWith('[')) {
            try {
              const parsed = JSON.parse(telegramText);
              // Tentar extrair texto útil do JSON
              telegramText = parsed.text || parsed.body || parsed.caption || parsed.message || "[Mensagem com mídia]";
            } catch {
              telegramText = "[Mensagem com mídia]";
            }
          }
          
          // Escapar caracteres especiais do Markdown que podem quebrar a formatação
          const escapeMarkdown = (text: string) => {
            return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
          };
          
          const safeContactName = escapeMarkdown(contactName || cleanPhone);
          const safeTelegramText = escapeMarkdown(telegramText);

          // Construir mensagem formatada
          const telegramMessage = `📱 *Nova mensagem WhatsApp*

👤 *Contato:* ${safeContactName}
📞 *Telefone:* ${cleanPhone}
⏰ *Horário:* ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}

💬 *Mensagem:*
${safeTelegramText}`;

          // Enviar diretamente via API do Telegram
          const TELEGRAM_BOT_TOKEN = config.telegram_bot_token || Deno.env.get("TELEGRAM_BOT_TOKEN");
          
          if (TELEGRAM_BOT_TOKEN) {
            try {
              const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
              
              // Tentar com Markdown primeiro, se falhar enviar sem formatação
              let telegramResponse = await fetch(telegramUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  chat_id: config.telegram_chat_id,
                  text: telegramMessage,
                  parse_mode: "Markdown"
                }),
              });

              // Se Markdown falhar (caracteres especiais), enviar sem formatação
              if (!telegramResponse.ok) {
                const errorResult = await telegramResponse.json();
                console.warn("⚠️ Markdown falhou, enviando sem formatação:", errorResult?.description);
                
                const plainMessage = `📱 Nova mensagem WhatsApp\n\n👤 Contato: ${contactName || cleanPhone}\n📞 Telefone: ${cleanPhone}\n⏰ Horário: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n💬 Mensagem:\n${telegramText}`;
                
                telegramResponse = await fetch(telegramUrl, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    chat_id: config.telegram_chat_id,
                    text: plainMessage
                  }),
                });
              }

              const telegramResult = await telegramResponse.json();
              
              if (telegramResponse.ok) {
                console.log("✅ Mensagem enviada para Telegram com sucesso!");
              } else {
                console.error("❌ Erro do Telegram:", JSON.stringify(telegramResult));
              }
            } catch (telegramError: any) {
              console.error("❌ Erro ao enviar para Telegram:", telegramError.message);
            }
          } else {
            console.log("⚠️ TELEGRAM_BOT_TOKEN não configurado nas secrets");
          }
        }
      } else {
        console.log("ℹ️ Nenhuma config de Telegram ativa para este usuário");
      }
    } catch (telegramGeneralError: any) {
      console.error("⚠️ Erro geral ao processar Telegram (não crítico):", telegramGeneralError.message);
    }

    // Buscar ou criar lead (respeitando configuração de auto_save_contacts)
    // IMPORTANTE: Só criar lead se for um número de telefone válido (não ID de Facebook/Instagram)
    const shouldAutoSave = true; // Always auto-save contacts
    
    let leadData = null;
    
    // Só buscar/criar lead se for um número de telefone válido
    if (isValidPhone) {
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id, name")
        .eq("user_id", userId)
        .eq("phone", cleanPhone)
        .single();
      
      leadData = existingLead;

      if (!leadData && shouldAutoSave) {
        console.log("📇 Criando lead (auto_save_contacts habilitado)...");
        const { data: newLead, error: leadError } = await supabase
          .from("leads")
          .insert({
            user_id: userId,
            phone: cleanPhone,
            name: contactName || cleanPhone,
            source: "WhatsApp",
            status: "warm"
          })
          .select()
          .single();

        if (leadError) {
          console.error("❌ Erro ao criar lead:", leadError);
          throw leadError;
        }
        leadData = newLead;
        console.log("✅ Lead criado:", newLead.id);
      } else if (!leadData && !shouldAutoSave) {
        // Create temporary lead just for the conversation (without saving permanently)
        console.log("📇 Auto-save desabilitado - criando lead temporário...");
        const { data: tempLead, error: leadError } = await supabase
          .from("leads")
          .insert({
            user_id: userId,
            phone: cleanPhone,
            name: contactName || cleanPhone,
            source: "WhatsApp",
            status: "new" // Mark as new for manual review
          })
          .select()
          .single();

        if (leadError) {
          console.error("❌ Erro ao criar lead temporário:", leadError);
          throw leadError;
        }
        leadData = tempLead;
        console.log("✅ Lead temporário criado:", tempLead.id);
      }
    } else {
      console.log("⚠️ Número inválido (possível ID de Facebook/Instagram) - não criando lead:", cleanPhone);
    }

    // Buscar conversa existente (qualquer status exceto 'closed')
    // Inclui flow_state, assigned_agent_id e status para verificar estado pendente e IA
    let conversationData = null;
    
    // Se temos lead, buscar por lead_id
    if (leadData) {
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id, status, department_id, assigned_to, attendance_type, flow_state")
        .eq("contact_phone", cleanPhone)
        .eq("connection_id", connectionId)
        .not("status", "eq", "closed")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      conversationData = existingConv;
    } else {
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id, status, department_id, assigned_to, attendance_type, flow_state")
        .eq("contact_phone", cleanPhone)
        .eq("connection_id", connectionId)
        .not("status", "eq", "closed")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      conversationData = existingConv;
    }

    // Flag para indicar se é uma conversa nova (para decidir se inicia fluxo)
    let isNewConversation = false;
    let conversationInQueue = false;
    let conversationInAttendance = false;

    if (!conversationData) {
      console.log("💬 Criando nova conversa...");
      isNewConversation = true;
      
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({
          user_id: userId,
          company_id: connection.company_id || null,
          connection_id: connectionId,
          contact_phone: cleanPhone,
          contact_name: contactName || cleanPhone,
          contact_avatar: payload?.chat?.imagePreview || null,
          status: "open",
          attendance_type: "ura",
          last_message: mensagem,
          last_message_at: new Date().toISOString()
        })
        .select("id, status, department_id, assigned_to, attendance_type")
        .single();

      if (convError) {
        console.error("❌ Erro ao criar conversa:", convError);
        throw convError;
      }
      conversationData = newConv;
      console.log("✅ Conversa criada:", newConv.id);
    } else {
      // Verificar status atual da conversa
      const currentStatus = conversationData.status;
      conversationInQueue = currentStatus === "waiting" || currentStatus === "in_queue";
      conversationInAttendance = currentStatus === "in_attendance";
      
      console.log(`📋 Conversa existente encontrada:`);
      console.log(`   - ID: ${conversationData.id}`);
      console.log(`   - Status: ${currentStatus}`);
      console.log(`   - Na fila: ${conversationInQueue}`);
      console.log(`   - Em atendimento: ${conversationInAttendance}`);
      
      // Atualizar última mensagem
      await supabase
        .from("conversations")
        .update({ 
          last_message: mensagem,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", conversationData.id);
    }

    // Inserir mensagem
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationData.id,
        sender_type: "customer",
        content: mensagem,
        message_type: tipo || "text",
        status: "received",
        external_id: messageId || null
      })
      .select()
      .single();

    if (msgError) {
      console.error("❌ Erro ao salvar mensagem:", msgError);
      throw msgError;
    }

    console.log("=".repeat(80));
    console.log("✅ MENSAGEM SALVA COM SUCESSO!");
    console.log("  📝 ID:", message.id);
    console.log("  💬 Conversa:", conversationData.id);
    console.log("  📱 Telefone:", cleanPhone);
    console.log("  📄 Conteúdo:", mensagem.substring(0, 50));
    console.log("=".repeat(80));

    // ========================================
    // RESPOSTA AUTOMÁTICA (SE CONFIGURADA)
    // ========================================
    try {
      const connCreds = connection?.credentials as any;
      const autoReply = connCreds?.messages;
      
      if (autoReply?.autoReplyEnabled && autoReply?.autoReplyMessage) {
        console.log("📩 Resposta automática habilitada - enviando...");
        
        let BASE_URL = connection.base_url;
        if (!BASE_URL) {
          const environment = connection.environment || "TESTE";
          BASE_URL = environment === "PROD" 
            ? "https://app.uazapi.com" 
            : "https://free.uazapi.com";
        }

        // Se tem botão configurado, enviar como menu com botão URL
        if (autoReply.autoReplyButtonText && autoReply.autoReplyButtonUrl) {
          try {
            const menuPayload = {
              number: cleanPhone,
              type: "button",
              text: autoReply.autoReplyMessage,
              footerText: "",
              choices: [
                `${autoReply.autoReplyButtonText}|url:${autoReply.autoReplyButtonUrl}`
              ]
            };

            console.log("📤 Enviando menu payload:", JSON.stringify(menuPayload));

            const menuResponse = await fetch(`${BASE_URL}/send/menu`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'token': connection.token
              },
              body: JSON.stringify(menuPayload)
            });

            if (menuResponse.ok) {
              console.log("✅ Resposta automática com botão enviada!");
            } else {
              const errText = await menuResponse.text();
              console.error("❌ Erro ao enviar resposta automática com botão:", errText);
              
              // Fallback: enviar só texto
              await fetch(`${BASE_URL}/send/text`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'token': connection.token
                },
                body: JSON.stringify({
                  number: cleanPhone,
                  text: `${autoReply.autoReplyMessage}\n\n🔗 ${autoReply.autoReplyButtonText}: ${autoReply.autoReplyButtonUrl}`
                })
              });
              console.log("✅ Resposta automática enviada como texto (fallback)");
            }
          } catch (menuError: any) {
            console.error("❌ Erro ao enviar menu:", menuError.message);
          }
        } else {
          // Enviar apenas texto
          try {
            await fetch(`${BASE_URL}/send/text`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'token': connection.token
              },
              body: JSON.stringify({
                number: cleanPhone,
                text: autoReply.autoReplyMessage
              })
            });
            console.log("✅ Resposta automática enviada!");
          } catch (textError: any) {
            console.error("❌ Erro ao enviar resposta automática:", textError.message);
          }
        }
      }
    } catch (autoReplyError: any) {
      console.error("⚠️ Erro ao processar resposta automática:", autoReplyError.message);
    }

    // ========================================
    // VERIFICAR RESPOSTA DE PESQUISA DE SATISFAÇÃO
    // ========================================
    try {
      // Check if message matches any satisfaction survey options
      const { data: userSurveys } = await supabase
        .from("satisfaction_surveys")
        .select("id, options, user_id")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (userSurveys && userSurveys.length > 0) {
        const messageLower = mensagem.toLowerCase().trim();
        
        for (const survey of userSurveys) {
          const options = (survey.options || []) as Array<{label: string; emoji: string; score: number}>;
          
          // Check if message matches any option
          for (const opt of options) {
            const optionText = `${opt.emoji} ${opt.label}`.toLowerCase();
            const optionLabel = opt.label.toLowerCase();
            
            // Check for exact match or contains the option
            if (messageLower === optionText || 
                messageLower === optionLabel ||
                messageLower.includes(optionLabel) ||
                messageLower === opt.emoji) {
              
              console.log("📊 Resposta de pesquisa de satisfação detectada!");
              console.log(`   Survey: ${survey.id}`);
              console.log(`   Resposta: ${opt.label} (score: ${opt.score})`);
              
              // Check if already responded
              const { data: existingResponse } = await supabase
                .from("satisfaction_responses")
                .select("id")
                .eq("survey_id", survey.id)
                .eq("contact_phone", cleanPhone)
                .single();
              
              if (!existingResponse) {
                // Save the response
                const { error: insertError } = await supabase
                  .from("satisfaction_responses")
                  .insert({
                    user_id: survey.user_id,
                    survey_id: survey.id,
                    contact_phone: cleanPhone,
                    contact_name: contactName || leadData?.name || null,
                    response_value: opt.label,
                    response_score: opt.score,
                    responded_at: new Date().toISOString()
                  });
                
                if (insertError) {
                  console.error("❌ Erro ao salvar resposta da pesquisa:", insertError);
                } else {
                  // Update survey response count
                  await supabase
                    .from("satisfaction_surveys")
                    .update({ total_responses: (survey as any).total_responses + 1 || 1 })
                    .eq("id", survey.id);
                  
                  console.log("✅ Resposta da pesquisa salva com sucesso!");
                }
              } else {
                console.log("⚠️ Contato já respondeu esta pesquisa");
              }
              
              break; // Found a match, stop checking options
            }
          }
        }
      }
    } catch (surveyError: any) {
      console.error("⚠️ Erro ao processar pesquisa de satisfação:", surveyError.message);
    }

    // Campaign response tracking removed - not working with UZAPI

    // ========================================
    // VERIFICAR ESTADO PENDENTE DO FLUXO
    // ========================================
    const flowState = conversationData.flow_state as FlowState | null;
    let flowExecuted = false;
    let flowResponses: string[] = [];

    if (flowState && flowState.waiting_for) {
      console.log("\n" + "=".repeat(60));
      console.log("🔄 RETOMANDO FLUXO PENDENTE...");
      console.log("  📋 Tipo:", flowState.waiting_for);
      console.log("  📝 Nó:", flowState.current_node_id);
      console.log("=".repeat(60));

      const resumeResult = await handleFlowResume(
        flowState,
        mensagem,
        conversationData.id,
        cleanPhone,
        contactName || leadData.name,
        connection,
        supabase,
        isAudioMessage
      );

      if (resumeResult.handled) {
        flowExecuted = true;
        flowResponses = resumeResult.responses || [];
        
        // Se o fluxo continuou ou terminou
        if (!resumeResult.stillWaiting) {
          console.log("✅ Fluxo retomado e continuado");
        } else {
          console.log("⏳ Ainda aguardando mais respostas");
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message_id: message.id,
          conversation_id: conversationData.id,
          lead_id: leadData.id,
          flow_resumed: true,
          flow_responses: flowResponses.length
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ========================================
    // EXECUÇÃO DE FLUXOS AUTOMÁTICOS
    // ========================================
    
    // NÃO executar fluxo se a conversa está na fila ou em atendimento
    // Fluxo só pode ser reiniciado após encerrar o atendimento
    if (conversationInQueue || conversationInAttendance) {
      console.log("\n" + "=".repeat(60));
      console.log("⏸️ FLUXO BLOQUEADO - Conversa em andamento");
      console.log(`   Status: ${conversationInQueue ? 'Na fila' : 'Em atendimento'}`);
      console.log("   Motivo: Fluxo só pode reiniciar após encerrar o atendimento");
      console.log("=".repeat(60));
      
      return new Response(JSON.stringify({ 
        success: true, 
        message_id: message.id,
        conversation_id: conversationData.id,
        lead_id: leadData.id,
        flow_blocked: true,
        reason: conversationInQueue ? "conversation_in_queue" : "conversation_in_attendance"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("\n" + "=".repeat(60));
    console.log("🤖 VERIFICANDO FLUXOS ATIVOS...");
    console.log("  📱 Connection ID:", connectionId);
    console.log("  👤 User ID:", userId);
    console.log("  💬 Mensagem:", mensagem.substring(0, 50));
    console.log("  🆕 Nova conversa:", isNewConversation);
    console.log("=".repeat(60));

    // Buscar o fluxo vinculado à conexão via credentials.settings.sendToUra
    let linkedFlowId: string | null = null;
    if (connection?.credentials) {
      const creds = connection.credentials as any;
      linkedFlowId = creds?.settings?.sendToUra || null;
      console.log(`  🔗 Fluxo vinculado via settings: ${linkedFlowId || "nenhum"}`);
    }

    // Buscar fluxos ativos do usuário
    const { data: allFlows, error: flowError1 } = await supabase
      .from("flows")
      .select("id, name, flow_data, trigger_type, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (flowError1) console.log("❌ Erro ao buscar fluxos:", flowError1.message);

    // Priorizar o fluxo vinculado à conexão
    let activeFlows = allFlows || [];
    if (linkedFlowId) {
      // Put linked flow first
      activeFlows = [
        ...activeFlows.filter((f: any) => f.id === linkedFlowId),
        ...activeFlows.filter((f: any) => f.id !== linkedFlowId)
      ];
    }

    if (flowError1) console.log("❌ Erro ao buscar fluxos:", flowError1.message);

    console.log(`📋 Total de fluxos ativos: ${activeFlows.length}`);

    if (activeFlows && activeFlows.length > 0) {
      for (const flow of activeFlows) {
        console.log(`\n📄 Analisando fluxo: "${flow.name}"`);
        console.log(`   - ID: ${flow.id}`);
        console.log(`   - Trigger: ${flow.trigger_type}`);
        console.log(`   - Vinculado: ${flow.id === linkedFlowId ? 'SIM' : 'não'}`);
        
        const flowJson = flow.flow_data as any;
        
        if (!flowJson?.nodes || !flowJson?.edges) {
          console.log(`   ⚠️ Fluxo sem dados válidos (nodes/edges ausentes)`);
          continue;
        }

        console.log(`   - Nós: ${flowJson.nodes.length}`);
        console.log(`   - Conexões: ${flowJson.edges.length}`);

        // Check if flow should trigger on this message
        const trigger = flow.trigger_type || "message";
        
        // Trigger conditions
        const shouldTrigger = 
          trigger === "message" || 
          trigger === "keyword" || 
          (trigger === "first_message" && isNewConversation) ||
          trigger === "all";

        if (!shouldTrigger) {
          console.log(`   ⏭️ Trigger "${trigger}" não aplicável`);
          continue;
        }

        console.log(`   ✅ Trigger "${trigger}" aplicável - EXECUTANDO FLUXO`);
        
        const flowContext: FlowContext = {
          message: mensagem,
          contact: {
            phone: cleanPhone,
            name: contactName || leadData.name
          },
          vars: { _flowId: flow.id },
          conversationId: conversationData.id,
          connectionId: connectionId,
          // NEW: Include media info for AI vision
          media: (isImageMessage || isDocumentMessage) && mediaUrl ? {
            url: mediaUrl,
            type: mediaType as "image" | "document" | "video" | "audio",
            caption: mediaCaption
          } : undefined
        };
        
        console.log(`   📝 Flow context criado com _flowId: ${flow.id}`);

        try {
          const result = await executeFlow(
            flowJson.nodes,
            flowJson.edges,
            flowContext,
            supabase,
            connection
          );

          console.log(`   📊 Resultado: success=${result.success}, responses=${result.responses.length}`);

          if (result.success) {
            flowExecuted = true;
            flowResponses = result.responses;
            
            // Update flow timestamp
            await supabase
              .from("flows")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", flow.id);

            console.log(`   ✅ Fluxo executado com sucesso!`);
          }

          // Only execute the first matching flow
          break;
        } catch (flowExecError: any) {
          console.error(`   ❌ Erro ao executar fluxo:`, flowExecError.message);
        }
      }
    } else {
      console.log("📭 Nenhum fluxo ativo encontrado");
      console.log("   💡 Dica: Certifique-se de que o fluxo está:");
      console.log("      - Com status 'active'");
      console.log("      - Vinculado a esta conexão ou sem conexão específica");
      console.log("      - Com trigger 'message' ou 'first_message'");
    }

    // ========================================
    // VERIFICAR ASSISTENTE IA ATRIBUÍDO
    // ========================================
    let aiAssistantUsed = false;
    
    // Determinar agente de IA: prioridade para agente atribuído à conversa,
    // depois fallback para agente configurado na conexão (credentials.settings.sendToAiAgent)
    const connectionAiAgentId =
      (connection as any)?.credentials?.settings?.sendToAiAgent || null;
    const conversationAiAgentId =
      conversationData.attendance_type === "ai" ? conversationData.assigned_to : null;
    const aiAgentIdToUse = conversationAiAgentId || connectionAiAgentId;

    const canRouteToAI =
      !flowExecuted &&
      aiAgentIdToUse &&
      conversationData.attendance_type !== "agent" &&
      conversationData.attendance_type !== "human" &&
      conversationData.attendance_type !== "queue" &&
      !conversationInAttendance;


    // Se não executou fluxo, verificar se há assistente IA atribuído (conversa ou conexão)
    if (canRouteToAI) {
      console.log("\n" + "=".repeat(60));
      console.log("🤖 VERIFICANDO ASSISTENTE IA...");
      console.log("   Agent ID:", aiAgentIdToUse);
      console.log("   Fonte:", conversationAiAgentId ? "conversa" : "conexão");
      console.log("=".repeat(60));

      // Verificar se o agente está ativo
      const { data: agent } = await supabase
        .from("agents")
        .select("id, name, status")
        .eq("id", aiAgentIdToUse)
        .eq("status", "active")
        .single();


      if (agent) {
        console.log("✅ Assistente IA ativo:", agent.name);

        // Se a conversa ainda não estava marcada como IA, atualizar agora
        if (
          conversationData.attendance_type !== "ai" ||
          conversationData.assigned_to !== agent.id
        ) {
          await supabase
            .from("conversations")
            .update({ attendance_type: "ai", assigned_to: agent.id })
            .eq("id", conversationData.id);
          console.log("🔄 Conversa marcada como IA e atribuída ao agente");
        }

        
        // Chamar edge function de IA
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        
        try {
          // Log se temos mídia para enviar ao AI
          if (isImageMessage || isDocumentMessage) {
            console.log("📎 Enviando mídia para análise da IA");
            console.log("   - Tipo:", mediaType);
            console.log("   - URL:", mediaUrl?.substring(0, 50));
          }
          
          const aiResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-assistant-chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
            },
            body: JSON.stringify({
              message: mensagem,
              agentId: agent.id,
              conversationId: conversationData.id,
              contactName: contactName || leadData.name,
              contactPhone: cleanPhone,
              connectionId: connectionId,
              connectionToken: connection.token,
              connectionBaseUrl: connection.base_url,
              connectionEnvironment: connection.environment,
              isAudioMessage: isAudioMessage,
              respondWithAudio: isAudioMessage, // Respond with audio if user sent audio
              // NEW: Support for image and document analysis
              mediaUrl: (isImageMessage || isDocumentMessage) ? mediaUrl : undefined,
              mediaType: mediaType || undefined,
              mediaCaption: mediaCaption || undefined
            })
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            console.log("✅ Resposta IA enviada:", aiData.response?.substring(0, 50));
            aiAssistantUsed = true;
          } else {
            const errText = await aiResponse.text();
            console.error("❌ Erro ao chamar IA:", errText);
          }
        } catch (aiError: any) {
          console.error("❌ Erro ao chamar assistente IA:", aiError.message);
        }
      } else {
        console.log("⚠️ Assistente IA não encontrado ou inativo");
      }
    }

    // ========================================
    // ENVIAR PARA WEBHOOK EXTERNO (SE CONFIGURADO)
    // ========================================
    try {
      console.log("🔍 Buscando configs de webhook para user:", userId);
      
      // Buscar configurações de webhook do usuário que estão ativas E com webhook externo habilitado
      const { data: webhookConfigs, error: webhookConfigError } = await supabase
        .from("webhook_field_configs")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .eq("external_webhook_enabled", true);

      if (webhookConfigError) {
        console.error("❌ Erro ao buscar configs:", webhookConfigError.message);
      }

      console.log("📋 Configs encontradas:", webhookConfigs?.length || 0);

      if (webhookConfigs && webhookConfigs.length > 0) {
        for (const config of webhookConfigs) {
          // Verificar se tem URL configurada
          if (!config.external_webhook_url) {
            console.log("⚠️ Config sem URL, pulando...");
            continue;
          }

          // Verificar filtro de conexão
          if (config.connection_id && config.connection_id !== connectionId) {
            console.log("⚠️ Config para outra conexão, pulando...");
            continue;
          }

          console.log("🔗 Enviando para webhook externo:", config.external_webhook_url);

          // Construir payload baseado nas configurações de captura
          const webhookPayload: Record<string, any> = {
            event: "message_received",
            timestamp: new Date().toISOString()
          };

          if (config.capture_contact_name) {
            webhookPayload.contact_name = contactName || leadData?.name || cleanPhone;
          }
          if (config.capture_contact_phone) {
            webhookPayload.contact_phone = cleanPhone;
          }
          if (config.capture_message_time) {
            webhookPayload.message_time = new Date().toISOString();
          }
          if (config.capture_message_content) {
            webhookPayload.message_content = mensagem;
          }
          if (config.capture_response_type) {
            webhookPayload.response_type = tipo || "text";
          }
          if (config.capture_button_clicked) {
            const buttonId = payload.message?.buttonResponseMessage?.selectedButtonId || 
                            payload.message?.listResponseMessage?.singleSelectReply?.selectedRowId;
            if (buttonId) {
              webhookPayload.button_clicked = buttonId;
            }
          }
          if (config.capture_list_selection) {
            const listTitle = payload.message?.listResponseMessage?.title;
            if (listTitle) {
              webhookPayload.list_selection = listTitle;
            }
          }

          // Adicionar dados extras
          webhookPayload.conversation_id = conversationData?.id;
          webhookPayload.connection_id = connectionId;
          webhookPayload.flow_executed = flowExecuted;

          console.log("📤 Payload do webhook:", JSON.stringify(webhookPayload));

          // Preparar headers
          const webhookHeaders: Record<string, string> = {
            "Content-Type": "application/json"
          };

          // Adicionar headers customizados
          if (config.external_webhook_headers && typeof config.external_webhook_headers === 'object') {
            Object.entries(config.external_webhook_headers).forEach(([key, value]) => {
              if (key && value) {
                webhookHeaders[key] = String(value);
              }
            });
          }

          // Enviar para webhook externo
          try {
            const webhookResponse = await fetch(config.external_webhook_url, {
              method: "POST",
              headers: webhookHeaders,
              body: JSON.stringify(webhookPayload)
            });

            const responseText = await webhookResponse.text();
            console.log("📥 Resposta do webhook:", webhookResponse.status, responseText);

            if (webhookResponse.ok) {
              console.log("✅ Webhook externo enviado com sucesso!");
            } else {
              console.error("❌ Erro no webhook externo:", webhookResponse.status, responseText);
            }
          } catch (webhookError: any) {
            console.error("❌ Erro ao enviar webhook externo:", webhookError.message);
          }
        }
      } else {
        console.log("ℹ️ Nenhuma config de webhook externa encontrada para este usuário");
      }
    } catch (webhookConfigError: any) {
      console.error("⚠️ Erro geral ao processar webhook externo:", webhookConfigError.message);
    }

    // Telegram já foi enviado no bloco de "envio imediato" acima - NÃO duplicar

    // ==================== WEBHOOK RELAY - Enviar para sistemas externos ====================
    try {
      const { data: externalKeys } = await supabaseAdmin
        .from('external_api_keys')
        .select('id, webhook_url, webhook_events, company_id')
        .eq('is_active', true)
        .not('webhook_url', 'is', null)

      if (externalKeys && externalKeys.length > 0) {
        // Find keys matching this company
        const companyKeys = externalKeys.filter(k => k.company_id === connection?.company_id)
        
        for (const key of companyKeys) {
          if (!key.webhook_url) continue
          if (!key.webhook_events?.includes('message.received')) continue

          const webhookPayload = {
            event: 'message.received',
            timestamp: new Date().toISOString(),
            data: {
              message_id: message.id,
              conversation_id: conversationData.id,
              contact_phone: telefone,
              contact_name: contactName,
              content: mensagem,
              message_type: tipo,
              media_url: mediaUrl || null,
              connection_id: connection?.id,
            }
          }

          try {
            console.log(`📤 [Webhook Relay] Enviando para: ${key.webhook_url}`)
            await fetch(key.webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
            })
            console.log(`✅ [Webhook Relay] Enviado com sucesso`)
          } catch (relayError: any) {
            console.error(`❌ [Webhook Relay] Erro: ${relayError.message}`)
          }
        }
      }
    } catch (relayError: any) {
      console.error('⚠️ Erro geral no webhook relay:', relayError.message)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message_id: message.id,
      conversation_id: conversationData.id,
      lead_id: leadData.id,
      flow_executed: flowExecuted,
      flow_responses: flowResponses.length,
      ai_assistant_used: aiAssistantUsed
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("❌ Erro no webhook:", err);
    return new Response(JSON.stringify({ 
      error: err instanceof Error ? err.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
