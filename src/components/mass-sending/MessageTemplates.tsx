import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Copy, Trash2, FileText, Gift, Sparkles, Tag, User, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  variables: string[];
  is_default?: boolean;
}

const defaultTemplates: MessageTemplate[] = [
  {
    id: "default-1",
    name: "Boas-vindas",
    content: "Olá {nome}! 👋\n\nSeja bem-vindo(a) à nossa comunidade! Estamos muito felizes em ter você conosco.\n\nQualquer dúvida, estamos à disposição!",
    category: "Boas-vindas",
    variables: ["nome"],
    is_default: true,
  },
  {
    id: "default-2",
    name: "Aniversário",
    content: "🎂 Feliz Aniversário, {nome}! 🎉\n\nNeste dia especial, {data_aniversario}, queremos desejar muitas felicidades!\n\nComo presente, preparamos uma surpresa especial para você! 🎁",
    category: "Aniversário",
    variables: ["nome", "data_aniversario"],
    is_default: true,
  },
  {
    id: "default-3",
    name: "Promoção Especial",
    content: "🔥 {nome}, temos uma oferta exclusiva para você!\n\nApenas até {data_limite}:\n✅ Desconto especial\n✅ Frete grátis\n✅ Brindes exclusivos\n\nAproveite! 🛒",
    category: "Promoção",
    variables: ["nome", "data_limite"],
    is_default: true,
  },
  {
    id: "default-4",
    name: "Lembrete",
    content: "Olá {nome}! 📢\n\nEste é um lembrete sobre {assunto}.\n\nData: {data}\nHorário: {horario}\n\nNão esqueça! ⏰",
    category: "Lembrete",
    variables: ["nome", "assunto", "data", "horario"],
    is_default: true,
  },
  {
    id: "default-5",
    name: "Agradecimento",
    content: "Olá {nome}! 💚\n\nAgradecemos por escolher nossos serviços!\n\nSua satisfação é nossa prioridade. Se precisar de algo, estamos aqui!\n\nAté breve! 👋",
    category: "Agradecimento",
    variables: ["nome"],
    is_default: true,
  },
  {
    id: "default-6",
    name: "Black Friday",
    content: "🖤 BLACK FRIDAY, {nome}! 🖤\n\nOs melhores descontos do ano estão aqui!\n\n⚡ Até 70% OFF\n⚡ Frete Grátis\n⚡ Parcelamento especial\n\nVálido até {data_limite}! Corra! 🏃",
    category: "Promoção",
    variables: ["nome", "data_limite"],
    is_default: true,
  },
];

const categoryIcons: Record<string, React.ReactNode> = {
  "Boas-vindas": <User className="w-4 h-4" />,
  "Aniversário": <Gift className="w-4 h-4" />,
  "Promoção": <Tag className="w-4 h-4" />,
  "Lembrete": <Calendar className="w-4 h-4" />,
  "Agradecimento": <Sparkles className="w-4 h-4" />,
};

const categoryColors: Record<string, string> = {
  "Boas-vindas": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "Aniversário": "bg-pink-500/10 text-pink-500 border-pink-500/20",
  "Promoção": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "Lembrete": "bg-violet-500/10 text-violet-500 border-violet-500/20",
  "Agradecimento": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

interface MessageTemplatesProps {
  onSelectTemplate: (content: string) => void;
}

export const MessageTemplates = ({ onSelectTemplate }: MessageTemplatesProps) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", content: "", category: "Outros" });
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const { companyId } = useCompanyId();

  const { data: dbTemplates = [], isLoading } = useQuery({
    queryKey: ['message-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        content: t.content,
        category: t.category,
        variables: t.variables || [],
        is_default: false,
      })) as MessageTemplate[];
    },
  });

  const allTemplates = [...dbTemplates, ...defaultTemplates];

  const createMutation = useMutation({
    mutationFn: async (template: { name: string; content: string; category: string; variables: string[] }) => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) throw new Error("Não autenticado");

      const insertData: any = {
        user_id: userId,
        name: template.name,
        content: template.content,
        category: template.category,
        variables: template.variables,
      };
      if (companyId) insertData.company_id = companyId;

      const { error } = await supabase.from('message_templates').insert([insertData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success("Template criado e salvo!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar template");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('message_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success("Template removido!");
    },
    onError: () => {
      toast.error("Erro ao remover template");
    },
  });

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Template copiado!");
  };

  const handleUseTemplate = (content: string) => {
    onSelectTemplate(content);
    toast.success("Template aplicado!");
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast.error("Preencha nome e conteúdo");
      return;
    }

    const variables = (newTemplate.content.match(/\{([^}]+)\}/g) || []).map((v) =>
      v.replace(/[{}]/g, "")
    );

    createMutation.mutate({
      name: newTemplate.name,
      content: newTemplate.content,
      category: newTemplate.category,
      variables,
    });

    setNewTemplate({ name: "", content: "", category: "Outros" });
    setShowCreateDialog(false);
  };

  const filteredTemplates = allTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Templates de Mensagem
          </h2>
          <p className="text-muted-foreground text-sm">
            Use variáveis como {"{nome}"}, {"{data_aniversario}"} para personalização
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome do Template</Label>
                <Input
                  placeholder="Ex: Promoção de Natal"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input
                  placeholder="Ex: Promoção"
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Conteúdo da Mensagem</Label>
                <Textarea
                  placeholder="Use {nome}, {data}, etc. para variáveis dinâmicas"
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  className="mt-1 min-h-[150px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Variáveis disponíveis: {"{nome}"}, {"{telefone}"}, {"{email}"},{" "}
                  {"{data_aniversario}"}, {"{data}"}, {"{horario}"}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateTemplate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Criar Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Input
        placeholder="Buscar templates..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-md"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="p-4 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    {categoryIcons[template.category] || <FileText className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{template.name}</h3>
                    <Badge
                      variant="outline"
                      className={categoryColors[template.category] || "bg-muted"}
                    >
                      {template.category}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 mb-3 max-h-32 overflow-y-auto">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {template.content}
                </p>
              </div>

              {template.variables.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.variables.map((v) => (
                    <Badge key={v} variant="secondary" className="text-xs">
                      {"{" + v + "}"}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleCopy(template.content)}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copiar
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleUseTemplate(template.content)}
                >
                  Usar Template
                </Button>
                {!template.is_default && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(template.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
