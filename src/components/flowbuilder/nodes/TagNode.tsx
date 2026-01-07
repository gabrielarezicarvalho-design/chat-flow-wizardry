import { Handle, Position } from '@xyflow/react';
import { Tag, ChevronRight } from 'lucide-react';

interface TagNodeProps {
  data: Record<string, any>;
  selected?: boolean;
}

export const TagNode = ({ data, selected }: TagNodeProps) => {
  return (
    <div 
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg bg-white border shadow-sm min-w-[120px] max-w-[160px]
        transition-all duration-150
        ${selected ? 'ring-2 ring-pink-500 shadow-md' : 'border-gray-200 hover:shadow-md'}
      `}
    >
      <Handle 
        type="target" 
        position={Position.Left}
        className="!bg-pink-500 !w-3 !h-3 !border-2 !border-white !-left-1.5"
      />
      
      <div className="w-7 h-7 rounded-md bg-pink-500 flex items-center justify-center shrink-0">
        <Tag className="h-4 w-4 text-white" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate leading-tight">
          {data?.label || 'Adicionar tag'}
        </p>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right}
        className="!bg-pink-500 !w-3 !h-3 !border-2 !border-white !-right-1.5"
      />
      
      <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
    </div>
  );
};
