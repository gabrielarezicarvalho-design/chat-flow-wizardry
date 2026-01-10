import { Handle, Position } from '@xyflow/react';
import { Play, ChevronRight, MessageCircle, Search, Clock, Moon, UserPlus, Tag } from 'lucide-react';

interface StartNodeProps {
  data: Record<string, any>;
  selected?: boolean;
}

const triggerLabels: Record<string, { label: string; icon: React.ElementType }> = {
  first_message: { label: 'Primeira mensagem', icon: MessageCircle },
  keyword: { label: 'Palavra-chave', icon: Search },
  business_hours: { label: 'Horário comercial', icon: Clock },
  out_of_hours: { label: 'Fora do horário', icon: Moon },
  new_contact: { label: 'Novo contato', icon: UserPlus },
  tag_added: { label: 'Tag adicionada', icon: Tag },
};

export const StartNode = ({ data, selected }: StartNodeProps) => {
  const trigger = data?.trigger || 'first_message';
  const triggerInfo = triggerLabels[trigger] || triggerLabels.first_message;
  const TriggerIcon = triggerInfo.icon;

  return (
    <div 
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg bg-white border shadow-sm min-w-[160px]
        transition-all duration-150
        ${selected ? 'ring-2 ring-emerald-500 shadow-md' : 'border-gray-200 hover:shadow-md'}
      `}
    >
      <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
        <Play className="h-4 w-4 text-white fill-white" />
      </div>
      
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium text-gray-900 truncate">Início</span>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <TriggerIcon className="h-3 w-3" />
          <span className="truncate">{triggerInfo.label}</span>
          {trigger === 'keyword' && data?.keyword && (
            <span className="text-emerald-600 font-medium truncate">: {data.keyword}</span>
          )}
        </div>
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
