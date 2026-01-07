import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FileText } from 'lucide-react';

interface ProtocolNodeData {
  label?: string;
  sendToCustomer?: boolean;
  messageTemplate?: string;
}

const ProtocolNode = ({ data, selected }: NodeProps) => {
  const nodeData = data as ProtocolNodeData;
  
  return (
    <div className={`
      min-w-[140px] bg-white rounded-lg shadow-md border-2 transition-all
      ${selected ? 'border-cyan-400 shadow-lg' : 'border-gray-200'}
    `}>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-white"
      />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded bg-cyan-500 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-medium text-sm text-gray-700">
            {nodeData.label || 'Protocolo'}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Gera protocolo automático
        </p>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-white"
      />
    </div>
  );
};

export default memo(ProtocolNode);