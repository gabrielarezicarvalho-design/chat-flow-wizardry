import { useState } from "react";
import { useFlows } from "@/hooks/useFlows";
import { useConnections } from "@/hooks/useConnections";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Workflow, Trash2, Edit, Play, Pause } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CreateURADialog } from "@/components/flows/CreateURADialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const FlowsList = () => {
  const navigate = useNavigate();
  const { flows, isLoading, createFlow, deleteFlow, updateFlow } = useFlows();
  const { connections } = useConnections();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteFlowId, setDeleteFlowId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const filteredFlows = flows.filter((flow) =>
    flow.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeFlowsCount = flows.filter(f => f.is_active).length;

  const handleCreateURA = async (ura: { name: string; type: "chat" | "automation"; trigger: string }) => {
    const newFlow = await createFlow.mutateAsync({
      name: ura.name,
      trigger_type: ura.trigger,
      flow_data: { type: ura.type, nodes: [], edges: [] },
      is_active: false,
    });
    if (newFlow?.id) {
      navigate(`/flowbuilder/${newFlow.id}`);
    }
    setShowCreateDialog(false);
  };

  const handleDelete = async () => {
    if (deleteFlowId) {
      await deleteFlow.mutateAsync(deleteFlowId);
      setDeleteFlowId(null);
      toast.success("Fluxo excluído com sucesso!");
    }
  };

  const toggleFlowStatus = async (flow: any) => {
    await updateFlow.mutateAsync({
      id: flow.id,
      updates: { is_active: !flow.is_active }
    });
    toast.success(flow.is_active ? "Fluxo desativado" : "Fluxo ativado");
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
          <h1 className="text-2xl font-bold text-foreground">Fluxos de Atendimento</h1>
          <p className="text-muted-foreground">{flows.length} fluxos • {activeFlowsCount} ativos</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Fluxo
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar fluxos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Flows Grid */}
      {filteredFlows.length === 0 ? (
        <Card className="p-12 text-center">
          <Workflow className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Nenhum fluxo encontrado</h3>
          <p className="text-muted-foreground mb-4">Crie seu primeiro fluxo de atendimento</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Fluxo
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFlows.map((flow) => (
            <Card key={flow.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Workflow className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{flow.name}</h3>
                      <p className="text-sm text-muted-foreground">{flow.trigger_type || 'Manual'}</p>
                    </div>
                  </div>
                  <Badge variant={flow.is_active ? "default" : "secondary"}>
                    {flow.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {flow.description || "Sem descrição"}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/flowbuilder/${flow.id}`)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleFlowStatus(flow)}
                  >
                    {flow.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteFlowId(flow.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateURADialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateURA}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteFlowId} onOpenChange={() => setDeleteFlowId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Fluxo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este fluxo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FlowsList;
