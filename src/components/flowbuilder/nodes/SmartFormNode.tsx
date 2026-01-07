import { Handle, Position } from '@xyflow/react';
import { FileText, ChevronRight } from 'lucide-react';

interface SmartFormNodeProps {
  data: Record<string, any>;
  selected?: boolean;
}

export const SmartFormNode = ({ data, selected }: SmartFormNodeProps) => {
  return (
    <div 
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg bg-white border shadow-sm min-w-[130px] max-w-[170px]
        transition-all duration-150
        ${selected ? 'ring-2 ring-cyan-500 shadow-md' : 'border-gray-200 hover:shadow-md'}
      `}
    >
      <Handle 
        type="target" 
        position={Position.Left}
        className="!bg-cyan-500 !w-3 !h-3 !border-2 !border-white !-left-1.5"
      />
      
      <div className="w-7 h-7 rounded-md bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shrink-0">
        <FileText className="h-4 w-4 text-white" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate leading-tight">
          {data?.label || 'Smart Form'}
        </p>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right}
        className="!bg-teal-500 !w-3 !h-3 !border-2 !border-white !-right-1.5"
      />
      
      <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
    </div>
  );
};
