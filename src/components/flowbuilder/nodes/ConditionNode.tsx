import { Handle, Position } from '@xyflow/react';
import { GitBranch, ChevronRight } from 'lucide-react';

interface ConditionNodeProps {
  data: Record<string, any>;
  selected?: boolean;
}

export const ConditionNode = ({ data, selected }: ConditionNodeProps) => {
  return (
    <div 
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg bg-white border shadow-sm min-w-[140px] max-w-[180px]
        transition-all duration-150
        ${selected ? 'ring-2 ring-amber-500 shadow-md' : 'border-gray-200 hover:shadow-md'}
      `}
    >
      <Handle 
        type="target" 
        position={Position.Left}
        className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white !-left-1.5"
      />
      
      <div className="w-7 h-7 rounded-md bg-amber-500 flex items-center justify-center shrink-0">
        <GitBranch className="h-4 w-4 text-white" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate leading-tight">
          {data?.label || 'Condição'}
        </p>
      </div>

      {/* Dual output handles */}
      <div className="flex flex-col gap-1.5 shrink-0">
        <div className="relative flex items-center">
          <span className="text-[9px] text-emerald-600 font-medium mr-1">S</span>
          <Handle 
            type="source" 
            position={Position.Right}
            id="yes"
            className="!relative !transform-none !bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-white"
          />
        </div>
        <div className="relative flex items-center">
          <span className="text-[9px] text-red-600 font-medium mr-1">N</span>
          <Handle 
            type="source" 
            position={Position.Right}
            id="no"
            className="!relative !transform-none !bg-red-500 !w-2.5 !h-2.5 !border-2 !border-white"
          />
        </div>
      </div>
    </div>
  );
};
