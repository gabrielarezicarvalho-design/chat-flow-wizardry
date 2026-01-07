import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgents } from "@/hooks/useAgents";
import { useDepartments } from "@/hooks/useDepartments";
import { supabase } from "@/integrations/supabase/client";
import { User, Users, Bot } from "lucide-react";

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransfer: (agentId?: string, departmentId?: string, humanAgentId?: string) => void;
}

export const TransferDialog = ({ open, onOpenChange, onTransfer }: TransferDialogProps) => {
  const { agents } = useAgents();
  const { departments } = useDepartments();
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedHumanAgent, setSelectedHumanAgent] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [activeTab, setActiveTab] = useState('ai');
  const [humanAgents, setHumanAgents] = useState<any[]>([]);

  // Carregar atendentes humanos (profiles com role 'agent')
  useEffect(() => {
    const loadHumanAgents = async () => {
      const { data } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          is_online,
          status,
          user_roles!inner(role)
        `)
        .eq('user_roles.role', 'agent');
      
      if (data) {
        setHumanAgents(data);
      }
    };
    
    if (open) {
      loadHumanAgents();
    }
  }, [open]);

  // Filtrar agentes IA ativos
  const activeAgents = agents.filter((a: any) => a.status === 'active');

  const handleTransfer = () => {
    if (activeTab === 'ai') {
      // Transferir para assistente IA
      onTransfer(selectedAgent || undefined, undefined, undefined);
    } else if (activeTab === 'agent') {
      // Transferir diretamente para atendente humano
      onTransfer(undefined, undefined, selectedHumanAgent || undefined);
    } else {
      // Transferir para fila do departamento
      onTransfer(undefined, selectedDepartment || undefined, undefined);
    }
    setSelectedAgent('');
    setSelectedHumanAgent('');
    setSelectedDepartment('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir Conversa</DialogTitle>
          <DialogDescription>
            Escolha para onde deseja transferir esta conversa
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              IA
            </TabsTrigger>
            <TabsTrigger value="agent" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Atendente
            </TabsTrigger>
            <TabsTrigger value="queue" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Fila
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-4 mt-4">
            <div>
              <Label>Selecione o Assistente IA</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um assistente IA" />
                </SelectTrigger>
                <SelectContent>
                  {activeAgents.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      Nenhum assistente IA ativo
                    </SelectItem>
                  ) : (
                    activeAgents.map((agent: any) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-primary" />
                          {agent.name}
                          <span className="text-xs text-muted-foreground">({agent.platform})</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                O assistente IA responderá automaticamente as mensagens do cliente
              </p>
            </div>
            <Button 
              onClick={handleTransfer} 
              className="w-full"
              disabled={!selectedAgent}
            >
              <Bot className="w-4 h-4 mr-2" />
              Transferir para IA
            </Button>
          </TabsContent>

          <TabsContent value="agent" className="space-y-4 mt-4">
            <div>
              <Label>Selecione o Atendente</Label>
              <Select value={selectedHumanAgent} onValueChange={setSelectedHumanAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um atendente" />
                </SelectTrigger>
                <SelectContent>
                  {humanAgents.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      Nenhum atendente disponível
                    </SelectItem>
                  ) : (
                    humanAgents.map((agent: any) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${agent.is_online ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                          <User className="w-4 h-4 text-muted-foreground" />
                          {agent.full_name || 'Sem nome'}
                          {agent.is_online && (
                            <span className="text-xs text-green-600">online</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                A conversa irá diretamente para os chats do atendente selecionado
              </p>
            </div>
            <Button 
              onClick={handleTransfer} 
              className="w-full"
              disabled={!selectedHumanAgent}
            >
              <User className="w-4 h-4 mr-2" />
              Transferir para Atendente
            </Button>
          </TabsContent>

          <TabsContent value="queue" className="space-y-4 mt-4">
            <div>
              <Label>Selecione o Departamento/Fila</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departments.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      Nenhum departamento disponível
                    </SelectItem>
                  ) : (
                    departments.map((dept: any) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          {dept.name}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                A conversa será distribuída para o próximo agente disponível
              </p>
            </div>
            <Button 
              onClick={handleTransfer} 
              className="w-full"
              disabled={!selectedDepartment}
            >
              Transferir para Fila
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};