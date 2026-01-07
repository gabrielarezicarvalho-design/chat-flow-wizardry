import { Handle, Position } from '@xyflow/react';
import { XSquare, RotateCw, ChevronRight } from 'lucide-react';

interface ErrorNodeProps {
  data: Record<string, any>;
  selected?: boolean;
}

export const ErrorNode = ({ data, selected }: ErrorNodeProps) => {
  return (
    <div 
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg bg-white border shadow-sm min-w-[100px]
        transition-all duration-150
        ${selected ? 'ring-2 ring-red-500 shadow-md' : 'border-gray-200 hover:shadow-md'}
      `}
    >
      <Handle 
        type="target" 
        position={Position.Left}
        className="!bg-red-500 !w-3 !h-3 !border-2 !border-white !-left-1.5"
      />
      
      <div className="w-6 h-6 rounded bg-red-100 flex items-center justify-center shrink-0">
        <XSquare className="h-3.5 w-3.5 text-red-600" />
      </div>
      
      <span className="text-xs font-medium text-gray-700">
        {data?.label || 'Erro'}
      </span>

      <RotateCw className="h-3.5 w-3.5 text-gray-400 shrink-0" />
      
      <Handle 
        type="source" 
        position={Position.Right}
        className="!bg-red-500 !w-3 !h-3 !border-2 !border-white !-right-1.5"
      />
      
      <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
    </div>
  );
};
