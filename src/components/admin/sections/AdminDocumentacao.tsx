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
    description: "Envia uma mensagem WhatsApp via conexão UZAPI.",
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

  const filtered = activeCategory === "all"
    ? endpoints
    : endpoints.filter((e) => e.permission === activeCategory || e.path.startsWith(`/${activeCategory}`));

  return (
    <div className="p-6 space-y-6">
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
    </div>
  );
}
