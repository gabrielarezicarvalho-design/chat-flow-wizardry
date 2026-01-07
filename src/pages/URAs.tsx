import { useState } from "react";
import { Card } from "@/components/ui/card";
import { FlowCanvas } from "@/components/uras/FlowCanvas";
import { NodePalette } from "@/components/uras/NodePalette";
import { toast } from "sonner";

const URAs = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const handleSelectNode = (nodeType: string) => {
    setSelectedNode(nodeType);
    toast.info(`Bloco selecionado. Clique no canvas para adicionar.`);
  };

  const handleNodeAdded = () => {
    setSelectedNode(null);
  };

  const handleSaveFlow = (flowData: any) => {
    // Salvar no localStorage
    const existingFlows = JSON.parse(localStorage.getItem('uras') || '[]');
    const newFlow = {
      id: Date.now().toString(),
      name: `URA ${existingFlows.length + 1}`,
      data: flowData,
      createdAt: new Date().toISOString(),
    };
    existingFlows.push(newFlow);
    localStorage.setItem('uras', JSON.stringify(existingFlows));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Flow Builder - URAs</h1>
        <p className="text-muted-foreground mt-1">Crie fluxos de atendimento personalizados</p>
      </div>

      <div className="flex gap-6">
        <NodePalette onSelectNode={handleSelectNode} selectedNode={selectedNode} />
        <Card className="flex-1 p-6">
          <FlowCanvas 
            onSave={handleSaveFlow} 
            selectedNodeType={selectedNode}
            onNodeAdded={handleNodeAdded}
          />
        </Card>
      </div>
    </div>
  );
};

export default URAs;
