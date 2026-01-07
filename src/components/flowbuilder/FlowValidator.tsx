import { Node, Edge } from '@xyflow/react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface ValidationError {
  nodeId: string;
  nodeName: string;
  type: 'error' | 'warning';
  message: string;
}

interface FlowValidatorProps {
  nodes: Node[];
  edges: Edge[];
  onNodeClick?: (nodeId: string) => void;
}

export const validateFlow = (nodes: Node[], edges: Edge[]): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  // Check if there's a start node
  const startNode = nodes.find(n => n.type === 'start');
  if (!startNode) {
    errors.push({
      nodeId: '',
      nodeName: 'Fluxo',
      type: 'error',
      message: 'O fluxo precisa de um bloco de Início'
    });
  }

  // Check each node for connections
  nodes.forEach(node => {
    if (node.type === 'start') {
      // Start node must have at least one outgoing connection
      const hasOutgoing = edges.some(e => e.source === node.id);
      if (!hasOutgoing) {
        errors.push({
          nodeId: node.id,
          nodeName: node.data?.label as string || 'Início',
          type: 'error',
          message: 'Bloco de início não está conectado a nenhum outro bloco'
        });
      }
    } else if (node.type === 'condition') {
      // Condition nodes need both yes and no paths
      const yesPath = edges.some(e => e.source === node.id && e.sourceHandle === 'yes');
      const noPath = edges.some(e => e.source === node.id && e.sourceHandle === 'no');
      
      if (!yesPath) {
        errors.push({
          nodeId: node.id,
          nodeName: node.data?.label as string || 'Condição',
          type: 'warning',
          message: 'Caminho "Sim" não está conectado'
        });
      }
      if (!noPath) {
        errors.push({
          nodeId: node.id,
          nodeName: node.data?.label as string || 'Condição',
          type: 'warning',
          message: 'Caminho "Não" não está conectado'
        });
      }
    } else if (node.type === 'message' || node.type === 'code' || node.type === 'form' || node.type === 'delay' || node.type === 'tag' || node.type === 'http') {
      // These nodes should have incoming connections (except if they're connected to start)
      const hasIncoming = edges.some(e => e.target === node.id);
      if (!hasIncoming) {
        errors.push({
          nodeId: node.id,
          nodeName: node.data?.label as string || node.type,
          type: 'warning',
          message: 'Bloco não está conectado ao fluxo'
        });
      }
    }
  });

  // Check for orphan nodes (nodes with no connections at all)
  nodes.forEach(node => {
    if (node.type !== 'start') {
      const hasAnyConnection = edges.some(e => e.source === node.id || e.target === node.id);
      if (!hasAnyConnection) {
        errors.push({
          nodeId: node.id,
          nodeName: node.data?.label as string || node.type,
          type: 'error',
          message: 'Bloco isolado - sem nenhuma conexão'
        });
      }
    }
  });

  return errors;
};

export const FlowValidator = ({ nodes, edges, onNodeClick }: FlowValidatorProps) => {
  const errors = validateFlow(nodes, edges);
  
  if (errors.length === 0) {
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <AlertDescription className="text-green-700 dark:text-green-400">
          Fluxo válido - todos os blocos estão conectados corretamente
        </AlertDescription>
      </Alert>
    );
  }

  const criticalErrors = errors.filter(e => e.type === 'error');
  const warnings = errors.filter(e => e.type === 'warning');

  return (
    <div className="space-y-2">
      {criticalErrors.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-1">{criticalErrors.length} erro(s) crítico(s)</div>
            <ul className="text-sm space-y-1">
              {criticalErrors.map((error, i) => (
                <li 
                  key={i} 
                  className="cursor-pointer hover:underline"
                  onClick={() => onNodeClick?.(error.nodeId)}
                >
                  • {error.nodeName}: {error.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {warnings.length > 0 && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-700 dark:text-yellow-400">
            <div className="font-medium mb-1">{warnings.length} aviso(s)</div>
            <ul className="text-sm space-y-1">
              {warnings.map((error, i) => (
                <li 
                  key={i} 
                  className="cursor-pointer hover:underline"
                  onClick={() => onNodeClick?.(error.nodeId)}
                >
                  • {error.nodeName}: {error.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
