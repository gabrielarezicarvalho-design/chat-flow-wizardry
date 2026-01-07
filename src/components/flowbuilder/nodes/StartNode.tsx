import { Handle, Position } from '@xyflow/react';
import { Play, ChevronRight } from 'lucide-react';

interface StartNodeProps {
  data: Record<string, any>;
  selected?: boolean;
}

export const StartNode = ({ data, selected }: StartNodeProps) => {
  return (
    <div 
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg bg-white border shadow-sm
        transition-all duration-150
        ${selected ? 'ring-2 ring-emerald-500 shadow-md' : 'border-gray-200 hover:shadow-md'}
      `}
    >
      <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
        <Play className="h-4 w-4 text-white fill-white" />
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right}
        className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white !-right-1.5"
      />
      
      <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
    </div>
  );
};
