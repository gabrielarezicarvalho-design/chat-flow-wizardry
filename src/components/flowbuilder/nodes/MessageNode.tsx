import { Handle, Position } from '@xyflow/react';
import { MessageSquare, Image, FileAudio, File, ListOrdered, Grid3X3, AlertTriangle, ChevronRight } from 'lucide-react';

interface MessageNodeProps {
  data: Record<string, any>;
  selected?: boolean;
}

export const MessageNode = ({ data, selected }: MessageNodeProps) => {
  const getIcon = () => {
    switch (data?.messageType) {
      case 'image': return <Image className="h-4 w-4 text-white" />;
      case 'audio': return <FileAudio className="h-4 w-4 text-white" />;
      case 'document': return <File className="h-4 w-4 text-white" />;
      case 'buttons': return <Grid3X3 className="h-4 w-4 text-white" />;
      case 'replyButtons': return <Grid3X3 className="h-4 w-4 text-white" />;
      case 'list': return <ListOrdered className="h-4 w-4 text-white" />;
      default: return <MessageSquare className="h-4 w-4 text-white" />;
    }
  };

  const getLabel = () => {
    switch (data?.messageType) {
      case 'buttons': return 'Menu de opções';
      case 'replyButtons': return 'Botão de Resposta';
      case 'list': return 'Lista de opções';
      case 'image': return 'Enviar imagem';
      case 'audio': return 'Enviar áudio';
      case 'document': return 'Enviar documento';
      default: return data?.label || 'Enviar mensagem';
    }
  };

  const hasWarning = !data?.content && !data?.label;
  const isMenu = data?.messageType === 'buttons' || data?.messageType === 'list' || data?.messageType === 'replyButtons';
  const buttons = data?.buttons || [];
  const listItems = data?.listItems || [];
  const menuOptions = isMenu ? (data?.messageType === 'list' ? listItems : buttons) : [];
  const hasErrorHandle = isMenu && data?.errorMessage;

  return (
    <div 
      className={`
        flex flex-col rounded-lg bg-white border shadow-sm min-w-[160px] max-w-[220px]
        transition-all duration-150
        ${selected ? 'ring-2 ring-sky-500 shadow-md' : 'border-gray-200 hover:shadow-md'}
      `}
    >
      <Handle 
        type="target" 
        position={Position.Left}
        className="!bg-sky-500 !w-3 !h-3 !border-2 !border-white !-left-1.5"
        style={{ top: '20px' }}
      />
      
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-7 h-7 rounded-md bg-sky-500 flex items-center justify-center shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-700 truncate leading-tight">
            {getLabel()}
          </p>
        </div>

        {hasWarning && (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        )}
        
        <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
      </div>

      {/* Menu options with individual handles */}
      {isMenu && menuOptions.length > 0 && (
        <div className="border-t border-gray-100 px-2 py-1.5 space-y-1">
          {menuOptions.map((option: any, index: number) => (
            <div key={option.id || index} className="relative flex items-center gap-1.5 text-xs py-1 pr-4">
              <span className="w-4 h-4 rounded bg-sky-100 text-sky-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                {index + 1}
              </span>
              <span className="text-gray-600 truncate flex-1 text-[11px]">
                {option.text || option.title || `Opção ${index + 1}`}
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id={`option-${index}`}
                className="!bg-green-500 !w-2.5 !h-2.5 !border-2 !border-white !-right-1"
                style={{ top: 'auto', position: 'absolute', right: '-4px' }}
              />
            </div>
          ))}
          
          {/* Error handle */}
          {hasErrorHandle && (
            <div className="relative flex items-center gap-1.5 text-xs py-1 pr-4 border-t border-gray-100 mt-1 pt-2">
              <span className="w-4 h-4 rounded bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-2.5 w-2.5" />
              </span>
              <span className="text-red-500 truncate flex-1 text-[10px]">
                Erro
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id="error"
                className="!bg-red-500 !w-2.5 !h-2.5 !border-2 !border-white !-right-1"
                style={{ top: 'auto', position: 'absolute', right: '-4px' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Default source handle for non-menu types */}
      {!isMenu && (
        <Handle 
          type="source" 
          position={Position.Right}
          className="!bg-sky-500 !w-3 !h-3 !border-2 !border-white !-right-1.5"
        />
      )}
    </div>
  );
};