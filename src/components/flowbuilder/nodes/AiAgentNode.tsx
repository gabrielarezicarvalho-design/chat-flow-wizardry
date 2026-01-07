import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Bot, ArrowRightFromLine, AlertTriangle, CheckCircle2, LogOut } from 'lucide-react';

const AiAgentNode = ({ data, selected }: NodeProps) => {
  const nodeData = data as { 
    label?: string; 
    agentName?: string; 
    agentId?: string;
    fallbackDepartmentId?: string;
    fallbackDepartmentName?: string;
    transferKeywords?: string;
    maxAttempts?: number;
  };
  
  const hasFallback = !!nodeData?.fallbackDepartmentId;
  const hasKeywords = !!(nodeData?.transferKeywords?.trim());
  
  return (
    <div className={`
      bg-white rounded-lg shadow-md border-2 min-w-[200px] max-w-[240px]
      ${selected ? 'border-purple-500 shadow-lg' : 'border-gray-200'}
      transition-all duration-200
    `}>
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white !-left-1.5"
        style={{ top: '24px' }}
      />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded bg-gradient-to-r from-blue-500 to-purple-500">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium text-sm text-gray-800 truncate flex-1">
            {nodeData?.label || 'Assistente IA'}
          </span>
        </div>
        
        {nodeData?.agentName && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 mb-2 truncate">
            🤖 {nodeData.agentName}
          </div>
        )}
        
        {!nodeData?.agentId && (
          <div className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 flex items-center gap-1 mb-2">
            <AlertTriangle className="h-3 w-3" />
            Selecione um assistente
          </div>
        )}

        {/* Info badges */}
        {nodeData?.agentId && (
          <div className="flex flex-wrap gap-1 mb-1">
            {hasKeywords && (
              <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                Palavras-chave
              </span>
            )}
            {nodeData?.maxAttempts && (
              <span className="text-[9px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">
                Max: {nodeData.maxAttempts} tentativas
              </span>
            )}
          </div>
        )}
      </div>

      {/* Handles for outputs */}
      <div className="border-t border-gray-100 px-2 py-1.5 space-y-1">
        {/* Success handle - Encerrar quando resolvido */}
        <div className="relative flex items-center gap-1.5 text-xs py-1 pr-4">
          <span className="w-4 h-4 rounded bg-green-100 text-green-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-2.5 w-2.5" />
          </span>
          <span className="text-gray-600 truncate flex-1 text-[11px]">
            Resolvido (encerrar)
          </span>
          <Handle
            type="source"
            position={Position.Right}
            id="success"
            className="!bg-green-500 !w-2.5 !h-2.5 !border-2 !border-white !-right-1"
            style={{ top: 'auto', position: 'absolute', right: '-4px' }}
          />
        </div>
        
        {/* Fallback/Transfer handle */}
        <div className="relative flex items-center gap-1.5 text-xs py-1 pr-4">
          <span className="w-4 h-4 rounded bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <ArrowRightFromLine className="h-2.5 w-2.5" />
          </span>
          <span className="text-gray-600 truncate flex-1 text-[10px]">
            {hasFallback ? `→ ${nodeData.fallbackDepartmentName}` : 'Transferir humano'}
          </span>
          <Handle
            type="source"
            position={Position.Right}
            id="fallback"
            className="!bg-orange-500 !w-2.5 !h-2.5 !border-2 !border-white !-right-1"
            style={{ top: 'auto', position: 'absolute', right: '-4px' }}
          />
        </div>
      </div>
    </div>
  );
};

export default memo(AiAgentNode);