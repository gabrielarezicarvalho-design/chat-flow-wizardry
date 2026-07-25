import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Book, Copy, Check, ChevronRight, Globe, Key, MessageSquare, 
  Phone, Send, Webhook, ArrowRight, Shield, Zap, Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-api/v1`;

interface EndpointDoc {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  title: string;
  description: string;
  permission: string;
  headers: { name: string; value: string; required: boolean }[];
  queryParams?: { name: string; type: string; description: string; required: boolean }[];
  body?: Record<string, { type: string; description: string; required: boolean }>;
  responseExample: any;
  curlExample: string;
}

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PUT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
};

const endpoints: EndpointDoc[] = [
  {
    method: "GET",
    path: "/connections",
    title: "Listar Conexões",
    description: "Retorna todas as conexões WhatsApp da empresa.",
    permission: "connections",
    headers: [
      { name: "X-Api-Key", value: "sua_api_key", required: true },
    ],
    responseExample: {
      connections: [
        {
          id: "uuid",
          provider: "meta",
          status: "connected",
          meta_phone_number_id: "123456",
          meta_waba_id: "789012",
          created_at: "2025-01-01T00:00:00Z",
        },
      ],
    },
    curlExample: `curl -X GET "${BASE_URL}/connections" \\
  -H "X-Api-Key: sua_api_key"`,
  },
  {
    method: "POST",
    path: "/connections/start-signup",
    title: "Iniciar Embedded Signup",
    description: "Retorna as configurações necessárias para abrir o popup do Facebook Embedded Signup no seu sistema.",
    permission: "connections",
    headers: [
      { name: "X-Api-Key", value: "sua_api_key", required: true },
      { name: "Content-Type", value: "application/json", required: true },
    ],
    responseExample: {
      meta_app_id: "123456789",
      meta_config_id: "987654321",
      callback_url: "https://...../v1/connections/callback",
      instructions: "Use the Facebook SDK to launch Embedded Signup...",
    },
    curlExample: `curl -X POST "${BASE_URL}/connections/start-signup" \\
  -H "X-Api-Key: sua_api_key" \\
  -H "Content-Type: application/json"`,
  },
  {
    method: "POST",
    path: "/connections/callback",
    title: "Callback do Embedded Signup",
    description: "Recebe os dados do Embedded Signup após o usuário autorizar no Facebook e cria a conexão automaticamente.",
    permission: "connections",
    headers: [
      { name: "X-Api-Key", value: "sua_api_key", required: true },
      { name: "Content-Type", value: "application/json", required: true },
    ],
    body: {
      waba_id: { type: "string", description: "ID da conta WhatsApp Business", required: true },
      phone_number_id: { type: "string", description: "ID do número de telefone", required: true },
      business_id: { type: "string", description: "ID do Business Manager", required: false },
      code: { type: "string", description: "Código de autorização OAuth", required: false },
      access_token: { type: "string", description: "Token de acesso (se já obtido)", required: false },
    },
    responseExample: {
      connection: {
        id: "uuid",
        provider: "meta",
        status: "connected",
        meta_waba_id: "789012",
        meta_phone_number_id: "123456",
      },
      message: "Connection created successfully",
    },
    curlExample: `curl -X POST "${BASE_URL}/connections/callback" \\
  -H "X-Api-Key: sua_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"waba_id":"789012","phone_number_id":"123456","code":"auth_code"}'`,
  },
  {
    method: "GET",
    path: "/conversations",
    title: "Listar Conversas",
    description: "Retorna as conversas da empresa com paginação.",
    permission: "conversations",
    headers: [
      { name: "X-Api-Key", value: "sua_api_key", required: true },
    ],
    queryParams: [
      { name: "limit", type: "number", description: "Quantidade por página (padrão: 50)", required: false },
      { name: "offset", type: "number", description: "Offset para paginação", required: false },
      { name: "status", type: "string", description: "Filtrar por status (open, closed)", required: false },
    ],
    responseExample: {
      conversations: [
        {
          id: "uuid",
          contact_phone: "5511999999999",
          contact_name: "João",
          last_message: "Olá!",
          status: "open",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ],
      total: 150,
      limit: 50,
      offset: 0,
    },
    curlExample: `curl -X GET "${BASE_URL}/conversations?limit=20&status=open" \\
  -H "X-Api-Key: sua_api_key"`,
  },
  {
    method: "GET",
    path: "/conversations/:id/messages",
    title: "Mensagens da Conversa",
    description: "Retorna as mensagens de uma conversa específica.",
    permission: "conversations",
    headers: [
      { name: "X-Api-Key", value: "sua_api_key", required: true },
    ],
    queryParams: [
      { name: "limit", type: "number", description: "Quantidade máxima (padrão: 100)", required: false },
    ],
    responseExample: {
      messages: [
        {
          id: "uuid",
          sender_type: "contact",
          content: "Olá, preciso de ajuda",
          message_type: "text",
          created_at: "2025-01-01T00:00:00Z",
        },
      ],
    },
    curlExample: `curl -X GET "${BASE_URL}/conversations/CONV_ID/messages?limit=50" \\
  -H "X-Api-Key: sua_api_key"`,
  },
  {
    method: "POST",
    path: "/messages/send",
    title: "Enviar Mensagem",
    description: "Envia uma mensagem WhatsApp via conexão Evolution.",
    permission: "messages",
    headers: [
      { name: "X-Api-Key", value: "sua_api_key", required: true },
      { name: "Content-Type", value: "application/json", required: true },
    ],
    body: {
      phone: { type: "string", description: "Número do destinatário (ex: 5511999999999)", required: true },
      content: { type: "string", description: "Conteúdo da mensagem", required: true },
      connection_id: { type: "string", description: "ID da conexão (opcional, usa a primeira ativa)", required: false },
      contact_name: { type: "string", description: "Nome do contato (opcional)", required: false },
    },
    responseExample: {
      success: true,
      provider_response: { status: "sent" },
      conversation_id: "uuid",
    },
    curlExample: `curl -X POST "${BASE_URL}/messages/send" \\
  -H "X-Api-Key: sua_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"phone":"5511999999999","content":"Olá! Tudo bem?"}'`,
  },
  {
    method: "POST",
    path: "/messages/send-template",
    title: "Enviar Template (Meta)",
    description: "Envia um template de mensagem aprovado pela Meta.",
    permission: "messages",
    headers: [
      { name: "X-Api-Key", value: "sua_api_key", required: true },
      { name: "Content-Type", value: "application/json", required: true },
    ],
    body: {
      phone: { type: "string", description: "Número do destinatário", required: true },
      template_name: { type: "string", description: "Nome do template aprovado", required: true },
      template_language: { type: "string", description: "Idioma (padrão: pt_BR)", required: false },
      components: { type: "array", description: "Componentes do template (variáveis)", required: false },
    },
    responseExample: {
      success: true,
      provider_response: {
        messaging_product: "whatsapp",
        messages: [{ id: "wamid.xxx" }],
      },
    },
    curlExample: `curl -X POST "${BASE_URL}/messages/send-template" \\
  -H "X-Api-Key: sua_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"phone":"5511999999999","template_name":"hello_world","template_language":"pt_BR"}'`,
  },
  {
    method: "GET",
    path: "/contacts",
    title: "Listar Contatos",
    description: "Retorna os leads/contatos da empresa.",
    permission: "contacts",
    headers: [
      { name: "X-Api-Key", value: "sua_api_key", required: true },
    ],
    queryParams: [
      { name: "limit", type: "number", description: "Quantidade por página (padrão: 50)", required: false },
      { name: "offset", type: "number", description: "Offset para paginação", required: false },
    ],
    responseExample: {
      contacts: [
        {
          id: "uuid",
          name: "Maria",
          phone: "5511999999999",
          email: "maria@email.com",
          status: "active",
          tags: ["vip"],
        },
      ],
      limit: 50,
      offset: 0,
    },
    curlExample: `curl -X GET "${BASE_URL}/contacts?limit=20" \\
  -H "X-Api-Key: sua_api_key"`,
  },
  {
    method: "PUT",
    path: "/webhooks/configure",
    title: "Configurar Webhook",
    description: "Configura a URL e eventos do webhook para receber notificações em tempo real.",
    permission: "webhooks",
    headers: [
      { name: "X-Api-Key", value: "sua_api_key", required: true },
      { name: "Content-Type", value: "application/json", required: true },
    ],
    body: {
      webhook_url: { type: "string", description: "URL que receberá os eventos", required: false },
      webhook_events: { type: "array", description: "Eventos a receber: message.received, message.sent, etc.", required: false },
    },
    responseExample: {
      success: true,
      webhook_url: "https://seusite.com/webhook",
      webhook_events: ["message.received", "message.sent"],
    },
    curlExample: `curl -X PUT "${BASE_URL}/webhooks/configure" \\
  -H "X-Api-Key: sua_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"webhook_url":"https://seusite.com/webhook","webhook_events":["message.received"]}'`,
  },
  {
    method: "POST",
    path: "/webhooks/test",
    title: "Testar Webhook",
    description: "Envia um evento de teste para a URL de webhook configurada.",
    permission: "webhooks",
    headers: [
      { name: "X-Api-Key", value: "sua_api_key", required: true },
    ],
    responseExample: {
      success: true,
      status_code: 200,
      webhook_url: "https://seusite.com/webhook",
    },
    curlExample: `curl -X POST "${BASE_URL}/webhooks/test" \\
  -H "X-Api-Key: sua_api_key"`,
  },
];

const categories = [
  { id: "all", label: "Todos", icon: Book },
  { id: "connections", label: "Conexões", icon: Phone },
  { id: "conversations", label: "Conversas", icon: MessageSquare },
  { id: "messages", label: "Mensagens", icon: Send },
  { id: "contacts", label: "Contatos", icon: Users },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
];

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-slate-950 border border-white/10 rounded-lg p-4 overflow-x-auto text-sm font-mono text-slate-300">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
      </button>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: EndpointDoc }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="bg-slate-800/50 border-white/10 hover:border-white/20 transition-colors">
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Badge className={cn("font-mono text-xs px-2 py-0.5 border", methodColors[endpoint.method])}>
            {endpoint.method}
          </Badge>
          <code className="text-sm text-slate-300 font-mono">{endpoint.path}</code>
          <ChevronRight className={cn("h-4 w-4 text-slate-500 ml-auto transition-transform", expanded && "rotate-90")} />
        </div>
        <CardDescription className="text-slate-400 mt-1">{endpoint.title}</CardDescription>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          <p className="text-sm text-slate-400">{endpoint.description}</p>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Permissão necessária</p>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
              {endpoint.permission}
            </Badge>
          </div>

          <Tabs defaultValue="curl" className="w-full">
            <TabsList className="bg-slate-900/50 border border-white/10">
              <TabsTrigger value="curl" className="text-xs data-[state=active]:bg-white/10">cURL</TabsTrigger>
              <TabsTrigger value="response" className="text-xs data-[state=active]:bg-white/10">Response</TabsTrigger>
              {endpoint.body && <TabsTrigger value="body" className="text-xs data-[state=active]:bg-white/10">Body</TabsTrigger>}
              {endpoint.queryParams && <TabsTrigger value="params" className="text-xs data-[state=active]:bg-white/10">Params</TabsTrigger>}
            </TabsList>

            <TabsContent value="curl" className="mt-3">
              <CodeBlock code={endpoint.curlExample} />
            </TabsContent>

            <TabsContent value="response" className="mt-3">
              <CodeBlock code={JSON.stringify(endpoint.responseExample, null, 2)} language="json" />
            </TabsContent>

            {endpoint.body && (
              <TabsContent value="body" className="mt-3">
                <div className="bg-slate-950 border border-white/10 rounded-lg p-4 space-y-2">
                  {Object.entries(endpoint.body).map(([key, val]) => (
                    <div key={key} className="flex items-start gap-2 text-sm">
                      <code className="text-cyan-400 font-mono min-w-[140px]">{key}</code>
                      <span className="text-slate-500 text-xs mt-0.5">{val.type}</span>
                      {val.required && <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-1">required</Badge>}
                      <span className="text-slate-400 text-xs">{val.description}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}

            {endpoint.queryParams && (
              <TabsContent value="params" className="mt-3">
                <div className="bg-slate-950 border border-white/10 rounded-lg p-4 space-y-2">
                  {endpoint.queryParams.map((param) => (
                    <div key={param.name} className="flex items-start gap-2 text-sm">
                      <code className="text-cyan-400 font-mono min-w-[100px]">{param.name}</code>
                      <span className="text-slate-500 text-xs mt-0.5">{param.type}</span>
                      <span className="text-slate-400 text-xs">{param.description}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}

export default function AdminDocumentacao() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<"docs" | "guide">("docs");

  const filtered = activeCategory === "all"
    ? endpoints
    : endpoints.filter((e) => e.permission === activeCategory || e.path.startsWith(`/${activeCategory}`));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Book className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Documentação da API</h1>
            <p className="text-slate-400 text-sm">API REST para integração com sistemas externos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab("docs")}
            className={cn(
              "gap-1.5",
              activeTab === "docs" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
            )}
          >
            <Book className="h-4 w-4" />
            Endpoints
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab("guide")}
            className={cn(
              "gap-1.5",
              activeTab === "guide" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
            )}
          >
            <ArrowRight className="h-4 w-4" />
            Guia de Integração
          </Button>
        </div>
      </div>

      {activeTab === "guide" ? (
        <IntegrationGuide />
      ) : (
        <>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <Book className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Documentação da API</h1>
          <p className="text-slate-400 text-sm">API REST para integração com sistemas externos</p>
        </div>
      </div>

      {/* Quick Start */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-400" />
            Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400 font-bold text-sm">1</div>
              <div>
                <p className="text-sm font-medium text-white">Obtenha sua API Key</p>
                <p className="text-xs text-slate-400">Crie uma chave na seção Integrações do painel admin</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400 font-bold text-sm">2</div>
              <div>
                <p className="text-sm font-medium text-white">Inclua o header</p>
                <p className="text-xs text-slate-400">Adicione <code className="text-cyan-400">X-Api-Key</code> em todas as requisições</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400 font-bold text-sm">3</div>
              <div>
                <p className="text-sm font-medium text-white">Faça chamadas</p>
                <p className="text-xs text-slate-400">Use os endpoints abaixo para integrar</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Base URL</p>
            <CodeBlock code={BASE_URL} />
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Autenticação</p>
            <CodeBlock code={`curl -X GET "${BASE_URL}/connections" \\
  -H "X-Api-Key: mk_live_sua_chave_aqui"`} />
          </div>
        </CardContent>
      </Card>

      {/* Webhook Events info */}
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Webhook className="h-5 w-5 text-amber-400" />
            Eventos de Webhook
          </CardTitle>
          <CardDescription className="text-slate-400">
            Configure sua URL de webhook para receber eventos em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-950 border border-white/10 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs font-mono">message.received</Badge>
              <span className="text-slate-400">Nova mensagem recebida de um contato</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs font-mono">message.sent</Badge>
              <span className="text-slate-400">Mensagem enviada com sucesso</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs font-mono">connection.status</Badge>
              <span className="text-slate-400">Mudança de status de uma conexão</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Payload de exemplo para <code className="text-cyan-400">message.received</code>:
          </p>
          <div className="mt-2">
            <CodeBlock code={JSON.stringify({
              event: "message.received",
              timestamp: "2025-01-01T12:00:00Z",
              data: {
                from: "5511999999999",
                body: "Olá, preciso de ajuda!",
                type: "text",
                conversation_id: "uuid",
              },
            }, null, 2)} language="json" />
          </div>
        </CardContent>
      </Card>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant="ghost"
            size="sm"
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "gap-1.5 text-xs",
              activeCategory === cat.id
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <cat.icon className="h-3.5 w-3.5" />
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Endpoints */}
      <div className="space-y-3">
        {filtered.map((ep, i) => (
          <EndpointCard key={i} endpoint={ep} />
        ))}
      </div>

      {/* Rate Limits & Errors */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-slate-800/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              Permissões
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {["connections", "conversations", "messages", "webhooks"].map((p) => (
              <div key={p} className="flex items-center gap-2">
                <Badge variant="outline" className="border-white/10 text-slate-300 text-xs font-mono">{p}</Badge>
                <span className="text-slate-400">Acesso a endpoints de {p}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-red-400" />
              Códigos de Erro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              { code: 401, desc: "API key inválida ou ausente" },
              { code: 403, desc: "Sem permissão para o recurso" },
              { code: 404, desc: "Recurso não encontrado" },
              { code: 400, desc: "Parâmetros inválidos" },
              { code: 502, desc: "Erro no provedor externo" },
            ].map((e) => (
              <div key={e.code} className="flex items-center gap-2">
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs font-mono">{e.code}</Badge>
                <span className="text-slate-400">{e.desc}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      </>
      )}
    </div>
  );
}

function IntegrationGuide() {
  return (
    <div className="space-y-6">
      {/* Intro */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-400" />
            Guia Completo de Integração
          </CardTitle>
          <CardDescription className="text-slate-400">
            Copie e cole o código abaixo no seu sistema para integrar com o MarketFlow. 
            Este guia cobre: conexão WhatsApp via Meta Embedded Signup, envio de mensagens, 
            recebimento de webhooks e gerenciamento de conversas.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Step 1 - Setup */}
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">1</div>
            <div>
              <CardTitle className="text-white text-base">Configuração Inicial</CardTitle>
              <CardDescription className="text-slate-400">Defina as variáveis de ambiente no seu sistema</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-400">Adicione estas variáveis no <code className="text-cyan-400">.env</code> do seu sistema:</p>
          <CodeBlock code={`# .env do seu sistema
MARKETFLOW_API_URL=${BASE_URL}
MARKETFLOW_API_KEY=mk_live_sua_chave_aqui

# Para o Embedded Signup do Facebook (será retornado pela API)
# META_APP_ID será obtido via /connections/start-signup`} />
        </CardContent>
      </Card>

      {/* Step 2 - Service Class */}
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">2</div>
            <div>
              <CardTitle className="text-white text-base">Classe de Serviço (Backend)</CardTitle>
              <CardDescription className="text-slate-400">Service em Node.js/TypeScript para comunicação com a API</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="typescript" className="w-full">
            <TabsList className="bg-slate-900/50 border border-white/10">
              <TabsTrigger value="typescript" className="text-xs data-[state=active]:bg-white/10">TypeScript</TabsTrigger>
              <TabsTrigger value="python" className="text-xs data-[state=active]:bg-white/10">Python</TabsTrigger>
              <TabsTrigger value="php" className="text-xs data-[state=active]:bg-white/10">PHP</TabsTrigger>
            </TabsList>

            <TabsContent value="typescript" className="mt-3">
              <CodeBlock code={`// services/marketflow.ts
class MarketFlowService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.MARKETFLOW_API_URL!;
    this.apiKey = process.env.MARKETFLOW_API_KEY!;
  }

  private async request(method: string, path: string, body?: any) {
    const res = await fetch(\`\${this.baseUrl}\${path}\`, {
      method,
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'API request failed');
    }
    
    return res.json();
  }

  // ========= CONEXÕES =========

  /** Listar todas as conexões WhatsApp */
  async listConnections() {
    return this.request('GET', '/connections');
  }

  /** Iniciar o Embedded Signup da Meta (retorna config para o popup) */
  async startEmbeddedSignup() {
    return this.request('POST', '/connections/start-signup');
  }

  /** Enviar callback do Embedded Signup após autorização */
  async handleSignupCallback(data: {
    waba_id: string;
    phone_number_id: string;
    business_id?: string;
    code?: string;
    access_token?: string;
  }) {
    return this.request('POST', '/connections/callback', data);
  }

  // ========= MENSAGENS =========

  /** Enviar mensagem de texto */
  async sendMessage(phone: string, content: string, connectionId?: string) {
    return this.request('POST', '/messages/send', {
      phone,
      content,
      connection_id: connectionId,
    });
  }

  /** Enviar template da Meta */
  async sendTemplate(phone: string, templateName: string, params?: {
    language?: string;
    components?: any[];
  }) {
    return this.request('POST', '/messages/send-template', {
      phone,
      template_name: templateName,
      template_language: params?.language || 'pt_BR',
      components: params?.components,
    });
  }

  // ========= CONVERSAS =========

  /** Listar conversas */
  async listConversations(options?: { limit?: number; offset?: number; status?: string }) {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.status) params.set('status', options.status);
    return this.request('GET', \`/conversations?\${params}\`);
  }

  /** Obter mensagens de uma conversa */
  async getMessages(conversationId: string, limit = 100) {
    return this.request('GET', \`/conversations/\${conversationId}/messages?limit=\${limit}\`);
  }

  // ========= CONTATOS =========

  /** Listar contatos/leads */
  async listContacts(limit = 50, offset = 0) {
    return this.request('GET', \`/contacts?limit=\${limit}&offset=\${offset}\`);
  }

  // ========= WEBHOOKS =========

  /** Configurar URL de webhook */
  async configureWebhook(webhookUrl: string, events: string[]) {
    return this.request('PUT', '/webhooks/configure', {
      webhook_url: webhookUrl,
      webhook_events: events,
    });
  }

  /** Testar webhook */
  async testWebhook() {
    return this.request('POST', '/webhooks/test');
  }
}

export const marketflow = new MarketFlowService();`} />
            </TabsContent>

            <TabsContent value="python" className="mt-3">
              <CodeBlock code={`# services/marketflow.py
import os
import requests

class MarketFlowService:
    def __init__(self):
        self.base_url = os.environ["MARKETFLOW_API_URL"]
        self.api_key = os.environ["MARKETFLOW_API_KEY"]

    def _request(self, method, path, json=None):
        res = requests.request(
            method,
            f"{self.base_url}{path}",
            headers={
                "X-Api-Key": self.api_key,
                "Content-Type": "application/json",
            },
            json=json,
        )
        res.raise_for_status()
        return res.json()

    def list_connections(self):
        return self._request("GET", "/connections")

    def start_embedded_signup(self):
        return self._request("POST", "/connections/start-signup")

    def handle_signup_callback(self, waba_id, phone_number_id, **kwargs):
        return self._request("POST", "/connections/callback", {
            "waba_id": waba_id,
            "phone_number_id": phone_number_id,
            **kwargs,
        })

    def send_message(self, phone, content, connection_id=None):
        return self._request("POST", "/messages/send", {
            "phone": phone,
            "content": content,
            "connection_id": connection_id,
        })

    def send_template(self, phone, template_name, language="pt_BR", components=None):
        return self._request("POST", "/messages/send-template", {
            "phone": phone,
            "template_name": template_name,
            "template_language": language,
            "components": components or [],
        })

    def list_conversations(self, limit=50, offset=0, status=None):
        params = f"?limit={limit}&offset={offset}"
        if status:
            params += f"&status={status}"
        return self._request("GET", f"/conversations{params}")

    def get_messages(self, conversation_id, limit=100):
        return self._request("GET", f"/conversations/{conversation_id}/messages?limit={limit}")

    def configure_webhook(self, webhook_url, events):
        return self._request("PUT", "/webhooks/configure", {
            "webhook_url": webhook_url,
            "webhook_events": events,
        })

marketflow = MarketFlowService()`} />
            </TabsContent>

            <TabsContent value="php" className="mt-3">
              <CodeBlock code={`<?php
// services/MarketFlowService.php
class MarketFlowService {
    private string $baseUrl;
    private string $apiKey;

    public function __construct() {
        $this->baseUrl = env('MARKETFLOW_API_URL');
        $this->apiKey = env('MARKETFLOW_API_KEY');
    }

    private function request(string $method, string $path, ?array $body = null): array {
        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'X-Api-Key: ' . $this->apiKey,
                'Content-Type: application/json',
            ],
        ]);
        if ($body) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }
        $response = curl_exec($ch);
        curl_close($ch);
        return json_decode($response, true);
    }

    public function listConnections(): array {
        return $this->request('GET', '/connections');
    }

    public function startEmbeddedSignup(): array {
        return $this->request('POST', '/connections/start-signup');
    }

    public function sendMessage(string $phone, string $content, ?string $connectionId = null): array {
        return $this->request('POST', '/messages/send', [
            'phone' => $phone,
            'content' => $content,
            'connection_id' => $connectionId,
        ]);
    }

    public function configureWebhook(string $webhookUrl, array $events): array {
        return $this->request('PUT', '/webhooks/configure', [
            'webhook_url' => $webhookUrl,
            'webhook_events' => $events,
        ]);
    }
}`} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Step 3 - Embedded Signup Frontend */}
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">3</div>
            <div>
              <CardTitle className="text-white text-base">Facebook Embedded Signup (Frontend)</CardTitle>
              <CardDescription className="text-slate-400">Código para abrir o popup do Facebook no seu sistema e criar a conexão</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-400">
            Primeiro, adicione o SDK do Facebook no <code className="text-cyan-400">&lt;head&gt;</code> do seu HTML:
          </p>
          <CodeBlock code={`<!-- No <head> do seu HTML -->
<script async defer crossorigin="anonymous"
  src="https://connect.facebook.net/pt_BR/sdk.js">
</script>`} />

          <p className="text-sm text-slate-400 mt-4">
            Depois, use este código JavaScript para abrir o popup e enviar o callback:
          </p>
          <CodeBlock code={`// embedded-signup.js
// Passo 1: Buscar config do MarketFlow
async function startWhatsAppSignup() {
  const res = await fetch(MARKETFLOW_API_URL + '/connections/start-signup', {
    method: 'POST',
    headers: { 'X-Api-Key': MARKETFLOW_API_KEY },
  });
  const config = await res.json();

  // Passo 2: Inicializar Facebook SDK
  FB.init({
    appId: config.meta_app_id,
    cookie: true,
    xfbml: true,
    version: 'v22.0',
  });

  // Passo 3: Abrir popup do Embedded Signup
  FB.login(function(response) {
    if (response.authResponse) {
      const code = response.authResponse.code;
      
      // Passo 4: Escutar mensagem do popup com os dados do signup
      // O Facebook envia os dados via postMessage
      handleFacebookCallback(code, config.callback_url);
    }
  }, {
    config_id: config.meta_config_id,
    response_type: 'code',
    override_default_response_type: true,
    extras: {
      setup: {},
      featureType: '',
      sessionInfoVersion: '3',
    }
  });
}

// Passo 4: Capturar os dados e enviar para o MarketFlow
window.addEventListener('message', async (event) => {
  if (event.origin !== 'https://www.facebook.com' && 
      event.origin !== 'https://web.facebook.com') return;

  try {
    const data = JSON.parse(event.data);
    if (data.type === 'WA_EMBEDDED_SIGNUP') {
      const { phone_number_id, waba_id } = data.data;
      
      // Enviar callback para o MarketFlow
      const res = await fetch(MARKETFLOW_API_URL + '/connections/callback', {
        method: 'POST',
        headers: {
          'X-Api-Key': MARKETFLOW_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          waba_id,
          phone_number_id,
          code: window._fb_auth_code, // salvo no FB.login callback
        }),
      });

      const result = await res.json();
      console.log('✅ Conexão criada:', result.connection);
      
      // Atualizar UI do seu sistema
      alert('WhatsApp conectado com sucesso!');
    }
  } catch (e) {
    // Ignorar mensagens que não são JSON
  }
});

// Salvar o code do FB.login para uso posterior
function handleFacebookCallback(code, callbackUrl) {
  window._fb_auth_code = code;
}`} />

          <p className="text-sm text-slate-400 mt-4">
            Exemplo de botão no seu HTML:
          </p>
          <CodeBlock code={`<button onclick="startWhatsAppSignup()" 
  style="background: #25D366; color: white; padding: 12px 24px; 
         border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
  📱 Conectar WhatsApp
</button>`} />
        </CardContent>
      </Card>

      {/* Step 4 - React Component */}
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">4</div>
            <div>
              <CardTitle className="text-white text-base">Componente React (Opcional)</CardTitle>
              <CardDescription className="text-slate-400">Se seu sistema usa React, use este componente pronto</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CodeBlock code={`// components/ConnectWhatsApp.tsx
import { useState } from 'react';
import { marketflow } from '../services/marketflow';

declare const FB: any;

export function ConnectWhatsApp({ onConnected }: { onConnected: (conn: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleConnect() {
    setLoading(true);
    setError('');
    
    try {
      // 1. Buscar config
      const config = await marketflow.startEmbeddedSignup();
      
      // 2. Init Facebook SDK
      FB.init({ appId: config.meta_app_id, version: 'v22.0' });
      
      // 3. Abrir popup
      FB.login((response: any) => {
        if (!response.authResponse) {
          setError('Autorização cancelada');
          setLoading(false);
          return;
        }
        // Code será usado no callback
        window._fb_code = response.authResponse.code;
      }, {
        config_id: config.meta_config_id,
        response_type: 'code',
        override_default_response_type: true,
      });

      // 4. Escutar resultado
      const handler = async (event: MessageEvent) => {
        if (!['https://www.facebook.com', 'https://web.facebook.com']
          .includes(event.origin)) return;
        
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'WA_EMBEDDED_SIGNUP') {
            window.removeEventListener('message', handler);
            
            const result = await marketflow.handleSignupCallback({
              waba_id: data.data.waba_id,
              phone_number_id: data.data.phone_number_id,
              code: (window as any)._fb_code,
            });
            
            onConnected(result.connection);
            setLoading(false);
          }
        } catch {}
      };
      
      window.addEventListener('message', handler);
      
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleConnect} disabled={loading}
        style={{ background: '#25D366', color: '#fff', padding: '12px 24px',
                 border: 'none', borderRadius: 8, cursor: 'pointer' }}>
        {loading ? '⏳ Conectando...' : '📱 Conectar WhatsApp'}
      </button>
      {error && <p style={{ color: 'red', marginTop: 8 }}>{error}</p>}
    </div>
  );
}`} />
        </CardContent>
      </Card>

      {/* Step 5 - Webhook Receiver */}
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">5</div>
            <div>
              <CardTitle className="text-white text-base">Receber Webhooks (Backend)</CardTitle>
              <CardDescription className="text-slate-400">Endpoint no seu sistema para receber eventos em tempo real</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="express" className="w-full">
            <TabsList className="bg-slate-900/50 border border-white/10">
              <TabsTrigger value="express" className="text-xs data-[state=active]:bg-white/10">Express.js</TabsTrigger>
              <TabsTrigger value="fastapi" className="text-xs data-[state=active]:bg-white/10">FastAPI</TabsTrigger>
              <TabsTrigger value="laravel" className="text-xs data-[state=active]:bg-white/10">Laravel</TabsTrigger>
            </TabsList>

            <TabsContent value="express" className="mt-3">
              <CodeBlock code={`// routes/webhook.ts
import express from 'express';
const router = express.Router();

router.post('/marketflow/webhook', (req, res) => {
  const { event, timestamp, data } = req.body;

  switch (event) {
    case 'message.received':
      console.log(\`📩 Nova mensagem de \${data.from}: \${data.body}\`);
      // Processar mensagem recebida
      // Ex: salvar no banco, notificar atendente, responder automaticamente
      break;

    case 'message.sent':
      console.log(\`✅ Mensagem enviada para \${data.to}\`);
      break;

    case 'connection.status':
      console.log(\`🔌 Conexão \${data.connection_id}: \${data.status}\`);
      break;

    case 'test':
      console.log('🧪 Webhook de teste recebido');
      break;
      
    default:
      console.log(\`❓ Evento desconhecido: \${event}\`);
  }

  // IMPORTANTE: sempre retornar 200
  res.status(200).json({ received: true });
});

export default router;`} />
            </TabsContent>

            <TabsContent value="fastapi" className="mt-3">
              <CodeBlock code={`# routes/webhook.py
from fastapi import APIRouter, Request

router = APIRouter()

@router.post("/marketflow/webhook")
async def handle_webhook(request: Request):
    body = await request.json()
    event = body.get("event")
    data = body.get("data", {})

    if event == "message.received":
        print(f"📩 Nova mensagem de {data['from']}: {data['body']}")
        # Processar mensagem
    elif event == "message.sent":
        print(f"✅ Mensagem enviada para {data['to']}")
    elif event == "connection.status":
        print(f"🔌 Conexão {data['connection_id']}: {data['status']}")

    return {"received": True}`} />
            </TabsContent>

            <TabsContent value="laravel" className="mt-3">
              <CodeBlock code={`<?php
// routes/api.php
Route::post('/marketflow/webhook', function (Request $request) {
    $event = $request->input('event');
    $data = $request->input('data');

    match($event) {
        'message.received' => Log::info("📩 Msg de {$data['from']}: {$data['body']}"),
        'message.sent' => Log::info("✅ Enviada para {$data['to']}"),
        'connection.status' => Log::info("🔌 {$data['connection_id']}: {$data['status']}"),
        default => Log::info("❓ Evento: $event"),
    };

    return response()->json(['received' => true]);
});`} />
            </TabsContent>
          </Tabs>

          <p className="text-sm text-slate-400 mt-2">
            Após criar o endpoint, configure o webhook via API:
          </p>
          <CodeBlock code={`curl -X PUT "${BASE_URL}/webhooks/configure" \\
  -H "X-Api-Key: sua_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "webhook_url": "https://seusite.com/api/marketflow/webhook",
    "webhook_events": ["message.received", "message.sent", "connection.status"]
  }'`} />
        </CardContent>
      </Card>

      {/* Step 6 - Full Flow Diagram */}
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">6</div>
            <div>
              <CardTitle className="text-white text-base">Fluxo Completo</CardTitle>
              <CardDescription className="text-slate-400">Resumo visual de como funciona a integração</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-950 border border-white/10 rounded-lg p-6 space-y-4 font-mono text-sm">
            <div className="space-y-2 text-slate-300">
              <p className="text-emerald-400 font-bold">═══ CONEXÃO WHATSAPP ═══</p>
              <p>1. Seu Sistema  →  POST /connections/start-signup  →  MarketFlow</p>
              <p>2. MarketFlow   →  Retorna meta_app_id + config_id  →  Seu Sistema</p>
              <p>3. Seu Sistema  →  FB.login() com config_id         →  Facebook Popup</p>
              <p>4. Facebook     →  postMessage (waba_id, phone_id)  →  Seu Sistema</p>
              <p>5. Seu Sistema  →  POST /connections/callback        →  MarketFlow</p>
              <p>6. MarketFlow   →  Salva conexão + retorna dados    →  Seu Sistema ✅</p>
            </div>
            <div className="border-t border-white/10 pt-4 space-y-2 text-slate-300">
              <p className="text-blue-400 font-bold">═══ ENVIO DE MENSAGENS ═══</p>
              <p>1. Seu Sistema  →  POST /messages/send              →  MarketFlow</p>
              <p>2. MarketFlow   →  Envia via Evolution/Meta             →  WhatsApp</p>
              <p>3. WhatsApp     →  Entrega ao contato               →  📱 Cliente</p>
            </div>
            <div className="border-t border-white/10 pt-4 space-y-2 text-slate-300">
              <p className="text-amber-400 font-bold">═══ RECEBIMENTO (WEBHOOK) ═══</p>
              <p>1. 📱 Cliente   →  Envia mensagem no WhatsApp       →  WhatsApp</p>
              <p>2. WhatsApp     →  Webhook                          →  MarketFlow</p>
              <p>3. MarketFlow   →  POST para sua webhook_url        →  Seu Sistema ✅</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 7 - Example Use Cases */}
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">7</div>
            <div>
              <CardTitle className="text-white text-base">Exemplos de Uso</CardTitle>
              <CardDescription className="text-slate-400">Cenários reais de integração</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <CodeBlock code={`// Exemplo 1: Enviar mensagem quando novo pedido é criado
async function onNewOrder(order) {
  await marketflow.sendMessage(
    order.customerPhone,
    \`🛒 Pedido #\${order.id} confirmado!\\n\\n\` +
    \`Total: R$ \${order.total}\\n\` +
    \`Previsão de entrega: \${order.estimatedDelivery}\\n\\n\` +
    \`Obrigado pela compra! 🎉\`
  );
}

// Exemplo 2: Responder automaticamente via webhook
app.post('/marketflow/webhook', async (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'message.received') {
    const message = data.body.toLowerCase();
    
    if (message.includes('status') || message.includes('pedido')) {
      const order = await db.findOrderByPhone(data.from);
      if (order) {
        await marketflow.sendMessage(
          data.from,
          \`📦 Seu pedido #\${order.id} está: \${order.status}\\n\` +
          \`Atualizado em: \${order.updatedAt}\`
        );
      }
    }
  }
  
  res.json({ received: true });
});

// Exemplo 3: Enviar template de boas-vindas para novo cliente
async function onNewCustomer(customer) {
  await marketflow.sendTemplate(
    customer.phone,
    'welcome_message',
    {
      language: 'pt_BR',
      components: [{
        type: 'body',
        parameters: [{ type: 'text', text: customer.name }]
      }]
    }
  );
}`} />
        </CardContent>
      </Card>
    </div>
  );
}
