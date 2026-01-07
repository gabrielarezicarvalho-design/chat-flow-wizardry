import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useFlows } from '@/hooks/useFlows';
import { useConnections } from '@/hooks/useConnections';
import { CreateURADialog } from '@/components/flows/CreateURADialog';
import { 
  Plus, 
  Search, 
  GitBranch, 
  MoreVertical, 
  Trash2, 
  Copy, 
  Edit,
  Loader2,
  Zap,
  Activity,
  Link,
  MessageSquare,
  Cog
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const FlowsList = () => {
  const navigate = useNavigate();
  const { flows, isLoading, createFlow, updateFlow, deleteFlow } = useFlows();
  const { connections } = useConnections();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteFlowId, setDeleteFlowId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const filteredFlows = flows.filter((flow) =>
    flow.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeFlowsCount = flows.filter(f => f.status === 'active').length;

  // Get connection name for a flow
  const getConnectionName = (connectionId: string | null) => {
    if (!connectionId) return null;
    const conn = connections.find(c => c.id === connectionId);
    return conn?.name || null;
  };

  const handleCreateURA = async (ura: { name: string; type: "chat" | "automation"; trigger: string }) => {
    const newFlow = await createFlow.mutateAsync({
      name: ura.name,
      trigger: ura.trigger,
      flow_json: {
        type: ura.type,
        nodes: [],
        edges: []
      }
    });
    
    if (newFlow?.id) {
      navigate(`/flow-builder/${newFlow.id}`);
    }
  };

  const handleToggleStatus = async (e: React.MouseEvent, flow: any) => {
    e.stopPropagation();
    const newStatus = flow.status === 'active' ? 'inactive' : 'active';
    await updateFlow.mutateAsync({ 
      id: flow.id, 
      updates: { status: newStatus } 
    });
    toast.success(newStatus === 'active' ? 'Fluxo ativado!' : 'Fluxo desativado');
  };

  const handleDuplicateFlow = async (flow: any) => {
    await createFlow.mutateAsync({
      name: `${flow.name} (Cópia)`,
      trigger: flow.trigger,
      flow_json: flow.flow_json,
    });
  };

  const handleDeleteFlow = async () => {
    if (deleteFlowId) {
      await deleteFlow.mutateAsync(deleteFlowId);
      setDeleteFlowId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Flow Builder</h1>
          <p className="text-muted-foreground mt-1">Crie fluxos de atendimento automatizado</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar URA
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <GitBranch className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{flows.length}</p>
            <p className="text-xs text-muted-foreground">Total de fluxos</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <Zap className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{activeFlowsCount}</p>
            <p className="text-xs text-muted-foreground">Fluxos ativos</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Activity className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {flows.reduce((acc, f) => acc + (f.executions_today || 0), 0)}
            </p>
            <p className="text-xs text-muted-foreground">Execuções hoje</p>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fluxos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredFlows.length === 0 ? (
        <Card className="p-12 text-center">
          <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum fluxo encontrado</h3>
          <p className="text-muted-foreground mb-4">
            Crie seu primeiro fluxo de atendimento automatizado
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar URA
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFlows.map((flow) => {
            const connectionName = getConnectionName(flow.connection_id);
            const flowType = (flow.flow_json as any)?.type || 'chat';
            const isAutomation = flowType === 'automation';
            return (
            <Card
              key={flow.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/flow-builder/${flow.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isAutomation ? 'bg-orange-500/10' : flow.status === 'active' ? 'bg-green-500/10' : 'bg-muted'}`}>
                    {isAutomation ? (
                      <Cog className="h-5 w-5 text-orange-500" />
                    ) : (
                      <MessageSquare className={`h-5 w-5 ${flow.status === 'active' ? 'text-green-500' : 'text-muted-foreground'}`} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{flow.name}</h3>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${isAutomation ? 'border-orange-500 text-orange-500' : 'border-primary text-primary'}`}>
                        {isAutomation ? 'Automação' : 'Chat'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Trigger: {flow.trigger}
                    </p>
                    {connectionName && (
                      <div className="flex items-center gap-1 mt-1">
                        <Link className="h-3 w-3 text-primary" />
                        <span className="text-xs text-primary">{connectionName}</span>
                      </div>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/flow-builder/${flow.id}`); }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicateFlow(flow); }}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteFlowId(flow.id); }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={flow.status === 'active'}
                    onCheckedChange={() => {}}
                    onClick={(e) => handleToggleStatus(e, flow)}
                  />
                  <span className={`text-xs ${flow.status === 'active' ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {flow.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {flow.executions_today ? (
                    <Badge variant="outline" className="text-xs">
                      {flow.executions_today} exec.
                    </Badge>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {flow.created_at && format(new Date(flow.created_at), "dd 'de' MMM", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </Card>
          );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteFlowId} onOpenChange={() => setDeleteFlowId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fluxo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O fluxo será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFlow} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateURADialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateURA={handleCreateURA}
      />
    </div>
  );
};

export default FlowsList;
