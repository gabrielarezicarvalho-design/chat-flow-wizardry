import { Node, Edge } from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';

export interface FlowContext {
  message: string;
  contact: {
    phone: string;
    name: string;
  };
  vars: Record<string, any>;
}

export interface ExecutionLog {
  nodeId: string;
  nodeType: string;
  status: 'running' | 'success' | 'error' | 'info' | 'waiting';
  message: string;
  timestamp: Date;
}

type LogCallback = (log: ExecutionLog) => void;

export const executeFlow = async (
  nodes: Node[],
  edges: Edge[],
  context: FlowContext,
  onLog?: LogCallback
): Promise<{ vars: Record<string, any>; logs: ExecutionLog[]; waiting?: boolean; waitingNodeId?: string }> => {
  const logs: ExecutionLog[] = [];
  let currentContext = { ...context };

  const log = (nodeId: string, nodeType: string, status: ExecutionLog['status'], message: string) => {
    const logEntry: ExecutionLog = { nodeId, nodeType, status, message, timestamp: new Date() };
    logs.push(logEntry);
    onLog?.(logEntry);
  };

  // Find start node
  const startNode = nodes.find((n) => n.type === 'start');
  if (!startNode) {
    throw new Error('Fluxo não possui bloco de Início');
  }

  let currentNode: Node | undefined = startNode;
  const visited = new Set<string>();
  const maxIterations = 100;
  let iterations = 0;

  while (currentNode && iterations < maxIterations) {
    iterations++;

    // Allow revisiting nodes for menu error handling (up to 3 times per node)
    const visitKey = `${currentNode.id}-${iterations}`;
    
    log(currentNode.id, currentNode.type || 'unknown', 'running', `Executando bloco: ${currentNode.data?.label || currentNode.type}`);

    try {
      const result = await executeNode(currentNode, currentContext, log, edges);
      currentContext.vars = { ...currentContext.vars, ...result.vars };

      // Check if waiting for user input
      if (result.waiting) {
        log(currentNode.id, currentNode.type || 'unknown', 'waiting', `Aguardando resposta do usuário...`);
        return { vars: currentContext.vars, logs, waiting: true, waitingNodeId: currentNode.id };
      }

      log(currentNode.id, currentNode.type || 'unknown', 'success', `Bloco executado com sucesso`);

      // Find next node
      const nextNodeId = result.nextNodeId || findNextNode(currentNode, edges, result.branch);
      if (!nextNodeId) {
        break;
      }

      currentNode = nodes.find((n) => n.id === nextNodeId);
    } catch (error: any) {
      log(currentNode.id, currentNode.type || 'unknown', 'error', `Erro: ${error.message}`);
      throw error;
    }
  }

  if (iterations >= maxIterations) {
    throw new Error('Limite de iterações excedido');
  }

  return { vars: currentContext.vars, logs };
};

interface NodeResult {
  vars: Record<string, any>;
  nextNodeId?: string;
  branch?: string;
  waiting?: boolean;
}

const executeNode = async (
  node: Node,
  context: FlowContext,
  log: (nodeId: string, nodeType: string, status: ExecutionLog['status'], message: string) => void,
  edges: Edge[]
): Promise<NodeResult> => {
  const data = node.data || {};

  switch (node.type) {
    case 'start':
      return { vars: {} };

    case 'message':
      return await executeMessageNode(data, context, log, node.id, edges, node);

    case 'condition':
      return await executeConditionNode(data, context, log, node.id);

    case 'code':
      return await executeCodeNode(data, context, log, node.id);

    case 'form':
      return await executeFormNode(data, context, log, node.id);

    case 'forward':
      return await executeForwardNode(data, context, log, node.id);

    case 'delay':
      return await executeDelayNode(data, context, log, node.id);

    case 'input':
      return await executeInputNode(data, context, log, node.id);

    case 'http':
      return await executeHttpNode(data, context, log, node.id);

    case 'tag':
      return await executeTagNode(data, context, log, node.id);

    case 'aiAgent':
      return await executeAiAgentNode(data, context, log, node.id);

    case 'smartForm':
      return await executeSmartFormNode(data, context, log, node.id);

    case 'sendForm':
      return await executeSendFormNode(data, context, log, node.id);

    default:
      return { vars: {} };
  }
};

const executeMessageNode = async (
  data: any,
  context: FlowContext,
  log: (nodeId: string, nodeType: string, status: ExecutionLog['status'], message: string) => void,
  nodeId: string,
  edges: Edge[],
  node: Node
): Promise<NodeResult> => {
  let content = data.content || data.label || '';
  const messageType = data.messageType || 'text';
  
  // Replace variables in content
  content = replaceVariables(content, context);

  // Handle menu types (buttons or list)
  if (messageType === 'buttons' || messageType === 'list') {
    const options = messageType === 'buttons' ? (data.buttons || []) : (data.listItems || []);
    const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    
    // Build menu message
    let menuMessage = content + '\n\n';
    options.forEach((opt: any, idx: number) => {
      const text = opt.text || opt.title || `Opção ${idx + 1}`;
      menuMessage += `${emojis[idx] || `${idx + 1}.`} ${text}\n`;
    });
    menuMessage += '\n_Responda com o número da opção desejada._';

    // Log the menu message
    log(nodeId, 'message', 'running', `MSG:${menuMessage}`);

    // Find which option the user selected
    const userInput = context.message.trim().toLowerCase();
    let selectedIndex = -1;

    // Try to match by number first
    const numericInput = parseInt(userInput, 10);
    if (!isNaN(numericInput) && numericInput >= 1 && numericInput <= options.length) {
      selectedIndex = numericInput - 1;
    } else {
      // Try to match by keywords or option text
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const optText = (opt.text || opt.title || '').toLowerCase();
        const keywords = (opt.keywords || '').split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);
        
        if (optText === userInput || keywords.includes(userInput)) {
          selectedIndex = i;
          break;
        }
      }
    }

    // If valid selection, follow the option's edge
    if (selectedIndex >= 0) {
      const selectedOption = options[selectedIndex];
      log(nodeId, 'message', 'info', `Opção selecionada: ${selectedIndex + 1} - ${selectedOption.text || selectedOption.title}`);
      
      // Reset error counter on success
      context.vars._menuErrorCount = 0;
      
      // Find edge connected to this option
      const optionEdge = edges.find(e => e.source === node.id && e.sourceHandle === `option-${selectedIndex}`);
      if (optionEdge) {
        return { 
          vars: { selectedOption: selectedIndex + 1, selectedText: selectedOption.text || selectedOption.title },
          nextNodeId: optionEdge.target
        };
      }
    }

    // Invalid input - handle error
    const errorMessage = data.errorMessage || '';
    const maxErrors = data.maxErrors || 3;
    const currentErrors = (context.vars._menuErrorCount || 0) + 1;
    
    log(nodeId, 'message', 'info', `Entrada inválida: "${userInput}" (erro ${currentErrors}/${maxErrors})`);
    
    context.vars._menuErrorCount = currentErrors;

    if (errorMessage) {
      // Show error message
      log(nodeId, 'message', 'running', `MSG:${errorMessage}`);
      
      // Check if max errors reached
      if (currentErrors >= maxErrors) {
        log(nodeId, 'message', 'info', `Máximo de erros atingido, seguindo pela saída de erro`);
        
        // Find error edge
        const errorEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'error');
        if (errorEdge) {
          context.vars._menuErrorCount = 0;
          return { 
            vars: { menuError: true, errorCount: currentErrors },
            nextNodeId: errorEdge.target
          };
        }
      }
    }

    // Stay on current node (in real flow, would wait for next message)
    return { 
      vars: { invalidInput: true, errorCount: currentErrors },
      waiting: true
    };
  }

  // Regular message (not menu)
  log(nodeId, 'message', 'running', `MSG:${content}`);

  return { vars: { lastMessage: content } };
};

const executeConditionNode = async (
  data: any,
  context: FlowContext,
  log: (nodeId: string, nodeType: string, status: ExecutionLog['status'], message: string) => void,
  nodeId: string
): Promise<{ vars: Record<string, any>; branch: string }> => {
  const conditionType = data.conditionType || 'custom';
  const { vars, message, contact } = context;
  
  let result = false;

  try {
    switch (conditionType) {
      case 'contains':
        const searchTexts = (data.searchText || '').split(',').map((t: string) => t.trim().toLowerCase());
        result = searchTexts.some((text: string) => message.toLowerCase().includes(text));
        log(nodeId, 'condition', 'info', `Verificando se mensagem contém: ${searchTexts.join(', ')} -> ${result}`);
        break;

      case 'equals':
        result = message.toLowerCase() === (data.expectedValue || '').toLowerCase();
        log(nodeId, 'condition', 'info', `Verificando se mensagem = "${data.expectedValue}" -> ${result}`);
        break;

      case 'variable':
        const varValue = vars[data.variableName];
        const compareValue = data.compareValue;
        switch (data.operator) {
          case 'equals': result = varValue == compareValue; break;
          case 'not_equals': result = varValue != compareValue; break;
          case 'greater': result = Number(varValue) > Number(compareValue); break;
          case 'less': result = Number(varValue) < Number(compareValue); break;
          case 'contains': result = String(varValue).includes(compareValue); break;
          case 'exists': result = varValue !== undefined && varValue !== null; break;
        }
        log(nodeId, 'condition', 'info', `Variável ${data.variableName} ${data.operator} ${compareValue} -> ${result}`);
        break;

      case 'businessHours':
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        // Mon-Fri 08:00-18:00
        result = day >= 1 && day <= 5 && hour >= 8 && hour < 18;
        log(nodeId, 'condition', 'info', `Horário comercial (${hour}h, dia ${day}) -> ${result}`);
        break;

      case 'custom':
      default:
        const condition = data.condition || 'false';
        // Security: Block dangerous patterns in custom conditions
        const dangerousConditionPatterns = [/\beval\b/i, /\bFunction\b/i, /\bfetch\b/i, /\bwindow\b/i, /\bdocument\b/i];
        const isDangerous = dangerousConditionPatterns.some(p => p.test(condition));
        if (isDangerous) {
          log(nodeId, 'condition', 'error', 'Condição contém padrão não permitido');
          result = false;
        } else {
          const evaluator = new Function('vars', 'message', 'contact', `"use strict"; return ${condition}`);
          result = evaluator(Object.freeze({ ...vars }), String(message), Object.freeze({ ...contact }));
        }
        log(nodeId, 'condition', 'info', `Condição customizada: ${condition} -> ${result}`);
    }
  } catch (e: any) {
    log(nodeId, 'condition', 'error', `Erro ao avaliar condição: ${e.message}`);
  }

  return { 
    vars: { conditionResult: result },
    branch: result ? 'yes' : 'no'
  };
};

const executeCodeNode = async (
  data: any,
  context: FlowContext,
  log: (nodeId: string, nodeType: string, status: ExecutionLog['status'], message: string) => void,
  nodeId: string
): Promise<{ vars: Record<string, any>; nextNodeId?: string }> => {
  const code = data.code || 'return { vars: {}, next: null };';
  
  // Security: Code size limit (10KB max)
  const MAX_CODE_SIZE = 10240;
  if (code.length > MAX_CODE_SIZE) {
    log(nodeId, 'code', 'error', `Código excede limite de ${MAX_CODE_SIZE} caracteres`);
    throw new Error('Código excede limite de tamanho permitido');
  }
  
  // Security: Block potentially dangerous patterns
  const dangerousPatterns = [
    /\beval\s*\(/i,
    /\bFunction\s*\(/i,
    /\bimport\s*\(/i,
    /\brequire\s*\(/i,
    /\bfetch\s*\(/i,
    /\bXMLHttpRequest\b/i,
    /\bWebSocket\b/i,
    /\blocalStorage\b/i,
    /\bsessionStorage\b/i,
    /\bdocument\b/i,
    /\bwindow\b/i,
    /\bglobalThis\b/i,
    /\bprocess\b/i,
    /\b__proto__\b/i,
    /\bconstructor\s*\[/i,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      log(nodeId, 'code', 'error', `Código contém padrão não permitido: ${pattern.source}`);
      throw new Error('Código contém operações não permitidas por segurança');
    }
  }
  
  try {
    const { vars, message, contact } = context;
    
    // Create safe utility functions available in code (no external access)
    const utils = {
      // Date/Time helpers
      now: () => new Date(),
      formatDate: (date: Date, format?: string) => {
        if (format === 'iso') return date.toISOString();
        if (format === 'time') return date.toLocaleTimeString('pt-BR');
        return date.toLocaleDateString('pt-BR');
      },
      isBusinessHours: () => {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        return day >= 1 && day <= 5 && hour >= 8 && hour < 18;
      },
      
      // String helpers
      capitalize: (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(),
      extractNumbers: (str: string) => str.replace(/\D/g, ''),
      formatPhone: (phone: string) => {
        const numbers = phone.replace(/\D/g, '');
        if (numbers.length === 11) {
          return `(${numbers.slice(0,2)}) ${numbers.slice(2,7)}-${numbers.slice(7)}`;
        }
        return phone;
      },
      
      // Validation helpers
      isValidEmail: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      isValidCPF: (cpf: string) => {
        const numbers = cpf.replace(/\D/g, '');
        return numbers.length === 11;
      },
      isValidPhone: (phone: string) => {
        const numbers = phone.replace(/\D/g, '');
        return numbers.length >= 10 && numbers.length <= 11;
      },
      
      // Math helpers
      random: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
      
      // Logging (safe)
      log: (msg: string) => log(nodeId, 'code', 'info', `[LOG] ${String(msg).substring(0, 500)}`),
    };
    
    // Execute in isolated context with no access to global scope
    const asyncFunction = new Function('vars', 'message', 'contact', 'utils', `
      "use strict";
      return (async () => {
        ${code}
      })();
    `);
    
    const result = await asyncFunction(
      Object.freeze({ ...vars }), // Frozen copy to prevent modification
      String(message), // Ensure string
      Object.freeze({ ...contact }), // Frozen copy
      Object.freeze(utils) // Frozen utils
    );
    
    // Validate result structure
    const safeVars = typeof result?.vars === 'object' && result.vars !== null 
      ? result.vars 
      : {};
    const safeNext = typeof result?.next === 'string' ? result.next : undefined;
    
    log(nodeId, 'code', 'info', `Código executado. Vars: ${JSON.stringify(safeVars)}`);
    
    return { 
      vars: safeVars,
      nextNodeId: safeNext
    };
  } catch (e: any) {
    log(nodeId, 'code', 'error', `Erro no código: ${e.message}`);
    throw new Error(`Erro no código: ${e.message}`);
  }
};

const executeFormNode = async (
  data: any,
  context: FlowContext,
  log: (nodeId: string, nodeType: string, status: ExecutionLog['status'], message: string) => void,
  nodeId: string
): Promise<{ vars: Record<string, any> }> => {
  const fields = data.fields || [];
  
  log(nodeId, 'form', 'running', `Coletando ${fields.length} campo(s) do formulário`);

  // In test mode, simulate form data
  const formData: Record<string, any> = {};
  fields.forEach((field: any) => {
    formData[field.name] = `[valor simulado para ${field.label}]`;
  });

  return { vars: { formData } };
};

const executeForwardNode = async (
  data: any,
  context: FlowContext,
  log: (nodeId: string, nodeType: string, status: ExecutionLog['status'], message: string) => void,
  nodeId: string
): Promise<{ vars: Record<string, any> }> => {
  const departmentId = data.departmentId;
  const departmentName = data.departmentName || departmentId;
  
  log(nodeId, 'forward', 'running', `Encaminhando para: ${departmentName}`);

  return { vars: { forwarded: true, departmentId, departmentName } };
};

const executeDelayNode = async (
  data: any,
  context: FlowContext,
  log: (nodeId: string, nodeType: string, status: ExecutionLog['status'], message: string) => void,
  nodeId: string
): Promise<{ vars: Record<string, any> }> => {
  const delay = parseInt(data.delay) || 1;
  const unit = data.delayUnit || 'seconds';
  
  let ms = delay * 1000;
  if (unit === 'minutes') ms = delay * 60 * 1000;
  if (unit === 'hours') ms = delay * 60 * 60 * 1000;
  
  log(nodeId, 'delay', 'info', `Aguardando ${delay} ${unit}...`);
  
  // In test mode, just simulate with a short delay
  await new Promise(resolve => setTimeout(resolve, Math.min(ms, 2000)));
  
  return { vars: {} };
};

const executeInputNode = async (
  data: any,
  context: FlowContext,
  log: (nodeId: string, nodeType: string, status: ExecutionLog['status'], message: string) => void,
  nodeId: string
): Promise<NodeResult> => {
  const variableName = data.variableName || 'input';
  const prompt = data.prompt || '';
  const validationType = data.validationType || 'any';
  
  if (prompt) {
    log(nodeId, 'input', 'running', `MSG:${replaceVariables(prompt, context)}`);
  }
  
  // Validate input
  const input = context.message.trim();
  let isValid = true;
  
  switch (validationType) {
    case 'email':
      isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
      break;
    case 'phone':
      isValid = /^\d{10,11}$/.test(input.replace(/\D/g, ''));
      break;
    case 'number':
      isValid = !isNaN(Number(input));
      break;
    case 'cpf':
      isValid = input.replace(/\D/g, '').length === 11;
      break;
  }
  
  if (!isValid && data.errorMessage) {
    log(nodeId, 'input', 'running', `MSG:${data.errorMessage}`);
    return { vars: {}, waiting: true };
  }
  
  log(nodeId, 'input', 'info', `Valor capturado: ${variableName} = "${input}"`);
  
  return { vars: { [variableName]: input } };
};

const executeHttpNode = async (
  data: any,
  context: FlowContext,
  log: (nodeId: string, nodeType: string, status: ExecutionLog['status'], message: string) => void,
  nodeId: string
): Promise<{ vars: Record<string, any>; branch?: string }> => {
  let url = replaceVariables(data.url || '', context);
  const method = data.method || 'GET';
  const responseVariable = data.responseVariable || 'httpResponse';
  
  // Replace system variables
  const SUPABASE_URL = 'https://lvldqyyzhlygwbgcdqcg.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2bGRxeXl6aGx5Z3diZ2NkcWNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MjU0OTUsImV4cCI6MjA3ODMwMTQ5NX0.ykwZak2uz1RX1DiU3zdHCizpmpcWcTavubc9by6eqkk';
  
  url = url.replace('{{SUPABASE_URL}}', SUPABASE_URL);
  
  // Process headers
  let headers: Record<string, string> = {};
  if (data.headers) {
    if (typeof data.headers === 'string') {
      try {
        headers = JSON.parse(data.headers);
      } catch (e) {
        log(nodeId, 'http', 'error', `Erro ao parsear headers: ${e}`);
      }
    } else {
      headers = { ...data.headers };
    }
  }
  
  // Replace variables in headers
  Object.keys(headers).forEach(key => {
    headers[key] = headers[key]
      .replace('{{SUPABASE_ANON_KEY}}', SUPABASE_ANON_KEY)
      .replace(/\{\{(\w+)\}\}/g, (_, varName) => context.vars[varName] || '');
  });
  
  // Process body
  let body: string | undefined;
  if (data.body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    body = replaceVariables(data.body, context);
    body = body.replace('{{SUPABASE_ANON_KEY}}', SUPABASE_ANON_KEY);
    
    // Also replace USER_ID if available
    if (context.vars.userId) {
      body = body.replace('{{USER_ID}}', context.vars.userId);
    }
  }
  
  log(nodeId, 'http', 'info', `${method} ${url}`);
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body
    });
    
    const responseData = await response.json().catch(() => null);
    
    if (response.ok) {
      log(nodeId, 'http', 'success', `Resposta: ${response.status} - ${JSON.stringify(responseData)?.substring(0, 200)}`);
      return { 
        vars: { 
          [responseVariable]: responseData,
          httpSuccess: true,
          httpStatus: response.status
        },
        branch: 'success'
      };
    } else {
      log(nodeId, 'http', 'error', `Erro: ${response.status} - ${JSON.stringify(responseData)}`);
      return { 
        vars: { 
          [responseVariable]: responseData,
          httpSuccess: false,
          httpStatus: response.status,
          httpError: responseData
        },
        branch: 'error'
      };
    }
  } catch (error: any) {
    log(nodeId, 'http', 'error', `Erro na requisição: ${error.message}`);
    return { 
      vars: { 
        httpSuccess: false,
        httpError: error.message
      },
      branch: 'error'
    };
  }
};

const executeTagNode = async (
  data: any,
  context: FlowContext,
  log: (nodeId: string, nodeType: string, status: ExecutionLog['status'], message: string) => void,
  nodeId: string
): Promise<{ vars: Record<string, any> }> => {
  const tagName = data.tagName || 'sem_tag';
  
  log(nodeId, 'tag', 'info', `Adicionando tag: ${tagName}`);
  
  return { vars: { addedTag: tagName } };
};

const executeAiAgentNode = async (
  data: any,
  context: FlowContext,
  log: (nodeId: string, nodeType: string, status: ExecutionLog['status'], message: string) => void,
  nodeId: string
): Promise<{ vars: Record<string, any>; branch?: string }> => {
  const agentName = data.agentName || 'Agente IA';
  
  log(nodeId, 'aiAgent', 'info', `Transferindo para agente IA: ${agentName}`);
  log(nodeId, 'aiAgent', 'running', `MSG:[IA ${agentName}] Olá! Sou o assistente virtual. Como posso ajudar?`);
  
  return { 
    vars: { aiAgentActive: true, aiAgentName: agentName },
    branch: 'success'
  };
};

const executeSmartFormNode = async (
  data: any,
  context: FlowContext,
  log: (nodeId: string, nodeType: string, status: ExecutionLog['status'], message: string) => void,
  nodeId: string
): Promise<{ vars: Record<string, any> }> => {
  const formName = data.formName || 'Formulário';
  const formLink = `https://ia.marketflowchat.com.br/formulario/test-${Date.now()}`;
  
  const message = data.messageBeforeLink || 
    `☐ *Fora do Horário*\n\nOlá! Estamos fora do horário comercial. Preencha o formulário abaixo!\n\n👇 Clique no link abaixo para preencher:\n${formLink}\n\n⏳ Responderemos assim que possível!`;
  
  log(nodeId, 'smartForm', 'running', message);
  
  return { vars: { smartFormSent: true, formLink } };
};

const executeSendFormNode = async (
  data: any,
  context: FlowContext,
  log: (nodeId: string, nodeType: string, status: ExecutionLog['status'], message: string) => void,
  nodeId: string
): Promise<{ vars: Record<string, any> }> => {
  const formLink = `https://ia.marketflowchat.com.br/formulario/form-${Date.now()}`;
  
  log(nodeId, 'sendForm', 'running', `MSG:📝 Preencha o formulário:\n${formLink}`);
  
  return { vars: { formSent: true, formLink } };
};

// Helper to replace variables in text
const replaceVariables = (text: string, context: FlowContext): string => {
  return text.replace(/\{\{(\w+)\}\}/g, (match: string, varName: string) => {
    if (varName === 'nome') return context.contact.name;
    if (varName === 'telefone') return context.contact.phone;
    if (varName === 'mensagem') return context.message;
    return context.vars[varName] ?? match;
  });
};

const findNextNode = (currentNode: Node, edges: Edge[], branch?: string): string | undefined => {
  const outgoingEdges = edges.filter((e) => e.source === currentNode.id);

  if (branch && outgoingEdges.length > 0) {
    const branchEdge = outgoingEdges.find((e) => e.sourceHandle === branch);
    if (branchEdge) return branchEdge.target;
  }

  // Find default edge (no specific handle or first available)
  const defaultEdge = outgoingEdges.find((e) => !e.sourceHandle || e.sourceHandle === 'default') || outgoingEdges[0];
  
  return defaultEdge?.target;
};