import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Webhook, Plus, Clock, MessageSquare, User } from "lucide-react";

const Triggers = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gatilhos</h1>
          <p className="text-muted-foreground mt-1">Configure eventos que iniciam automações</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Novo Gatilho
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Palavra-chave</h3>
            <p className="text-sm text-muted-foreground">Ativa fluxo quando palavra é detectada</p>
          </div>
          <Button variant="outline" className="w-full">Criar Gatilho</Button>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Horário</h3>
            <p className="text-sm text-muted-foreground">Executa ação em horário específico</p>
          </div>
          <Button variant="outline" className="w-full">Criar Gatilho</Button>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Novo Lead</h3>
            <p className="text-sm text-muted-foreground">Ativa quando um novo lead é criado</p>
          </div>
          <Button variant="outline" className="w-full">Criar Gatilho</Button>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Webhook className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Webhook</h3>
            <p className="text-sm text-muted-foreground">Ativa via chamada HTTP externa</p>
          </div>
          <Button variant="outline" className="w-full">Criar Gatilho</Button>
        </Card>
      </div>

      <Card className="p-12 text-center">
        <Webhook className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Configure seus Gatilhos</h3>
        <p className="text-muted-foreground mb-4">
          Gatilhos iniciam automações baseadas em eventos específicos
        </p>
      </Card>
    </div>
  );
};

export default Triggers;