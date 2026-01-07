import { Handle, Position } from '@xyflow/react';
import { MessageCircleQuestion, ChevronRight, AlertTriangle } from 'lucide-react';

interface InputNodeProps {
  data: Record<string, any>;
  selected?: boolean;
}

export const InputNode = ({ data, selected }: InputNodeProps) => {
  const hasWarning = !data?.promptMessage;
  
  return (
    <div 
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg bg-white border shadow-sm min-w-[140px] max-w-[180px]
        transition-all duration-150
        ${selected ? 'ring-2 ring-teal-500 shadow-md' : 'border-gray-200 hover:shadow-md'}
      `}
    >
      <Handle 
        type="target" 
        position={Position.Left}
        className="!bg-teal-500 !w-3 !h-3 !border-2 !border-white !-left-1.5"
      />
      
      <div className="w-7 h-7 rounded-md bg-teal-500 flex items-center justify-center shrink-0">
        <MessageCircleQuestion className="h-4 w-4 text-white" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate leading-tight">
          {data?.label || 'Aguardar resposta'}
        </p>
      </div>

      {hasWarning && (
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
      )}
      
      <Handle 
        type="source" 
        position={Position.Right}
        className="!bg-teal-500 !w-3 !h-3 !border-2 !border-white !-right-1.5"
      />
      
      <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
    </div>
  );
};
