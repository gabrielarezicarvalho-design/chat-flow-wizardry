import { Handle, Position } from '@xyflow/react';
import { FileEdit, ChevronRight } from 'lucide-react';

interface SendFormNodeProps {
  data: Record<string, any>;
  selected?: boolean;
}

export const SendFormNode = ({ data, selected }: SendFormNodeProps) => {
  return (
    <div 
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg bg-white border shadow-sm min-w-[140px] max-w-[180px]
        transition-all duration-150
        ${selected ? 'ring-2 ring-violet-500 shadow-md' : 'border-gray-200 hover:shadow-md'}
      `}
    >
      <Handle 
        type="target" 
        position={Position.Left}
        className="!bg-violet-500 !w-3 !h-3 !border-2 !border-white !-left-1.5"
      />
      
      <div className="w-7 h-7 rounded-md bg-violet-500 flex items-center justify-center shrink-0">
        <FileEdit className="h-4 w-4 text-white" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate leading-tight">
          {data?.label || 'Enviar Formulário'}
        </p>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right}
        className="!bg-violet-500 !w-3 !h-3 !border-2 !border-white !-right-1.5"
      />
      
      <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
    </div>
  );
};
