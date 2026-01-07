import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutomationNodeData {
  label?: string;
  automationId?: string;
  automationName?: string;
  passContext?: boolean;
  waitForCompletion?: boolean;
}

const AutomationNode = ({ data, selected }: NodeProps) => {
  const nodeData = data as AutomationNodeData;
  
  return (
    <div className={cn(
      "relative bg-background border-2 rounded-xl shadow-lg min-w-[180px] transition-all duration-200",
      selected ? "border-orange-500 shadow-orange-500/25 shadow-xl" : "border-orange-500/50 hover:border-orange-500"
    )}>
      <Handle type="target" position={Position.Top} className="!bg-orange-500 !w-3 !h-3 !border-2 !border-background" />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm">
            <Workflow className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <span className="font-medium text-sm">{nodeData.label || 'Automação'}</span>
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 font-medium">
              URA
            </span>
          </div>
        </div>
        
        {nodeData.automationName && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-2 py-1.5 mt-2">
            <span className="font-medium">Fluxo:</span> {nodeData.automationName}
          </div>
        )}
        
        {!nodeData.automationId && (
          <div className="text-xs text-orange-500 mt-2 italic">
            Clique para configurar
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-orange-500 !w-3 !h-3 !border-2 !border-background" />
    </div>
  );
};

export default memo(AutomationNode);
