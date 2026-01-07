import { Handle, Position } from '@xyflow/react';
import { UserPlus, X, ChevronRight, Users } from 'lucide-react';

interface ForwardNodeProps {
  data: Record<string, any>;
  selected?: boolean;
}

export const ForwardNode = ({ data, selected }: ForwardNodeProps) => {
  const isClose = data?.action === 'close';
  const isQueue = data?.transferType === 'queue' || !data?.transferType;
  const targetName = isQueue ? data?.departmentName : data?.specificAgentName;
  
  return (
    <div 
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg bg-white border shadow-sm min-w-[140px] max-w-[200px]
        transition-all duration-150
        ${selected ? 'ring-2 ring-rose-500 shadow-md' : 'border-gray-200 hover:shadow-md'}
      `}
    >
      <Handle 
        type="target" 
        position={Position.Left}
        className="!bg-rose-500 !w-3 !h-3 !border-2 !border-white !-left-1.5"
      />
      
      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${isClose ? 'bg-gray-500' : isQueue ? 'bg-orange-500' : 'bg-rose-500'}`}>
        {isClose ? (
          <X className="h-4 w-4 text-white" />
        ) : isQueue ? (
          <Users className="h-4 w-4 text-white" />
        ) : (
          <UserPlus className="h-4 w-4 text-white" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate leading-tight">
          {isClose ? 'Encerrar' : (data?.label || 'Transferir')}
        </p>
        {targetName && (
          <p className="text-[10px] text-gray-500 truncate leading-tight">
            → {targetName}
          </p>
        )}
      </div>
      
      <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
    </div>
  );
};