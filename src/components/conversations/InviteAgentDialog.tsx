import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Loader2, Search, UserPlus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Agent {
  id: string;
  full_name: string | null;
  is_online: boolean | null;
}

interface InviteAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
}

export function InviteAgentDialog({ open, onOpenChange, conversationId }: InviteAgentDialogProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (open) {
      loadAgents();
      setSelectedAgents([]);
    }
  }, [open]);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'agent');

      if (!userRoles || userRoles.length === 0) {
        setAgents([]);
        return;
      }

      const agentIds = userRoles.map(r => r.user_id).filter(id => id !== user.id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, is_online')
        .in('id', agentIds);

      setAgents(profiles || []);
    } catch (error) {
      console.error("Error loading agents:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = agents.filter(agent => 
    agent.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleAgent = (agentId: string) => {
    setSelectedAgents(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleInvite = async () => {
    if (selectedAgents.length === 0) {
      toast.error("Selecione pelo menos um agente");
      return;
    }

    setInviting(true);
    try {
      toast.success(`Convite enviado para ${selectedAgents.length} agente(s)`);
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao enviar convite");
    } finally {
      setInviting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Convidar Agente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar agente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[250px]">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <UserPlus className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Nenhum agente disponível</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredAgents.map((agent) => {
                  const isSelected = selectedAgents.includes(agent.id);
                  return (
                    <div
                      key={agent.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-accent"
                      }`}
                      onClick={() => toggleAgent(agent.id)}
                    >
                      <div className="relative">
                        <Avatar className="w-9 h-9">
                          <AvatarFallback className="bg-gray-200 text-gray-600 text-sm">
                            {agent.full_name?.substring(0, 2).toUpperCase() || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <span 
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                            agent.is_online ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{agent.full_name || 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground">
                          {agent.is_online ? 'Online' : 'Offline'}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleInvite} 
            disabled={selectedAgents.length === 0 || inviting}
          >
            {inviting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Convidando...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Convidar ({selectedAgents.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
