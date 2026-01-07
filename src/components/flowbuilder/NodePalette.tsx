import { 
  Play, 
  MessageSquare, 
  GitBranch, 
  Code, 
  UserPlus,
  Clock,
  Globe,
  Tag,
  MessageCircleQuestion,
  FileText,
  FileEdit,
  XSquare,
  X,
  Bot,
  ClipboardList
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const nodeTypes = [
  { type: 'start', label: 'Início', icon: Play, color: 'bg-emerald-500' },
  { type: 'message', label: 'Mensagem', icon: MessageSquare, color: 'bg-sky-500' },
  { type: 'input', label: 'Aguardar Resposta', icon: MessageCircleQuestion, color: 'bg-teal-500' },
  { type: 'condition', label: 'Condição', icon: GitBranch, color: 'bg-amber-500' },
  { type: 'delay', label: 'Aguardar', icon: Clock, color: 'bg-orange-500' },
  { type: 'code', label: 'Código', icon: Code, color: 'bg-purple-500' },
  { type: 'http', label: 'HTTP Request', icon: Globe, color: 'bg-indigo-500' },
  { type: 'smartForm', label: 'Smart Form', icon: FileText, color: 'bg-cyan-500' },
  { type: 'sendForm', label: 'Formulário', icon: FileEdit, color: 'bg-violet-500' },
  { type: 'protocol', label: 'Protocolo', icon: ClipboardList, color: 'bg-cyan-600' },
  { type: 'tag', label: 'Tag', icon: Tag, color: 'bg-pink-500' },
  { type: 'aiAgent', label: 'Assistente IA', icon: Bot, color: 'bg-gradient-to-r from-blue-500 to-purple-500' },
  { type: 'forward', label: 'Transferir', icon: UserPlus, color: 'bg-rose-500' },
  { type: 'error', label: 'Erro', icon: XSquare, color: 'bg-red-500' },
  { type: 'close', label: 'Encerrar', icon: X, color: 'bg-gray-500' },
];

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

export const NodePalette = ({ onDragStart }: NodePaletteProps) => {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-1 overflow-x-auto">
      <TooltipProvider delayDuration={200}>
        {nodeTypes.map((node) => (
          <Tooltip key={node.type}>
            <TooltipTrigger asChild>
              <div
                className={`
                  w-9 h-9 rounded-lg flex items-center justify-center cursor-grab 
                  active:cursor-grabbing transition-all duration-150
                  hover:scale-110 hover:shadow-md
                  ${node.color}
                `}
                draggable
                onDragStart={(e) => {
                  if (node.type === 'close') {
                    onDragStart(e, 'forward');
                    e.dataTransfer.setData('closeAction', 'true');
                  } else {
                    onDragStart(e, node.type);
                  }
                }}
              >
                <node.icon className="h-4 w-4 text-white" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-gray-900 text-white text-xs">
              {node.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
};
