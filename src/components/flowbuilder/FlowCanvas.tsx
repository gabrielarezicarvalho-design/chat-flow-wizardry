import { useCallback, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { StartNode } from './nodes/StartNode';
import { MessageNode } from './nodes/MessageNode';
import { MenuNode } from './nodes/MenuNode';
import { ConditionNode } from './nodes/ConditionNode';
import { CodeNode } from './nodes/CodeNode';
import { ForwardNode } from './nodes/ForwardNode';
import { DelayNode } from './nodes/DelayNode';
import { HttpNode } from './nodes/HttpNode';
import { TagNode } from './nodes/TagNode';
import { InputNode } from './nodes/InputNode';
import { SmartFormNode } from './nodes/SmartFormNode';
import { SendFormNode } from './nodes/SendFormNode';
import { ErrorNode } from './nodes/ErrorNode';
import { BusinessHoursNode } from './nodes/BusinessHoursNode';
import AutomationNode from './nodes/AutomationNode';

import AiAgentNode from './nodes/AiAgentNode';
import { toast } from 'sonner';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuShortcut,
} from '@/components/ui/context-menu';
import { Copy, Trash2, Edit } from 'lucide-react';

const nodeTypes = {
  start: StartNode,
  message: MessageNode,
  menu: MenuNode,
  condition: ConditionNode,
  code: CodeNode,
  forward: ForwardNode,
  delay: DelayNode,
  http: HttpNode,
  tag: TagNode,
  input: InputNode,
  smartForm: SmartFormNode,
  sendForm: SendFormNode,
  error: ErrorNode,
  businessHours: BusinessHoursNode,
  aiAgent: AiAgentNode,
  automation: AutomationNode,
};

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onNodeSelect?: (node: Node | null) => void;
}

// Get edge color based on source handle
const getEdgeColor = (sourceHandle?: string | null) => {
  if (sourceHandle === 'yes' || sourceHandle === 'success') return '#22c55e'; // green
  if (sourceHandle === 'no') return '#ef4444'; // red
  if (sourceHandle === 'error') return '#ef4444'; // red for error paths
  if (sourceHandle === 'fallback') return '#f97316'; // orange for fallback/transfer
  if (sourceHandle?.startsWith('option-')) return '#22c55e'; // green for menu options
  return '#3b82f6'; // blue default
};

const FlowCanvasInner = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
}: FlowCanvasProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [contextMenuNode, setContextMenuNode] = useState<Node | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Handle node changes from React Flow
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const updatedNodes = applyNodeChanges(changes, nodes);
      onNodesChange(updatedNodes as Node[]);
    },
    [nodes, onNodesChange]
  );

  // Handle edge changes from React Flow
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const updatedEdges = applyEdgeChanges(changes, edges);
      onEdgesChange(updatedEdges as Edge[]);
    },
    [edges, onEdgesChange]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const selectedNodes = nodes.filter((n) => n.selected);
      if (selectedNodes.length === 0) return;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if ((event.target as HTMLElement).tagName === 'INPUT' || 
            (event.target as HTMLElement).tagName === 'TEXTAREA') {
          return;
        }
        event.preventDefault();
        deleteSelectedNodes();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault();
        duplicateSelectedNodes();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges]);

  const deleteSelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedNodeIds = selectedNodes.map((n) => n.id);
    
    const hasStartNode = selectedNodes.some((n) => n.type === 'start');
    if (hasStartNode) {
      toast.error('Não é possível excluir o bloco de Início');
      return;
    }

    const newNodes = nodes.filter((n) => !selectedNodeIds.includes(n.id));
    const newEdges = edges.filter((e) => !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target));
    
    onNodesChange(newNodes);
    onEdgesChange(newEdges);
    onNodeSelect?.(null);
    toast.success('Bloco(s) excluído(s)');
  }, [nodes, edges, onNodesChange, onEdgesChange, onNodeSelect]);

  const duplicateSelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    
    const hasStartNode = selectedNodes.some((n) => n.type === 'start');
    if (hasStartNode) {
      toast.error('Não é possível duplicar o bloco de Início');
      return;
    }

    const newNodes = selectedNodes.map((node) => ({
      ...node,
      id: `${node.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
      selected: false,
      data: { ...node.data },
    }));

    onNodesChange([...nodes.map((n) => ({ ...n, selected: false })), ...newNodes]);
    toast.success('Bloco(s) duplicado(s)');
  }, [nodes, onNodesChange]);

  const deleteNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node?.type === 'start') {
      toast.error('Não é possível excluir o bloco de Início');
      return;
    }

    const newNodes = nodes.filter((n) => n.id !== nodeId);
    const newEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
    
    onNodesChange(newNodes);
    onEdgesChange(newEdges);
    onNodeSelect?.(null);
    toast.success('Bloco excluído');
  }, [nodes, edges, onNodesChange, onEdgesChange, onNodeSelect]);

  const duplicateNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.type === 'start') {
      toast.error('Não é possível duplicar o bloco de Início');
      return;
    }

    const newNode: Node = {
      ...node,
      id: `${node.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
      selected: false,
      data: { ...node.data },
    };

    onNodesChange([...nodes, newNode]);
    toast.success('Bloco duplicado');
  }, [nodes, onNodesChange]);

  const onConnect = useCallback(
    (params: Connection) => {
      const edgeColor = getEdgeColor(params.sourceHandle);
      
      const newEdge: Edge = {
        ...params,
        id: `e-${params.source}-${params.target}-${Date.now()}`,
        source: params.source || '',
        target: params.target || '',
        type: 'smoothstep',
        animated: false,
        style: { 
          strokeWidth: 2.5, 
          stroke: edgeColor,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
          width: 16,
          height: 16,
        },
      };
      onEdgesChange([...edges, newEdge]);
    },
    [edges, onEdgesChange]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      if (type === 'start' && nodes.some((n) => n.type === 'start')) {
        toast.error('Só pode haver um bloco de Início!');
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: getDefaultLabel(type) },
      };

      onNodesChange([...nodes, newNode]);
    },
    [nodes, screenToFlowPosition, onNodesChange]
  );

  const getDefaultLabel = (type: string) => {
    const labels: Record<string, string> = {
      start: 'Início',
      message: 'Nova mensagem',
      menu: 'Menu de Opções',
      condition: 'Nova condição',
      businessHours: 'Verificar Horário',
      errorHandler: 'Regras de Erro',
      code: 'Código customizado',
      smartForm: 'Smart Form',
      sendForm: 'Enviar Formulário',
      forward: 'Encaminhar',
      delay: 'Aguardar',
      http: 'HTTP Request',
      tag: 'Nova tag',
      input: 'Aguardar resposta',
      error: 'Erro',
      automation: 'Executar Automação',
    };
    return labels[type] || 'Novo bloco';
  };

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect?.(node);
    },
    [onNodeSelect]
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenuNode(node);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  // Process edges to add colors based on source handle
  const styledEdges = edges.map(edge => ({
    ...edge,
    type: 'smoothstep',
    animated: false,
    style: { 
      strokeWidth: 2.5, 
      stroke: getEdgeColor(edge.sourceHandle),
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: getEdgeColor(edge.sourceHandle),
      width: 16,
      height: 16,
    },
  }));

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div ref={reactFlowWrapper} className="h-full w-full bg-stone-100">
          <ReactFlow
            nodes={nodes}
            edges={styledEdges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[20, 20]}
            connectionLineType={ConnectionLineType.SmoothStep}
            connectionLineStyle={{ strokeWidth: 2.5, stroke: '#3b82f6' }}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: false,
              style: { strokeWidth: 2.5, stroke: '#3b82f6' },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#3b82f6',
                width: 16,
                height: 16,
              },
            }}
            proOptions={{ hideAttribution: true }}
            deleteKeyCode={null}
          >
            <Controls 
              className="!bg-white !border !border-gray-200 !shadow-lg !rounded-lg"
              showInteractive={false}
            />
            <MiniMap 
              nodeStrokeWidth={3}
              zoomable
              pannable
              className="!bg-white/90 !border !border-gray-200 !shadow-lg !rounded-lg"
              maskColor="rgba(245, 245, 244, 0.7)"
            />
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={24} 
              size={1.5}
              color="#d6d3d1"
            />
          </ReactFlow>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-white border-gray-200 shadow-lg">
        {contextMenuNode && (
          <>
            <ContextMenuItem onClick={() => {
              onNodeSelect?.(contextMenuNode);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </ContextMenuItem>
            <ContextMenuItem onClick={() => duplicateNode(contextMenuNode.id)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicar
              <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={() => deleteNode(contextMenuNode.id)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
              <ContextMenuShortcut>Del</ContextMenuShortcut>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export const FlowCanvas = (props: FlowCanvasProps) => {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
};
