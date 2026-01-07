import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Edit, Plus, Repeat, Target, Calendar, DollarSign, HelpCircle, Trash2, Zap } from "lucide-react";
import { useFlows } from "@/hooks/useFlows";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CreateFlowDialog } from "@/components/flows/CreateFlowDialog";
import { FeatureGate } from "@/components/FeatureGate";

const templates = [
  { title: "Boas-vindas", icon: Repeat, description: "Saudação automática para novos contatos" },
  { title: "Qualificação de Leads", icon: Target, description: "Identifica leads qualificados automaticamente" },
  { title: "Agendamento", icon: Calendar, description: "Agenda reuniões e compromissos" },
  { title: "Fluxo de Vendas", icon: DollarSign, description: "Guia o cliente até a compra" },
  { title: "FAQ Automático", icon: HelpCircle, description: "Responde perguntas frequentes" },
  { title: "Criar Personalizado", icon: Plus, description: "Crie um fluxo do zero" },
];

const flowIcons: Record<string, any> = {
  "Primeira mensagem": Repeat,
  "Palavra-chave: 'orçamento'": Target,
};

const FlowsContent = () => {
  const { flows, isLoading, deleteFlow, createFlow } = useFlows();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>();

  const handleDeleteFlow = (flowId: string) => {
    deleteFlow.mutate(flowId);
  };

  const handleTestFlow = (flowName: string) => {
    toast.success(`Testando fluxo: ${flowName}`);
  };

  const handleCreateFlow = (flow: any) => {
    createFlow.mutate(flow);
  };

  const handleTemplateClick = (title: string) => {
    setSelectedTemplate(title);
    setIsCreateDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fluxos de IA</h1>
          <p className="text-muted-foreground mt-1">Automatize conversas com fluxos inteligentes</p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Criar Fluxo
        </Button>
      </div>

      {/* Active Flows */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">Fluxos Ativos</h2>
        {flows.length === 0 ? (
          <Card className="p-12 text-center">
            <Zap className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">Nenhum fluxo criado</h2>
            <p className="text-muted-foreground mb-4">
              Crie fluxos de automação para otimizar seu atendimento
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Fluxo
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flows.map((flow) => {
              const Icon = flowIcons[flow.trigger] || Repeat;
              
              return (
                <Card key={flow.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-primary/10">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{flow.name}</h3>
                        <p className="text-sm text-muted-foreground">{flow.trigger}</p>
                      </div>
                    </div>
                    <Badge className="bg-success">{flow.status === "active" ? "Ativo" : "Inativo"}</Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-muted-foreground">Execuções hoje</span>
                    <span className="font-semibold text-foreground">{flow.executions_today}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleTestFlow(flow.name)}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Testar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => toast.info("Funcionalidade em desenvolvimento")}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="w-full">
                          <Trash2 className="w-4 h-4 mr-1" />
                          Excluir Fluxo
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O fluxo "{flow.name}" será excluído permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteFlow(flow.id)} className="bg-destructive hover:bg-destructive/90">
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Templates */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">Templates de Fluxo</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card 
              key={template.title} 
              className="p-6 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group"
              onClick={() => handleTemplateClick(template.title)}
            >
              <div className="flex flex-col items-center text-center">
                <div className="p-4 rounded-2xl bg-primary/10 group-hover:bg-primary group-hover:scale-110 transition-all mb-4">
                  <template.icon className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{template.title}</h3>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <CreateFlowDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateFlow={handleCreateFlow}
        template={selectedTemplate}
      />
    </div>
  );
};

const Flows = () => {
  return (
    <FeatureGate feature="flows_basic">
      <FlowsContent />
    </FeatureGate>
  );
};

export default Flows;
