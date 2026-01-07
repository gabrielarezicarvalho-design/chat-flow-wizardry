import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { LayoutList, XCircle, RefreshCw } from 'lucide-react';

interface MenuOption {
  id: string;
  text: string;
  value?: string;
  keywords?: string;
}

const MenuNode = memo(({ data, selected }: NodeProps) => {
  const options: MenuOption[] = (data.menuOptions as MenuOption[]) || [];
  const menuMessage = data.menuMessage as string | undefined;
  const maxErrors = (data.maxErrors as number) || 3;
  
  return (
    <div className={`px-4 py-3 rounded-xl shadow-lg bg-white border-2 min-w-[220px] transition-all duration-200 ${
      selected ? 'border-blue-500 shadow-blue-200 ring-4 ring-blue-100' : 'border-blue-300'
    }`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white !shadow"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
          <LayoutList className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-gray-800 text-sm">Menu de Opções</span>
      </div>
      
      {menuMessage && (
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{menuMessage}</p>
      )}
      
      {options.length > 0 && (
        <div className="space-y-1 mb-3">
          {options.slice(0, 3).map((opt, index) => (
            <div key={opt.id || index} className="text-xs px-2 py-1 bg-blue-50 rounded text-blue-700 flex items-center justify-between">
              <span>{index + 1}. {opt.text || `Opção ${index + 1}`}</span>
            </div>
          ))}
          {options.length > 3 && (
            <div className="text-xs text-gray-500">+{options.length - 3} opções</div>
          )}
        </div>
      )}

      {/* Indicador de regra de erro */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-red-50 rounded border border-red-200 mt-2">
        <XCircle className="w-3 h-3 text-red-500" />
        <span className="text-xs text-red-600">Erro após {maxErrors}x</span>
        <RefreshCw className="w-3 h-3 text-red-400 ml-auto" />
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white !shadow"
      />
      
      {/* Handles para cada opção na direita */}
      {options.map((opt, index) => (
        <Handle
          key={`option-${index}`}
          type="source"
          position={Position.Right}
          id={`option-${index}`}
          className="!w-2.5 !h-2.5 !bg-green-500 !border-2 !border-white !shadow"
          style={{ top: 70 + index * 26 }}
        />
      ))}

      {/* Handle de erro - vermelho */}
      <Handle
        type="source"
        position={Position.Right}
        id="error"
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-white !shadow"
        style={{ bottom: 12, top: 'auto' }}
      />
    </div>
  );
});

MenuNode.displayName = 'MenuNode';

export { MenuNode };
