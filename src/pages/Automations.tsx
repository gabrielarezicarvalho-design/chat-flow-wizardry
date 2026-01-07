import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Plus, Clock, MessageSquare, Send } from "lucide-react";

const Automations = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Automações</h1>
          <p className="text-muted-foreground mt-1">Configure ações automatizadas para suas conversas</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nova Automação
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Respostas Automáticas</h3>
            <p className="text-sm text-muted-foreground">Configure mensagens automáticas por horário</p>
          </div>
          <Button variant="outline" className="w-full">Configurar</Button>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Auto-resposta WhatsApp</h3>
            <p className="text-sm text-muted-foreground">Respostas instantâneas no WhatsApp</p>
          </div>
          <Button variant="outline" className="w-full">Configurar</Button>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Send className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Envio em Massa</h3>
            <p className="text-sm text-muted-foreground">Envie mensagens para múltiplos contatos</p>
          </div>
          <Button variant="outline" className="w-full">Configurar</Button>
        </Card>
      </div>

      <Card className="p-12 text-center">
        <Zap className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Automações Inteligentes</h3>
        <p className="text-muted-foreground mb-4">
          Automatize suas conversas e economize tempo com fluxos inteligentes
        </p>
      </Card>
    </div>
  );
};

export default Automations;