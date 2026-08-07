# CRM NEXT PRO

LIA Flow - Sistema SaaS de Automação de Atendimento com IA
Visão Geral
Sistema completo de automação de atendimento com agentes de IA para WhatsApp, Instagram e Telegram, com interface moderna, sidebar fixa, dashboard com métricas em tempo real e editor visual de fluxos.

Estrutura e Layout
Layout Base
Sidebar fixa à esquerda (260px) com gradiente azul (#0036ff → #001896)
Top bar com busca e notificações (badge com número de alertas)
Conteúdo principal responsivo
Paleta: Azul primário #0036ff, backgrounds claros #F7F9FB, textos #0f172a
Telas do Sistema
1. Dashboard (Tela Inicial)
4 Cards de Métricas com sparklines animados:
Conversas Ativas: 247 (↑ 12%)
Leads Captados: 1,834 (↑ 8%)
Agentes Ativos: 12 (↑ 2%)
Total de Conversas: 8,492 (↑ 15%)
Ações Rápidas: Criar Agente, Ver Conversas, Gerenciar Leads
Indicadores visuais com badges de crescimento
2. Criar Agente
Formulário em 3 etapas com indicador de progresso
Campos:
Nome do agente
Plataforma (WhatsApp/Instagram/Telegram)
Prompt do sistema (textarea)
Temperatura/criatividade (0.3 a 1.0)
Estilo de resposta (Formal/Casual/Amigável)
Comportamento (Proativo/Reativo/Misto)
Validação e toast de sucesso
3. Meus Agentes
Grid de cards por agente
Informações:
Ícone da plataforma (📱 WhatsApp, 📷 Instagram, ✈️ Telegram)
Status (Ativo/Inativo) com badge
Métricas: conversas hoje, tempo médio, satisfação
Borda colorida por plataforma
Ações: Editar, Ver Conversas, Pausar/Ativar
4. Conversas em Tempo Real
Layout em 3 colunas:

Coluna 1 - Lista de Conversas (340px):

Busca de conversas
Lista com avatares, preview, timestamp
Indicador de conversa ativa
Coluna 2 - Chat Principal:

Header: avatar, nome, status online, plataforma
Área de mensagens (estilo WhatsApp Web)
Mensagens incoming (brancas) e outgoing (azul gradiente)
Input com ações: emoji, anexo, áudio 🎤, PIX 💰
Sugestões da IA abaixo do input
Respostas rápidas com "/" (ex: /oi, /preco, /planos)
Coluna 3 - Info do Cliente (300px):

Dados do cliente (nome, telefone, origem)
Agente responsável
Estatísticas da conversa
Funcionalidades Especiais:

Gravação de áudio: botão 🎤 → ⏹️ ao gravar
Modal PIX: gera QR Code com valor e descrição
Transferir conversa: modal para escolher agente
Encerrar conversa: confirmação com modal de alerta
5. Leads
Tabela completa com zebra rows
Colunas: Nome (avatar), Telefone, Origem, Data, Status, Tags, Ações
Filtros: por status e origem
Tags coloridas: VIP (azul), Urgente (amarelo), Hot Lead (rosa)
Ações: Editar ✏️, Arquivar 📦, Excluir 🗑️
Botões de topo: Importar CSV, Exportar CSV, Novo Lead
Modais para adicionar/editar leads
6. Fluxos de IA
Fluxos Ativos:

Cards com nome, gatilho, execuções e status
Ações: Testar 🧪, Editar ✏️
Templates de Fluxo:

Boas-vindas 🔄
Qualificação de Leads 🎯
Agendamento 📅
Fluxo de Vendas 💰
FAQ Automático ❓
Criar Personalizado ➕
Editor Visual de Fluxos (Modal fullscreen):

Sidebar com blocos:

Gatilhos: Palavra-chave, Início de conversa, Botão clicado, Horário
Ações: Enviar mensagem, áudio, imagem, PIX, Transferir, Encerrar, Salvar lead
IA & Lógica: Bloco de IA, Condição, Aguardar
Canvas:

Grid para arrastar blocos
Drag & Drop funcional da sidebar para canvas
Blocos posicionam livremente
Botão ✕ ao hover (deletar)
Duplo clique para configurar
Footer: Testar Fluxo, Ver Logs, Cancelar, Salvar
7. Configurações
Layout em 2 colunas:

Sidebar: Geral, Perfil, API Keys, Webhooks, Integrações, Plano
Seções:

Informações da Empresa
Integração WhatsApp UAZAPI:
Status (🟢 Online / 🔴 Offline)
Botão "Conectar WhatsApp UAZAPI"
Modal para Instance ID e Token
Verificação de status em tempo real
API Keys (readonly + gerar nov

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://chat-flow-wizardry.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/21dd7b9f-c0bf-4b8e-957f-c6952c532fb1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
