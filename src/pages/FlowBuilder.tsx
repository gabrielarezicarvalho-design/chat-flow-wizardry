import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Node, Edge } from '@xyflow/react';
import { FlowCanvas } from '@/components/flowbuilder/FlowCanvas';
import { NodePaletteNew } from '@/components/flowbuilder/NodePaletteNew';
import { NodeEditorNew } from '@/components/flowbuilder/NodeEditorNew';
import { FlowBuilderHeader } from '@/components/flowbuilder/FlowBuilderHeader';
import { FlowTester } from '@/components/flowbuilder/FlowTester';
import { validateFlow } from '@/components/flowbuilder/FlowValidator';
import { TemplateSelector } from '@/components/flowbuilder/TemplateSelector';
import { FlowTemplate } from '@/components/flowbuilder/FlowTemplates';
import { useFlows } from '@/hooks/useFlows';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const FlowBuilder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { flows, createFlow, updateFlow, isLoading } = useFlows();
  
  const [flowName, setFlowName] = useState('Novo Fluxo');
  const [flowStatus, setFlowStatus] = useState<string>('inactive');
  const [flowType, setFlowType] = useState<string>('chat');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isTesterOpen, setIsTesterOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  const validationErrors = validateFlow(nodes, edges);
  const hasErrors = validationErrors.some(e => e.type === 'error');

  // Load existing flow
  useEffect(() => {
    if (id && flows.length > 0) {
      const flow = flows.find((f) => f.id === id);
      if (flow) {
        setFlowName(flow.name);
        setFlowStatus(flow.is_active ? 'active' : 'inactive');
        const flowJson = flow.flow_data as any;
        if (flowJson?.type) setFlowType(flowJson.type);
        if (flowJson?.nodes) setNodes(flowJson.nodes);
        if (flowJson?.edges) setEdges(flowJson.edges);
      }
    }
  }, [id, flows]);

  // Auto-save every 5 seconds
  useEffect(() => {
    if (id && nodes.length > 0) {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
      autoSaveRef.current = setTimeout(() => {
        handleSave(true);
      }, 5000);
    }

    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, [nodes, edges, id]);

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleNodesChange = useCallback((newNodes: Node[]) => {
    setNodes(newNodes);
  }, []);

  const handleEdgesChange = useCallback((newEdges: Edge[]) => {
    setEdges(newEdges);
  }, []);

  const handleNodeSelect = useCallback((node: Node | null) => {
    setSelectedNode(node);
  }, []);

  const handleNodeUpdate = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      )
    );
  }, []);

  const handleSave = async (isAutoSave = false) => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const flowData = {
        name: flowName,
        trigger_type: 'message',
        flow_data: { type: flowType, nodes, edges },
      };

      if (id) {
        await updateFlow.mutateAsync({ id, updates: flowData });
      } else {
        const result = await createFlow.mutateAsync(flowData);
        if (result?.id && !isAutoSave) {
          navigate(`/flow-builder/${result.id}`, { replace: true });
        }
      }

      if (!isAutoSave) {
        toast.success('Fluxo salvo com sucesso!');
      }
    } catch (error: any) {
      if (!isAutoSave) {
        toast.error('Erro ao salvar fluxo');
      }
    }

    setIsSaving(false);
  };

  const handlePublish = async () => {
    if (hasErrors) {
      toast.error('Corrija os erros antes de publicar');
      return;
    }
    
    try {
      const flowData = {
        name: flowName,
        trigger_type: 'message',
        flow_data: { type: flowType, nodes, edges },
        is_active: true
      };

      if (id) {
        await updateFlow.mutateAsync({ id, updates: flowData });
        setFlowStatus('active');
        toast.success('Fluxo publicado e ativo!');
      } else {
        await handleSave();
        toast.success('Fluxo salvo! Edite novamente para publicar.');
      }
    } catch (error) {
      toast.error('Erro ao publicar fluxo');
    }
  };

  const handleSelectTemplate = (template: FlowTemplate) => {
    setFlowName(template.name);
    setNodes(template.nodes);
    setEdges(template.edges);
    // Set type based on template category
    setFlowType(template.category === 'automacao' ? 'automation' : 'chat');
    setIsTemplateOpen(false);
    toast.success(`Template "${template.name}" carregado!`);
  };

  if (isLoading && id) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col bg-muted/30">
      {/* Header */}
      <FlowBuilderHeader
        flowName={flowName}
        setFlowName={setFlowName}
        flowStatus={flowStatus}
        validationErrors={validationErrors}
        isSaving={isSaving}
        onBack={() => navigate('/flows')}
        onSave={() => handleSave(false)}
        onPublish={handlePublish}
        onOpenTemplates={() => setIsTemplateOpen(true)}
        onOpenTester={() => setIsTesterOpen(true)}
        nodes={nodes}
        edges={edges}
      />

      {/* Palette */}
      <NodePaletteNew onDragStart={handleDragStart} />
      
      {/* Canvas + Editor */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onNodeSelect={handleNodeSelect}
          />
        </div>

        {selectedNode && (
          <NodeEditorNew
            node={selectedNode}
            onUpdate={handleNodeUpdate}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>

      {/* Modals */}
      <FlowTester
        open={isTesterOpen}
        onOpenChange={setIsTesterOpen}
        nodes={nodes}
        edges={edges}
        flowStatus={flowStatus}
      />

      <TemplateSelector
        open={isTemplateOpen}
        onOpenChange={setIsTemplateOpen}
        onSelectTemplate={handleSelectTemplate}
      />
    </div>
  );
};

export default FlowBuilder;
