import { Node, Edge } from '@xyflow/react';

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: Node[];
  edges: Edge[];
}

export const flowTemplates: FlowTemplate[] = [
  // ========================================
  // 🏠 MENU PRINCIPAL COMPLETO
  // ========================================
  {
    id: 'menu-principal',
    name: 'Menu Principal Profissional',
    description: 'Menu completo com verificação de horário comercial, regras de erro e submenus',
    category: 'atendimento',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 400, y: 50 },
        data: { label: 'Início' }
      },
      // Verificação de horário
      {
        id: 'code-horario',
        type: 'code',
        position: { x: 400, y: 150 },
        data: { 
          label: 'Verificar Horário',
          code: `// Verifica horário comercial (08:00-12:00 e 13:30-18:00)
const now = new Date();
const hour = now.getHours();
const minute = now.getMinutes();
const dayOfWeek = now.getDay(); // 0=Dom, 1=Seg...

// Segunda a Sexta
const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

// Turno manhã: 08:00-12:00
const isMorning = (hour >= 8 && hour < 12);

// Turno tarde: 13:30-18:00
const isAfternoon = (hour > 13 || (hour === 13 && minute >= 30)) && hour < 18;

const dentroHorario = isWeekday && (isMorning || isAfternoon);

return { dentroHorario, horaAtual: \`\${hour}:\${minute}\` };`
        }
      },
      {
        id: 'cond-horario',
        type: 'condition',
        position: { x: 400, y: 280 },
        data: { 
          label: 'Horário Comercial?',
          condition: 'vars.dentroHorario === true'
        }
      },
      // DENTRO DO HORÁRIO - Menu principal
      {
        id: 'msg-boasvindas',
        type: 'message',
        position: { x: 150, y: 400 },
        data: { 
          label: 'Boas-vindas',
          messageType: 'text',
          content: `Olá! 👋 Seja bem-vindo ao atendimento da *MarketFlow*.

Como posso te ajudar hoje?

1️⃣ Suporte Técnico
2️⃣ Financeiro
3️⃣ Comercial
4️⃣ Atualização de Dados
5️⃣ Cancelamento
6️⃣ Falar com Atendente

_Digite o número da opção desejada._`
        }
      },
      {
        id: 'input-opcao',
        type: 'input',
        position: { x: 150, y: 550 },
        data: { 
          label: 'Capturar Opção',
          promptMessage: '',
          variableName: 'opcao_menu',
          validationType: 'any'
        }
      },
      // Condições para cada opção
      {
        id: 'cond-suporte',
        type: 'condition',
        position: { x: -100, y: 700 },
        data: { 
          label: 'Opção 1?',
          condition: 'vars.opcao_menu === "1"'
        }
      },
      {
        id: 'cond-financeiro',
        type: 'condition',
        position: { x: 100, y: 700 },
        data: { 
          label: 'Opção 2?',
          condition: 'vars.opcao_menu === "2"'
        }
      },
      {
        id: 'cond-comercial',
        type: 'condition',
        position: { x: 300, y: 700 },
        data: { 
          label: 'Opção 3?',
          condition: 'vars.opcao_menu === "3"'
        }
      },
      {
        id: 'cond-atendente',
        type: 'condition',
        position: { x: 500, y: 700 },
        data: { 
          label: 'Opção 6?',
          condition: 'vars.opcao_menu === "6"'
        }
      },
      // Respostas
      {
        id: 'msg-suporte-menu',
        type: 'message',
        position: { x: -200, y: 850 },
        data: { 
          label: 'Menu Suporte',
          messageType: 'text',
          content: `🔧 *Suporte Técnico*

Como posso ajudar?

1️⃣ Problema no WhatsApp
2️⃣ Problema em Envio de Campanhas
3️⃣ Robô não responde
4️⃣ Integrações/API
5️⃣ Voltar ao menu principal

_Digite o número da opção._`
        }
      },
      {
        id: 'msg-financeiro-menu',
        type: 'message',
        position: { x: 50, y: 850 },
        data: { 
          label: 'Menu Financeiro',
          messageType: 'text',
          content: `💰 *Financeiro*

Como posso ajudar?

1️⃣ Boletos
2️⃣ Nota Fiscal
3️⃣ Forma de Pagamento
4️⃣ Renegociação
5️⃣ Voltar ao menu principal

_Digite o número da opção._`
        }
      },
      {
        id: 'forward-comercial',
        type: 'forward',
        position: { x: 300, y: 850 },
        data: { 
          label: 'Comercial',
          department: 'Comercial'
        }
      },
      {
        id: 'forward-atendente',
        type: 'forward',
        position: { x: 500, y: 850 },
        data: { 
          label: 'Atendente',
          department: 'Atendimento'
        }
      },
      // Fallback - opção inválida
      {
        id: 'msg-fallback',
        type: 'message',
        position: { x: 700, y: 700 },
        data: { 
          label: 'Opção Inválida',
          messageType: 'text',
          content: `Não consegui entender 😕

Por favor, escolha uma das opções acima digitando *somente o número*.`
        }
      },
      // FORA DO HORÁRIO - Smart Form
      {
        id: 'smartform-fora',
        type: 'smartForm',
        position: { x: 650, y: 400 },
        data: { 
          label: 'Formulário Fora Horário',
          checkBusinessHours: false,
          messageBeforeLink: `🕐 *Fora do Horário*

Olá! Nosso atendimento está encerrado no momento.
Mas você pode deixar seu pedido aqui 👇`
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'code-horario' },
      { id: 'e2', source: 'code-horario', target: 'cond-horario' },
      { id: 'e3', source: 'cond-horario', target: 'msg-boasvindas', sourceHandle: 'yes' },
      { id: 'e4', source: 'cond-horario', target: 'smartform-fora', sourceHandle: 'no' },
      { id: 'e5', source: 'msg-boasvindas', target: 'input-opcao' },
      { id: 'e6', source: 'input-opcao', target: 'cond-suporte' },
      { id: 'e7', source: 'cond-suporte', target: 'msg-suporte-menu', sourceHandle: 'yes' },
      { id: 'e8', source: 'cond-suporte', target: 'cond-financeiro', sourceHandle: 'no' },
      { id: 'e9', source: 'cond-financeiro', target: 'msg-financeiro-menu', sourceHandle: 'yes' },
      { id: 'e10', source: 'cond-financeiro', target: 'cond-comercial', sourceHandle: 'no' },
      { id: 'e11', source: 'cond-comercial', target: 'forward-comercial', sourceHandle: 'yes' },
      { id: 'e12', source: 'cond-comercial', target: 'cond-atendente', sourceHandle: 'no' },
      { id: 'e13', source: 'cond-atendente', target: 'forward-atendente', sourceHandle: 'yes' },
      { id: 'e14', source: 'cond-atendente', target: 'msg-fallback', sourceHandle: 'no' }
    ]
  },

  // ========================================
  // 🎯 MENU COM REGRAS DE ERRO (3 TENTATIVAS)
  // ========================================
  {
    id: 'menu-com-erros',
    name: 'Menu com Regras de Erro',
    description: 'Após 3 erros seguidos, transfere automaticamente para atendente',
    category: 'atendimento',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: { label: 'Início' }
      },
      {
        id: 'code-init',
        type: 'code',
        position: { x: 250, y: 150 },
        data: { 
          label: 'Iniciar Contador',
          code: `// Inicializa contador de erros
return { erros: 0, maxErros: 3 };`
        }
      },
      {
        id: 'msg-menu',
        type: 'message',
        position: { x: 250, y: 280 },
        data: { 
          label: 'Menu Principal',
          messageType: 'text',
          content: `Olá! 👋 Bem-vindo(a)!

Como posso ajudar?

1️⃣ Informações
2️⃣ Suporte
3️⃣ Falar com Atendente

_Responda com o número da opção._`
        }
      },
      {
        id: 'input-1',
        type: 'input',
        position: { x: 250, y: 420 },
        data: { 
          label: 'Capturar Opção',
          promptMessage: '',
          variableName: 'resposta',
          validationType: 'any'
        }
      },
      {
        id: 'cond-op1',
        type: 'condition',
        position: { x: 50, y: 560 },
        data: { 
          label: 'Opção 1?',
          condition: 'vars.resposta === "1"'
        }
      },
      {
        id: 'cond-op2',
        type: 'condition',
        position: { x: 250, y: 560 },
        data: { 
          label: 'Opção 2?',
          condition: 'vars.resposta === "2"'
        }
      },
      {
        id: 'cond-op3',
        type: 'condition',
        position: { x: 450, y: 560 },
        data: { 
          label: 'Opção 3?',
          condition: 'vars.resposta === "3"'
        }
      },
      // Respostas válidas
      {
        id: 'msg-info',
        type: 'message',
        position: { x: -100, y: 700 },
        data: { 
          label: 'Informações',
          messageType: 'text',
          content: `📋 *Informações*

Horário: Seg-Sex 08h às 18h
Site: www.exemplo.com
E-mail: contato@exemplo.com

Foi um prazer ajudar! 😊`
        }
      },
      {
        id: 'forward-suporte',
        type: 'forward',
        position: { x: 200, y: 700 },
        data: { 
          label: 'Suporte',
          department: 'Suporte Técnico'
        }
      },
      {
        id: 'forward-atendente',
        type: 'forward',
        position: { x: 450, y: 700 },
        data: { 
          label: 'Atendente',
          department: 'Atendimento Geral'
        }
      },
      // ERRO - Incrementa contador
      {
        id: 'code-erro',
        type: 'code',
        position: { x: 650, y: 560 },
        data: { 
          label: 'Contar Erro',
          code: `// Incrementa contador de erros
const erros = (vars.erros || 0) + 1;
return { erros, maxErros: 3 };`
        }
      },
      {
        id: 'cond-max-erros',
        type: 'condition',
        position: { x: 650, y: 700 },
        data: { 
          label: '3 Erros?',
          condition: 'vars.erros >= vars.maxErros'
        }
      },
      {
        id: 'msg-erro-simples',
        type: 'message',
        position: { x: 500, y: 850 },
        data: { 
          label: 'Erro Simples',
          messageType: 'text',
          content: `Não consegui entender 😕

Por favor, escolha uma das opções acima digitando *somente o número*.`
        }
      },
      {
        id: 'msg-erro-max',
        type: 'message',
        position: { x: 800, y: 850 },
        data: { 
          label: 'Máximo de Erros',
          messageType: 'text',
          content: `Percebi que estamos com dificuldade para continuar 😔

Vou encaminhar você para um atendente. ⏳`
        }
      },
      {
        id: 'forward-erro-max',
        type: 'forward',
        position: { x: 800, y: 980 },
        data: { 
          label: 'Transferir',
          department: 'Atendimento Geral'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'code-init' },
      { id: 'e2', source: 'code-init', target: 'msg-menu' },
      { id: 'e3', source: 'msg-menu', target: 'input-1' },
      { id: 'e4', source: 'input-1', target: 'cond-op1' },
      { id: 'e5', source: 'cond-op1', target: 'msg-info', sourceHandle: 'yes' },
      { id: 'e6', source: 'cond-op1', target: 'cond-op2', sourceHandle: 'no' },
      { id: 'e7', source: 'cond-op2', target: 'forward-suporte', sourceHandle: 'yes' },
      { id: 'e8', source: 'cond-op2', target: 'cond-op3', sourceHandle: 'no' },
      { id: 'e9', source: 'cond-op3', target: 'forward-atendente', sourceHandle: 'yes' },
      { id: 'e10', source: 'cond-op3', target: 'code-erro', sourceHandle: 'no' },
      { id: 'e11', source: 'code-erro', target: 'cond-max-erros' },
      { id: 'e12', source: 'cond-max-erros', target: 'msg-erro-max', sourceHandle: 'yes' },
      { id: 'e13', source: 'cond-max-erros', target: 'msg-erro-simples', sourceHandle: 'no' },
      { id: 'e14', source: 'msg-erro-max', target: 'forward-erro-max' },
      { id: 'e15', source: 'msg-erro-simples', target: 'msg-menu' }
    ]
  },

  // ========================================
  // 🔧 SUPORTE TÉCNICO COMPLETO
  // ========================================
  {
    id: 'suporte-completo',
    name: 'Suporte Técnico Completo',
    description: 'Triagem completa de suporte com coleta de informações e encaminhamento',
    category: 'suporte',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: { label: 'Início' }
      },
      {
        id: 'msg-1',
        type: 'message',
        position: { x: 250, y: 150 },
        data: { 
          label: 'Menu Suporte',
          messageType: 'text',
          content: `🔧 *Suporte Técnico*

Olá! Como posso ajudar?

1️⃣ Problema no WhatsApp
2️⃣ Problema em Envio de Campanhas
3️⃣ Robô não responde
4️⃣ Integrações/API
5️⃣ Outro problema
6️⃣ Voltar ao menu principal`
        }
      },
      {
        id: 'input-1',
        type: 'input',
        position: { x: 250, y: 300 },
        data: { 
          label: 'Capturar Opção',
          promptMessage: '',
          variableName: 'opcao_suporte',
          validationType: 'any'
        }
      },
      {
        id: 'cond-whatsapp',
        type: 'condition',
        position: { x: 50, y: 450 },
        data: { 
          label: 'WhatsApp?',
          condition: 'vars.opcao_suporte === "1"'
        }
      },
      {
        id: 'cond-campanhas',
        type: 'condition',
        position: { x: 250, y: 450 },
        data: { 
          label: 'Campanhas?',
          condition: 'vars.opcao_suporte === "2"'
        }
      },
      {
        id: 'cond-robo',
        type: 'condition',
        position: { x: 450, y: 450 },
        data: { 
          label: 'Robô?',
          condition: 'vars.opcao_suporte === "3"'
        }
      },
      // Coleta de dados para suporte
      {
        id: 'msg-coleta',
        type: 'message',
        position: { x: 250, y: 600 },
        data: { 
          label: 'Coletar Info',
          messageType: 'text',
          content: `Entendi! Para agilizar seu atendimento, preciso de algumas informações.`
        }
      },
      {
        id: 'input-nome',
        type: 'input',
        position: { x: 250, y: 720 },
        data: { 
          label: 'Nome',
          promptMessage: 'Qual é o seu nome?',
          variableName: 'nome',
          validationType: 'any'
        }
      },
      {
        id: 'input-problema',
        type: 'input',
        position: { x: 250, y: 850 },
        data: { 
          label: 'Problema',
          promptMessage: 'Descreva brevemente o problema:',
          variableName: 'descricao_problema',
          validationType: 'any'
        }
      },
      {
        id: 'msg-confirmacao',
        type: 'message',
        position: { x: 250, y: 980 },
        data: { 
          label: 'Confirmação',
          messageType: 'text',
          content: `Obrigado, {{nome}}! 📝

Recebemos sua solicitação:
"{{descricao_problema}}"

Um técnico entrará em contato em breve.`
        }
      },
      {
        id: 'forward-tecnico',
        type: 'forward',
        position: { x: 250, y: 1100 },
        data: { 
          label: 'Encaminhar',
          department: 'Suporte Técnico'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'msg-1' },
      { id: 'e2', source: 'msg-1', target: 'input-1' },
      { id: 'e3', source: 'input-1', target: 'cond-whatsapp' },
      { id: 'e4', source: 'cond-whatsapp', target: 'msg-coleta', sourceHandle: 'yes' },
      { id: 'e5', source: 'cond-whatsapp', target: 'cond-campanhas', sourceHandle: 'no' },
      { id: 'e6', source: 'cond-campanhas', target: 'msg-coleta', sourceHandle: 'yes' },
      { id: 'e7', source: 'cond-campanhas', target: 'cond-robo', sourceHandle: 'no' },
      { id: 'e8', source: 'cond-robo', target: 'msg-coleta', sourceHandle: 'yes' },
      { id: 'e9', source: 'cond-robo', target: 'msg-coleta', sourceHandle: 'no' },
      { id: 'e10', source: 'msg-coleta', target: 'input-nome' },
      { id: 'e11', source: 'input-nome', target: 'input-problema' },
      { id: 'e12', source: 'input-problema', target: 'msg-confirmacao' },
      { id: 'e13', source: 'msg-confirmacao', target: 'forward-tecnico' }
    ]
  },

  // ========================================
  // 💰 FINANCEIRO COMPLETO
  // ========================================
  {
    id: 'financeiro-completo',
    name: 'Financeiro Completo',
    description: 'Menu financeiro com opções de boleto, NF, pagamento e renegociação',
    category: 'atendimento',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: { label: 'Início' }
      },
      {
        id: 'msg-menu',
        type: 'message',
        position: { x: 250, y: 150 },
        data: { 
          label: 'Menu Financeiro',
          messageType: 'text',
          content: `💰 *Financeiro*

Como posso ajudar?

1️⃣ 2ª Via de Boleto
2️⃣ Solicitar Nota Fiscal
3️⃣ Alterar Forma de Pagamento
4️⃣ Renegociação de Dívida
5️⃣ Falar com Atendente

_Digite o número da opção._`
        }
      },
      {
        id: 'input-opcao',
        type: 'input',
        position: { x: 250, y: 300 },
        data: { 
          label: 'Capturar Opção',
          promptMessage: '',
          variableName: 'opcao_fin',
          validationType: 'any'
        }
      },
      {
        id: 'cond-boleto',
        type: 'condition',
        position: { x: 50, y: 450 },
        data: { 
          label: 'Boleto?',
          condition: 'vars.opcao_fin === "1"'
        }
      },
      {
        id: 'cond-nf',
        type: 'condition',
        position: { x: 250, y: 450 },
        data: { 
          label: 'NF?',
          condition: 'vars.opcao_fin === "2"'
        }
      },
      {
        id: 'cond-pagto',
        type: 'condition',
        position: { x: 450, y: 450 },
        data: { 
          label: 'Pagamento?',
          condition: 'vars.opcao_fin === "3"'
        }
      },
      // Respostas
      {
        id: 'input-cpf-boleto',
        type: 'input',
        position: { x: -100, y: 600 },
        data: { 
          label: 'CPF/CNPJ',
          promptMessage: 'Para gerar a 2ª via, informe seu CPF ou CNPJ:',
          variableName: 'cpf_cnpj',
          validationType: 'any'
        }
      },
      {
        id: 'msg-boleto',
        type: 'message',
        position: { x: -100, y: 750 },
        data: { 
          label: 'Boleto Gerado',
          messageType: 'text',
          content: `✅ Boleto solicitado!

Estamos gerando a 2ª via para o documento {{cpf_cnpj}}.

Você receberá o boleto por aqui em instantes.

_Em caso de dúvidas, estamos à disposição!_`
        }
      },
      {
        id: 'msg-nf',
        type: 'message',
        position: { x: 200, y: 600 },
        data: { 
          label: 'Nota Fiscal',
          messageType: 'text',
          content: `📄 *Nota Fiscal*

Para solicitar sua NF, envie:
• Nome ou Razão Social
• CPF ou CNPJ
• Endereço completo

Nosso time irá gerar e enviar por e-mail.`
        }
      },
      {
        id: 'forward-nf',
        type: 'forward',
        position: { x: 200, y: 750 },
        data: { 
          label: 'Financeiro',
          department: 'Financeiro'
        }
      },
      {
        id: 'msg-pagto',
        type: 'message',
        position: { x: 450, y: 600 },
        data: { 
          label: 'Formas Pagamento',
          messageType: 'text',
          content: `💳 *Formas de Pagamento*

Atualmente aceitamos:
• PIX (5% desconto)
• Cartão de crédito até 12x
• Boleto bancário
• Transferência bancária

Para alterar sua forma de pagamento, um atendente irá te auxiliar.`
        }
      },
      {
        id: 'forward-pagto',
        type: 'forward',
        position: { x: 450, y: 750 },
        data: { 
          label: 'Financeiro',
          department: 'Financeiro'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'msg-menu' },
      { id: 'e2', source: 'msg-menu', target: 'input-opcao' },
      { id: 'e3', source: 'input-opcao', target: 'cond-boleto' },
      { id: 'e4', source: 'cond-boleto', target: 'input-cpf-boleto', sourceHandle: 'yes' },
      { id: 'e5', source: 'cond-boleto', target: 'cond-nf', sourceHandle: 'no' },
      { id: 'e6', source: 'cond-nf', target: 'msg-nf', sourceHandle: 'yes' },
      { id: 'e7', source: 'cond-nf', target: 'cond-pagto', sourceHandle: 'no' },
      { id: 'e8', source: 'cond-pagto', target: 'msg-pagto', sourceHandle: 'yes' },
      { id: 'e9', source: 'cond-pagto', target: 'forward-nf', sourceHandle: 'no' },
      { id: 'e10', source: 'input-cpf-boleto', target: 'msg-boleto' },
      { id: 'e11', source: 'msg-nf', target: 'forward-nf' },
      { id: 'e12', source: 'msg-pagto', target: 'forward-pagto' }
    ]
  },

  // ========================================
  // 🕐 HORÁRIO COMERCIAL + FORA DO HORÁRIO
  // ========================================
  {
    id: 'horario-comercial',
    name: 'Verificação de Horário',
    description: 'Verifica horário comercial e redireciona para menu ou formulário',
    category: 'atendimento',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: { label: 'Início' }
      },
      {
        id: 'code-check',
        type: 'code',
        position: { x: 250, y: 150 },
        data: { 
          label: 'Verificar Horário',
          code: `// Horário comercial: Seg-Sex 08:00-12:00 e 13:30-18:00
const now = new Date();
const hour = now.getHours();
const minute = now.getMinutes();
const day = now.getDay();

const isWeekday = day >= 1 && day <= 5;
const manha = hour >= 8 && hour < 12;
const tarde = (hour === 13 && minute >= 30) || (hour > 13 && hour < 18);

return { dentroHorario: isWeekday && (manha || tarde) };`
        }
      },
      {
        id: 'cond-horario',
        type: 'condition',
        position: { x: 250, y: 300 },
        data: { 
          label: 'Dentro do Horário?',
          condition: 'vars.dentroHorario === true'
        }
      },
      // DENTRO DO HORÁRIO
      {
        id: 'msg-dentro',
        type: 'message',
        position: { x: 50, y: 450 },
        data: { 
          label: 'Boas-vindas',
          messageType: 'text',
          content: `Olá 👋! Agora estamos em horário de atendimento.

Como posso ajudar você hoje?

1️⃣ Suporte
2️⃣ Financeiro
3️⃣ Comercial
4️⃣ Falar com humano

_Digite o número da opção._`
        }
      },
      {
        id: 'input-opcao',
        type: 'input',
        position: { x: 50, y: 600 },
        data: { 
          label: 'Capturar Opção',
          promptMessage: '',
          variableName: 'opcao',
          validationType: 'any'
        }
      },
      {
        id: 'cond-suporte',
        type: 'condition',
        position: { x: -100, y: 750 },
        data: { 
          label: 'Suporte?',
          condition: 'vars.opcao === "1"'
        }
      },
      {
        id: 'forward-suporte',
        type: 'forward',
        position: { x: -200, y: 900 },
        data: { 
          label: 'Suporte',
          department: 'Suporte'
        }
      },
      {
        id: 'forward-financeiro',
        type: 'forward',
        position: { x: 0, y: 900 },
        data: { 
          label: 'Financeiro',
          department: 'Financeiro'
        }
      },
      // FORA DO HORÁRIO
      {
        id: 'msg-fora',
        type: 'message',
        position: { x: 450, y: 450 },
        data: { 
          label: 'Fora do Horário',
          messageType: 'text',
          content: `🕐 *Fora do Horário*

Olá! Nosso atendimento está encerrado no momento.
Horário: Seg-Sex 08h-12h e 13h30-18h

Mas você pode deixar seu pedido aqui 👇`
        }
      },
      {
        id: 'smartform-fora',
        type: 'smartForm',
        position: { x: 450, y: 600 },
        data: { 
          label: 'Formulário',
          checkBusinessHours: false
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'code-check' },
      { id: 'e2', source: 'code-check', target: 'cond-horario' },
      { id: 'e3', source: 'cond-horario', target: 'msg-dentro', sourceHandle: 'yes' },
      { id: 'e4', source: 'cond-horario', target: 'msg-fora', sourceHandle: 'no' },
      { id: 'e5', source: 'msg-dentro', target: 'input-opcao' },
      { id: 'e6', source: 'input-opcao', target: 'cond-suporte' },
      { id: 'e7', source: 'cond-suporte', target: 'forward-suporte', sourceHandle: 'yes' },
      { id: 'e8', source: 'cond-suporte', target: 'forward-financeiro', sourceHandle: 'no' },
      { id: 'e9', source: 'msg-fora', target: 'smartform-fora' }
    ]
  },

  // ========================================
  // TEMPLATES ORIGINAIS (mantidos)
  // ========================================
  {
    id: 'welcome',
    name: 'Boas-vindas Simples',
    description: 'Mensagem de boas-vindas com menu de opções básico',
    category: 'básico',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: { label: 'Início' }
      },
      {
        id: 'msg-1',
        type: 'message',
        position: { x: 250, y: 150 },
        data: { 
          label: 'Boas-vindas',
          messageType: 'text',
          content: 'Olá! 👋 Bem-vindo(a) à nossa empresa!\n\nComo posso ajudar você hoje?\n\n1️⃣ Informações sobre produtos\n2️⃣ Suporte técnico\n3️⃣ Falar com atendente'
        }
      },
      {
        id: 'input-1',
        type: 'input',
        position: { x: 250, y: 280 },
        data: { 
          label: 'Capturar opção',
          promptMessage: '',
          variableName: 'opcao',
          validationType: 'any'
        }
      },
      {
        id: 'cond-1',
        type: 'condition',
        position: { x: 250, y: 400 },
        data: { 
          label: 'Verificar opção',
          condition: 'vars.opcao === "1"'
        }
      },
      {
        id: 'msg-2',
        type: 'message',
        position: { x: 50, y: 520 },
        data: { 
          label: 'Produtos',
          messageType: 'text',
          content: '📦 Nossos produtos:\n\n• Produto A - R$ 99,90\n• Produto B - R$ 149,90\n• Produto C - R$ 199,90\n\nDigite o nome do produto para mais detalhes!'
        }
      },
      {
        id: 'forward-1',
        type: 'forward',
        position: { x: 450, y: 520 },
        data: { 
          label: 'Atendente',
          department: 'Atendimento Geral'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'msg-1' },
      { id: 'e2', source: 'msg-1', target: 'input-1' },
      { id: 'e3', source: 'input-1', target: 'cond-1' },
      { id: 'e4', source: 'cond-1', target: 'msg-2', sourceHandle: 'yes' },
      { id: 'e5', source: 'cond-1', target: 'forward-1', sourceHandle: 'no' }
    ]
  },
  {
    id: 'faq',
    name: 'FAQ Automático',
    description: 'Respostas automáticas para perguntas frequentes',
    category: 'suporte',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: { label: 'Início' }
      },
      {
        id: 'msg-1',
        type: 'message',
        position: { x: 250, y: 150 },
        data: { 
          label: 'Menu FAQ',
          messageType: 'text',
          content: '❓ *Perguntas Frequentes*\n\nDigite uma palavra-chave:\n• *horário* - Horário de funcionamento\n• *pagamento* - Formas de pagamento\n• *entrega* - Prazo de entrega\n• *troca* - Política de trocas\n• *atendente* - Falar com humano'
        }
      },
      {
        id: 'input-1',
        type: 'input',
        position: { x: 250, y: 280 },
        data: { 
          label: 'Capturar pergunta',
          promptMessage: '',
          variableName: 'pergunta',
          validationType: 'any'
        }
      },
      {
        id: 'cond-1',
        type: 'condition',
        position: { x: 250, y: 400 },
        data: { 
          label: 'Horário?',
          condition: 'vars.pergunta.toLowerCase().includes("horário") || vars.pergunta.toLowerCase().includes("horario")'
        }
      },
      {
        id: 'msg-2',
        type: 'message',
        position: { x: 50, y: 520 },
        data: { 
          label: 'Resp. Horário',
          messageType: 'text',
          content: '🕐 *Horário de Funcionamento*\n\nSegunda a Sexta: 8h às 18h\nSábado: 8h às 12h\nDomingo e Feriados: Fechado'
        }
      },
      {
        id: 'cond-2',
        type: 'condition',
        position: { x: 450, y: 520 },
        data: { 
          label: 'Pagamento?',
          condition: 'vars.pergunta.toLowerCase().includes("pagamento")'
        }
      },
      {
        id: 'msg-3',
        type: 'message',
        position: { x: 350, y: 650 },
        data: { 
          label: 'Resp. Pagamento',
          messageType: 'text',
          content: '💳 *Formas de Pagamento*\n\n• PIX (5% desconto)\n• Cartão de crédito até 12x\n• Boleto bancário\n• Transferência bancária'
        }
      },
      {
        id: 'forward-1',
        type: 'forward',
        position: { x: 550, y: 650 },
        data: { 
          label: 'Atendente',
          department: 'Suporte'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'msg-1' },
      { id: 'e2', source: 'msg-1', target: 'input-1' },
      { id: 'e3', source: 'input-1', target: 'cond-1' },
      { id: 'e4', source: 'cond-1', target: 'msg-2', sourceHandle: 'yes' },
      { id: 'e5', source: 'cond-1', target: 'cond-2', sourceHandle: 'no' },
      { id: 'e6', source: 'cond-2', target: 'msg-3', sourceHandle: 'yes' },
      { id: 'e7', source: 'cond-2', target: 'forward-1', sourceHandle: 'no' }
    ]
  },
  {
    id: 'sales',
    name: 'Funil de Vendas',
    description: 'Qualificação de leads e apresentação de produtos',
    category: 'vendas',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: { label: 'Início' }
      },
      {
        id: 'msg-1',
        type: 'message',
        position: { x: 250, y: 150 },
        data: { 
          label: 'Apresentação',
          messageType: 'text',
          content: '🎯 Olá! Que bom ter você aqui!\n\nTemos soluções incríveis para o seu negócio.\n\nPosso te fazer algumas perguntas rápidas?'
        }
      },
      {
        id: 'input-nome',
        type: 'input',
        position: { x: 250, y: 280 },
        data: { 
          label: 'Nome',
          promptMessage: 'Qual é o seu nome?',
          variableName: 'nome',
          validationType: 'any'
        }
      },
      {
        id: 'input-empresa',
        type: 'input',
        position: { x: 250, y: 400 },
        data: { 
          label: 'Empresa',
          promptMessage: 'E o nome da sua empresa?',
          variableName: 'empresa',
          validationType: 'any'
        }
      },
      {
        id: 'tag-1',
        type: 'tag',
        position: { x: 250, y: 520 },
        data: { 
          label: 'Lead Qualificado',
          tagName: 'lead-qualificado'
        }
      },
      {
        id: 'msg-2',
        type: 'message',
        position: { x: 250, y: 640 },
        data: { 
          label: 'Proposta',
          messageType: 'text',
          content: 'Perfeito, {{nome}}! 🚀\n\nA {{empresa}} está no lugar certo.\n\nVou conectar você com nosso especialista!'
        }
      },
      {
        id: 'forward-1',
        type: 'forward',
        position: { x: 250, y: 760 },
        data: { 
          label: 'Vendedor',
          department: 'Comercial'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'msg-1' },
      { id: 'e2', source: 'msg-1', target: 'input-nome' },
      { id: 'e3', source: 'input-nome', target: 'input-empresa' },
      { id: 'e4', source: 'input-empresa', target: 'tag-1' },
      { id: 'e5', source: 'tag-1', target: 'msg-2' },
      { id: 'e6', source: 'msg-2', target: 'forward-1' }
    ]
  },
  {
    id: 'nps',
    name: 'Pesquisa NPS',
    description: 'Coleta de feedback e Net Promoter Score',
    category: 'feedback',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: { label: 'Início' }
      },
      {
        id: 'msg-1',
        type: 'message',
        position: { x: 250, y: 150 },
        data: { 
          label: 'Intro NPS',
          messageType: 'text',
          content: '⭐ *Pesquisa de Satisfação*\n\nOlá! Sua opinião é muito importante para nós.\n\nPode nos ajudar respondendo uma pesquisa rápida?'
        }
      },
      {
        id: 'input-nota',
        type: 'input',
        position: { x: 250, y: 280 },
        data: { 
          label: 'Nota NPS',
          promptMessage: 'De 0 a 10, o quanto você nos recomendaria?',
          variableName: 'nota',
          validationType: 'number',
          errorMessage: 'Por favor, digite apenas um número de 0 a 10'
        }
      },
      {
        id: 'cond-1',
        type: 'condition',
        position: { x: 250, y: 400 },
        data: { 
          label: 'Promotor?',
          condition: 'Number(vars.nota) >= 9'
        }
      },
      {
        id: 'msg-2',
        type: 'message',
        position: { x: 50, y: 520 },
        data: { 
          label: 'Agradecimento',
          messageType: 'text',
          content: '🎉 Uau! Ficamos muito felizes!\n\nObrigado pela nota {{nota}}! Seu feedback nos motiva.'
        }
      },
      {
        id: 'cond-2',
        type: 'condition',
        position: { x: 450, y: 520 },
        data: { 
          label: 'Detrator?',
          condition: 'Number(vars.nota) <= 6'
        }
      },
      {
        id: 'msg-3',
        type: 'message',
        position: { x: 350, y: 650 },
        data: { 
          label: 'Detrator',
          messageType: 'text',
          content: '😔 Sentimos muito que sua experiência não tenha sido ideal.\n\nPoderia nos contar o que aconteceu?'
        }
      },
      {
        id: 'msg-4',
        type: 'message',
        position: { x: 550, y: 650 },
        data: { 
          label: 'Neutro',
          messageType: 'text',
          content: '🤝 Obrigado pelo feedback!\n\nO que podemos fazer para transformar sua experiência em um 10?'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'msg-1' },
      { id: 'e2', source: 'msg-1', target: 'input-nota' },
      { id: 'e3', source: 'input-nota', target: 'cond-1' },
      { id: 'e4', source: 'cond-1', target: 'msg-2', sourceHandle: 'yes' },
      { id: 'e5', source: 'cond-1', target: 'cond-2', sourceHandle: 'no' },
      { id: 'e6', source: 'cond-2', target: 'msg-3', sourceHandle: 'yes' },
      { id: 'e7', source: 'cond-2', target: 'msg-4', sourceHandle: 'no' }
    ]
  },
  {
    id: 'after-hours',
    name: 'Fora do Horário (Legacy)',
    description: 'Captura de leads quando a equipe está indisponível',
    category: 'básico',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: { label: 'Início' }
      },
      {
        id: 'smartform-1',
        type: 'smartForm',
        position: { x: 250, y: 150 },
        data: { 
          label: 'Formulário Fora Horário',
          checkBusinessHours: false,
          messageBeforeLink: '🕐 Estamos fora do horário comercial.\n\nDeixe seu contato e retornaremos assim que possível!'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'smartform-1' }
    ]
  },
  {
    id: 'lead-capture',
    name: 'Captura de Leads',
    description: 'Coleta completa de informações do cliente potencial',
    category: 'vendas',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: { label: 'Início' }
      },
      {
        id: 'msg-1',
        type: 'message',
        position: { x: 250, y: 150 },
        data: { 
          label: 'Boas-vindas',
          messageType: 'text',
          content: '🎯 Olá! Obrigado pelo seu interesse!\n\nPara melhor atendê-lo, preciso de algumas informações.'
        }
      },
      {
        id: 'input-nome',
        type: 'input',
        position: { x: 250, y: 280 },
        data: { 
          label: 'Nome',
          promptMessage: 'Qual é o seu nome completo?',
          variableName: 'nome',
          validationType: 'any'
        }
      },
      {
        id: 'input-email',
        type: 'input',
        position: { x: 250, y: 400 },
        data: { 
          label: 'Email',
          promptMessage: 'Qual é o seu e-mail?',
          variableName: 'email',
          validationType: 'email',
          errorMessage: 'Por favor, digite um e-mail válido'
        }
      },
      {
        id: 'input-cidade',
        type: 'input',
        position: { x: 250, y: 520 },
        data: { 
          label: 'Cidade',
          promptMessage: 'Em qual cidade você está?',
          variableName: 'cidade',
          validationType: 'any'
        }
      },
      {
        id: 'tag-1',
        type: 'tag',
        position: { x: 250, y: 640 },
        data: { 
          label: 'Marcar Lead',
          tagName: 'lead-novo'
        }
      },
      {
        id: 'msg-2',
        type: 'message',
        position: { x: 250, y: 760 },
        data: { 
          label: 'Confirmação',
          messageType: 'text',
          content: '🎉 Perfeito, {{nome}}!\n\nRecebemos seu cadastro:\n📧 {{email}}\n📍 {{cidade}}\n\nNosso time entrará em contato em até 24h. Obrigado!'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'msg-1' },
      { id: 'e2', source: 'msg-1', target: 'input-nome' },
      { id: 'e3', source: 'input-nome', target: 'input-email' },
      { id: 'e4', source: 'input-email', target: 'input-cidade' },
      { id: 'e5', source: 'input-cidade', target: 'tag-1' },
      { id: 'e6', source: 'tag-1', target: 'msg-2' }
    ]
  },

  // ========================================
  // 🤖 CHAMADO IA - AUTOMAÇÃO PARA ASSISTENTE
  // ========================================
  {
    id: 'chamado-ia',
    name: 'Chamado IA - Abrir Ticket',
    description: 'Automação para o assistente de IA abrir chamados automaticamente',
    category: 'automacao',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: { label: 'Início' }
      },
      {
        id: 'code-extrair',
        type: 'code',
        position: { x: 250, y: 150 },
        data: { 
          label: 'Extrair Dados',
          code: `// Extrai dados do contexto da conversa
const motivo = vars.motivo || 'Não especificado';
const prioridade = vars.prioridade || 'normal';
const telefone = vars.telefone || context?.contact?.phone || '';
const nome = vars.nome || context?.contact?.name || 'Cliente';
const resumo = vars.resumo || '';

return { 
  motivo, 
  prioridade, 
  telefone, 
  nome, 
  resumo,
  data_abertura: new Date().toISOString()
};`
        }
      },
      {
        id: 'http-criar-ticket',
        type: 'http',
        position: { x: 250, y: 300 },
        data: { 
          label: 'Criar Ticket na API',
          method: 'POST',
          url: '{{SUPABASE_URL}}/rest/v1/ai_tickets',
          headers: JSON.stringify({
            'apikey': '{{SUPABASE_ANON_KEY}}',
            'Authorization': 'Bearer {{SUPABASE_ANON_KEY}}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }),
          body: JSON.stringify({
            contact_phone: '{{telefone}}',
            contact_name: '{{nome}}',
            reason: '{{motivo}}',
            priority: '{{prioridade}}',
            ai_summary: '{{resumo}}',
            status: 'pending',
            dissatisfaction_level: 'medium',
            user_id: '{{userId}}'
          }),
          responseVariable: 'ticket_response'
        }
      },
      {
        id: 'cond-sucesso',
        type: 'condition',
        position: { x: 250, y: 450 },
        data: { 
          label: 'Sucesso?',
          condition: 'vars.ticket_response && vars.ticket_response.id'
        }
      },
      {
        id: 'code-sucesso',
        type: 'code',
        position: { x: 50, y: 600 },
        data: { 
          label: 'Preparar Resposta',
          code: `// Prepara resposta de sucesso
const ticketId = vars.ticket_response?.id || '';
const protocolo = ticketId.substring(0, 8).toUpperCase();

return { 
  sucesso: true, 
  protocolo,
  mensagem: 'Chamado aberto com sucesso! Protocolo: ' + protocolo
};`
        }
      },
      {
        id: 'code-erro',
        type: 'code',
        position: { x: 450, y: 600 },
        data: { 
          label: 'Registrar Erro',
          code: `// Registra erro na criação do chamado
return { 
  sucesso: false, 
  mensagem: 'Não foi possível abrir o chamado. Tente novamente.'
};`
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'code-extrair' },
      { id: 'e2', source: 'code-extrair', target: 'http-criar-ticket' },
      { id: 'e3', source: 'http-criar-ticket', target: 'cond-sucesso' },
      { id: 'e4', source: 'cond-sucesso', target: 'code-sucesso', sourceHandle: 'yes' },
      { id: 'e5', source: 'cond-sucesso', target: 'code-erro', sourceHandle: 'no' }
    ]
  },

  // ========================================
  // 🔔 NOTIFICAÇÃO - AUTOMAÇÃO PARA ALERTAS
  // ========================================
  {
    id: 'notificacao-automacao',
    name: 'Notificação Automática',
    description: 'Automação para enviar notificações e alertas',
    category: 'automacao',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: { label: 'Início' }
      },
      {
        id: 'code-preparar',
        type: 'code',
        position: { x: 250, y: 150 },
        data: { 
          label: 'Preparar Notificação',
          code: `// Prepara dados da notificação
const tipo = vars.tipo || 'info';
const titulo = vars.titulo || 'Nova Notificação';
const mensagem = vars.mensagem || '';
const destinatario = vars.destinatario || '';

return { tipo, titulo, mensagem, destinatario };`
        }
      },
      {
        id: 'http-enviar',
        type: 'http',
        position: { x: 250, y: 300 },
        data: { 
          label: 'Enviar Notificação',
          method: 'POST',
          url: '{{WEBHOOK_URL}}',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: '{{tipo}}',
            title: '{{titulo}}',
            message: '{{mensagem}}',
            to: '{{destinatario}}'
          }),
          responseVariable: 'notif_response'
        }
      },
      {
        id: 'code-resultado',
        type: 'code',
        position: { x: 250, y: 450 },
        data: { 
          label: 'Resultado',
          code: `// Retorna resultado
return { 
  enviado: true, 
  mensagem: 'Notificação enviada com sucesso!'
};`
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'code-preparar' },
      { id: 'e2', source: 'code-preparar', target: 'http-enviar' },
      { id: 'e3', source: 'http-enviar', target: 'code-resultado' }
    ]
  },

  // ========================================
  // 💰 ASAAS - INTEGRAÇÃO FINANCEIRA
  // ========================================
  {
    id: 'asaas-faturas',
    name: 'Asaas - Enviar Faturas/Boletos',
    description: 'Integração com Asaas para buscar e enviar faturas/boletos automaticamente quando cliente solicitar',
    category: 'automacao',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 400, y: 50 },
        data: { label: 'Início' }
      },
      {
        id: 'msg-intro',
        type: 'message',
        position: { x: 400, y: 150 },
        data: { 
          label: 'Mensagem Inicial',
          messageType: 'text',
          content: "💳 *Central de Cobranças*\n\nOlá! Posso te ajudar com suas faturas e boletos.\n\nO que você precisa?\n1️⃣ Ver minhas faturas em aberto\n2️⃣ Receber link de pagamento\n3️⃣ Segunda via de boleto\n4️⃣ Consultar pagamentos realizados\n\n_Digite o número da opção._"
        }
      },
      {
        id: 'input-opcao',
        type: 'input',
        position: { x: 400, y: 280 },
        data: { 
          label: 'Capturar Opção',
          promptMessage: '',
          variableName: 'opcao_asaas',
          validationType: 'any'
        }
      },
      {
        id: 'input-documento',
        type: 'input',
        position: { x: 400, y: 400 },
        data: { 
          label: 'Solicitar CPF/CNPJ',
          promptMessage: 'Por favor, informe seu *CPF ou CNPJ* (apenas números):',
          variableName: 'documento_cliente',
          validationType: 'any'
        }
      },
      {
        id: 'code-limpar-doc',
        type: 'code',
        position: { x: 400, y: 520 },
        data: { 
          label: 'Formatar Documento',
          code: "// Remove caracteres não numéricos do documento\nconst doc = (vars.documento_cliente || '').replace(/\\\\D/g, '');\nconst opcao = vars.opcao_asaas || '1';\n\n// Determina se busca em aberto ou pagas\nlet statusBusca = 'PENDING';\nif (opcao === '4') {\n  statusBusca = 'RECEIVED,CONFIRMED';\n}\n\nreturn { \n  documento_formatado: doc,\n  status_busca: statusBusca,\n  opcao_selecionada: opcao\n};"
        }
      },
      {
        id: 'http-buscar-cliente',
        type: 'http',
        position: { x: 400, y: 650 },
        data: { 
          label: 'Buscar Cliente Asaas',
          method: 'GET',
          url: 'https://api.asaas.com/v3/customers?cpfCnpj={{documento_formatado}}',
          headers: {
            'access_token': '{{ASAAS_API_KEY}}',
            'Content-Type': 'application/json'
          },
          responseVariable: 'cliente_asaas'
        }
      },
      {
        id: 'cond-cliente-existe',
        type: 'condition',
        position: { x: 400, y: 780 },
        data: { 
          label: 'Cliente Encontrado?',
          condition: 'vars.cliente_asaas && vars.cliente_asaas.data && vars.cliente_asaas.data.length > 0'
        }
      },
      {
        id: 'msg-nao-encontrado',
        type: 'message',
        position: { x: 650, y: 900 },
        data: { 
          label: 'Cliente Não Encontrado',
          messageType: 'text',
          content: "❌ *Cliente não encontrado*\n\nNão localizamos nenhum cadastro com o documento informado.\n\nPor favor, verifique os dados e tente novamente ou entre em contato com nosso suporte."
        }
      },
      {
        id: 'code-extrair-cliente',
        type: 'code',
        position: { x: 150, y: 900 },
        data: { 
          label: 'Extrair ID Cliente',
          code: "// Extrai ID do cliente encontrado\nconst cliente = vars.cliente_asaas?.data?.[0] || {};\nconst clienteId = cliente.id || '';\nconst clienteNome = cliente.name || 'Cliente';\n\nreturn { \n  cliente_id: clienteId,\n  cliente_nome: clienteNome\n};"
        }
      },
      {
        id: 'http-buscar-cobrancas',
        type: 'http',
        position: { x: 150, y: 1030 },
        data: { 
          label: 'Buscar Cobranças',
          method: 'GET',
          url: 'https://api.asaas.com/v3/payments?customer={{cliente_id}}&status={{status_busca}}',
          headers: {
            'access_token': '{{ASAAS_API_KEY}}',
            'Content-Type': 'application/json'
          },
          responseVariable: 'cobrancas_asaas'
        }
      },
      {
        id: 'cond-tem-cobrancas',
        type: 'condition',
        position: { x: 150, y: 1160 },
        data: { 
          label: 'Tem Cobranças?',
          condition: 'vars.cobrancas_asaas && vars.cobrancas_asaas.data && vars.cobrancas_asaas.data.length > 0'
        }
      },
      {
        id: 'msg-sem-cobrancas',
        type: 'message',
        position: { x: 400, y: 1280 },
        data: { 
          label: 'Sem Cobranças',
          messageType: 'text',
          content: "✅ *Parabéns, {{cliente_nome}}!*\n\nVocê não possui nenhuma fatura pendente no momento.\n\nSe precisar de algo mais, é só chamar! 😊"
        }
      },
      {
        id: 'code-formatar-cobrancas',
        type: 'code',
        position: { x: -100, y: 1280 },
        data: { 
          label: 'Formatar Lista',
          code: "// Formata lista de cobranças para exibição\nconst cobrancas = vars.cobrancas_asaas?.data || [];\nconst opcao = vars.opcao_selecionada || '1';\nconst clienteNome = vars.cliente_nome || 'Cliente';\n\nlet lista = '';\nlet totalAberto = 0;\nlet primeiroLink = '';\nlet primeiroBoleto = '';\n\ncobrancas.forEach((cob, index) => {\n  const valor = (cob.value || 0).toFixed(2).replace('.', ',');\n  const vencimento = cob.dueDate || '';\n  const status = cob.status === 'PENDING' ? '🔴 Pendente' : cob.status === 'OVERDUE' ? '⚠️ Vencido' : '✅ Pago';\n  \n  lista += '\\n' + (index + 1) + '. *R$ ' + valor + '* - Venc: ' + vencimento + ' ' + status;\n  \n  if (cob.status === 'PENDING' || cob.status === 'OVERDUE') {\n    totalAberto += cob.value || 0;\n    if (!primeiroLink && cob.invoiceUrl) primeiroLink = cob.invoiceUrl;\n    if (!primeiroBoleto && cob.bankSlipUrl) primeiroBoleto = cob.bankSlipUrl;\n  }\n});\n\nconst totalFormatado = totalAberto.toFixed(2).replace('.', ',');\n\nreturn { \n  lista_cobrancas: lista,\n  total_aberto: totalFormatado,\n  link_pagamento: primeiroLink,\n  link_boleto: primeiroBoleto,\n  qtd_cobrancas: cobrancas.length,\n  cliente_nome: clienteNome\n};"
        }
      },
      {
        id: 'cond-opcao-link',
        type: 'condition',
        position: { x: -100, y: 1430 },
        data: { 
          label: 'Quer Link?',
          condition: 'vars.opcao_selecionada === "2"'
        }
      },
      {
        id: 'msg-lista-faturas',
        type: 'message',
        position: { x: -350, y: 1550 },
        data: { 
          label: 'Lista de Faturas',
          messageType: 'text',
          content: "📋 *Suas Faturas, {{cliente_nome}}*\n{{lista_cobrancas}}\n\n💰 *Total em aberto: R$ {{total_aberto}}*\n\nPrecisa de mais alguma coisa?"
        }
      },
      {
        id: 'cond-tem-link',
        type: 'condition',
        position: { x: 150, y: 1550 },
        data: { 
          label: 'Tem Link?',
          condition: 'vars.link_pagamento && vars.link_pagamento.length > 0'
        }
      },
      {
        id: 'msg-link-pagamento',
        type: 'message',
        position: { x: 0, y: 1700 },
        data: { 
          label: 'Enviar Link',
          messageType: 'text',
          content: "💳 *Link de Pagamento*\n\nOlá, {{cliente_nome}}! Aqui está seu link para pagamento:\n\n🔗 {{link_pagamento}}\n\nVocê pode pagar via PIX, cartão ou boleto.\n\nApós o pagamento, a confirmação é automática! ✅"
        }
      },
      {
        id: 'msg-sem-link',
        type: 'message',
        position: { x: 300, y: 1700 },
        data: { 
          label: 'Sem Link Disponível',
          messageType: 'text',
          content: "⚠️ *Link não disponível*\n\nNão há link de pagamento disponível no momento.\n\nEntre em contato com nosso financeiro para mais informações."
        }
      },
      {
        id: 'cond-opcao-boleto',
        type: 'condition',
        position: { x: -100, y: 1550 },
        data: { 
          label: 'Quer Boleto?',
          condition: 'vars.opcao_selecionada === "3"'
        }
      },
      {
        id: 'cond-tem-boleto',
        type: 'condition',
        position: { x: -250, y: 1700 },
        data: { 
          label: 'Tem Boleto?',
          condition: 'vars.link_boleto && vars.link_boleto.length > 0'
        }
      },
      {
        id: 'msg-boleto',
        type: 'message',
        position: { x: -400, y: 1850 },
        data: { 
          label: 'Enviar Boleto',
          messageType: 'text',
          content: "📄 *Segunda Via do Boleto*\n\nOlá, {{cliente_nome}}! Segue o link do seu boleto:\n\n🔗 {{link_boleto}}\n\nLembre-se: boletos podem levar até 3 dias úteis para compensar após o pagamento."
        }
      },
      {
        id: 'msg-sem-boleto',
        type: 'message',
        position: { x: -100, y: 1850 },
        data: { 
          label: 'Sem Boleto',
          messageType: 'text',
          content: "⚠️ *Boleto não disponível*\n\nNão há boleto disponível para suas faturas atuais.\n\nVocê pode pagar via PIX ou cartão usando nosso link de pagamento."
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'msg-intro' },
      { id: 'e2', source: 'msg-intro', target: 'input-opcao' },
      { id: 'e3', source: 'input-opcao', target: 'input-documento' },
      { id: 'e4', source: 'input-documento', target: 'code-limpar-doc' },
      { id: 'e5', source: 'code-limpar-doc', target: 'http-buscar-cliente' },
      { id: 'e6', source: 'http-buscar-cliente', target: 'cond-cliente-existe' },
      { id: 'e7', source: 'cond-cliente-existe', target: 'code-extrair-cliente', sourceHandle: 'yes' },
      { id: 'e8', source: 'cond-cliente-existe', target: 'msg-nao-encontrado', sourceHandle: 'no' },
      { id: 'e9', source: 'code-extrair-cliente', target: 'http-buscar-cobrancas' },
      { id: 'e10', source: 'http-buscar-cobrancas', target: 'cond-tem-cobrancas' },
      { id: 'e11', source: 'cond-tem-cobrancas', target: 'code-formatar-cobrancas', sourceHandle: 'yes' },
      { id: 'e12', source: 'cond-tem-cobrancas', target: 'msg-sem-cobrancas', sourceHandle: 'no' },
      { id: 'e13', source: 'code-formatar-cobrancas', target: 'cond-opcao-link' },
      { id: 'e14', source: 'cond-opcao-link', target: 'cond-tem-link', sourceHandle: 'yes' },
      { id: 'e15', source: 'cond-opcao-link', target: 'cond-opcao-boleto', sourceHandle: 'no' },
      { id: 'e16', source: 'cond-tem-link', target: 'msg-link-pagamento', sourceHandle: 'yes' },
      { id: 'e17', source: 'cond-tem-link', target: 'msg-sem-link', sourceHandle: 'no' },
      { id: 'e18', source: 'cond-opcao-boleto', target: 'cond-tem-boleto', sourceHandle: 'yes' },
      { id: 'e19', source: 'cond-opcao-boleto', target: 'msg-lista-faturas', sourceHandle: 'no' },
      { id: 'e20', source: 'cond-tem-boleto', target: 'msg-boleto', sourceHandle: 'yes' },
      { id: 'e21', source: 'cond-tem-boleto', target: 'msg-sem-boleto', sourceHandle: 'no' }
    ]
  }
];
