import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CalendarClock } from 'lucide-react';

const BusinessHoursNode = memo(({ data, selected }: NodeProps) => {
  const startTime = (data.businessStart as string) || '08:00';
  const endTime = (data.businessEnd as string) || '18:00';
  
  return (
    <div className={`px-4 py-3 rounded-xl shadow-lg bg-white border-2 min-w-[200px] transition-all duration-200 ${
      selected ? 'border-lime-500 shadow-lime-200 ring-4 ring-lime-100' : 'border-lime-300'
    }`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !bg-lime-500 !border-2 !border-white !shadow"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-lime-500 to-lime-600 shadow-sm">
          <CalendarClock className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-gray-800 text-sm">Verificar Horário</span>
      </div>
      
      <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
        <span className="px-2 py-1 bg-lime-50 rounded text-lime-700 font-medium">{startTime}</span>
        <span>→</span>
        <span className="px-2 py-1 bg-lime-50 rounded text-lime-700 font-medium">{endTime}</span>
      </div>
      
      <div className="flex gap-2 mt-2">
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-gray-600">Dentro</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span className="text-gray-600">Fora</span>
        </div>
      </div>
      
      {/* Handle para "Dentro do horário" */}
      <Handle 
        type="source" 
        position={Position.Bottom}
        id="yes"
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white !shadow"
        style={{ left: '35%' }}
      />
      
      {/* Handle para "Fora do horário" */}
      <Handle 
        type="source" 
        position={Position.Bottom}
        id="no"
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-white !shadow"
        style={{ left: '65%' }}
      />
    </div>
  );
});

BusinessHoursNode.displayName = 'BusinessHoursNode';

export { BusinessHoursNode };
