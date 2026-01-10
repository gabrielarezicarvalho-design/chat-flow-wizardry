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
  XCircle,
  Bot,
  LayoutList,
  CalendarClock,
  Workflow
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const nodeTypes = [
  { type: 'start', label: 'Início', description: 'Ponto de entrada do fluxo', icon: Play, color: 'from-emerald-500 to-emerald-600' },
  { type: 'message', label: 'Mensagem', description: 'Enviar texto simples', icon: MessageSquare, color: 'from-sky-500 to-sky-600' },
  { type: 'menu', label: 'Menu', description: 'Menu com opções e regras de erro', icon: LayoutList, color: 'from-blue-500 to-blue-600' },
  { type: 'input', label: 'Aguardar', description: 'Aguardar resposta do usuário', icon: MessageCircleQuestion, color: 'from-teal-500 to-teal-600' },
  { type: 'businessHours', label: 'Horário', description: 'Verificar horário comercial', icon: CalendarClock, color: 'from-lime-500 to-lime-600' },
  { type: 'condition', label: 'Condição', description: 'Lógica IF/THEN', icon: GitBranch, color: 'from-amber-500 to-amber-600' },
  { type: 'delay', label: 'Delay', description: 'Aguardar tempo', icon: Clock, color: 'from-slate-500 to-slate-600' },
  { type: 'code', label: 'Código', description: 'JavaScript customizado', icon: Code, color: 'from-purple-500 to-purple-600' },
  { type: 'http', label: 'HTTP', description: 'Chamada de API', icon: Globe, color: 'from-indigo-500 to-indigo-600' },
  { type: 'smartForm', label: 'Smart Form', description: 'Formulário inteligente', icon: FileText, color: 'from-cyan-500 to-cyan-600' },
  { type: 'sendForm', label: 'Formulário', description: 'Formulário inline', icon: FileEdit, color: 'from-violet-500 to-violet-600' },
  { type: 'tag', label: 'Tag', description: 'Adicionar etiqueta', icon: Tag, color: 'from-pink-500 to-pink-600' },
  { type: 'aiAgent', label: 'IA', description: 'Assistente inteligente', icon: Bot, color: 'from-fuchsia-500 to-fuchsia-600' },
  { type: 'automation', label: 'Automação', description: 'Executar URA de automação', icon: Workflow, color: 'from-orange-500 to-orange-600' },
  { type: 'forward', label: 'Transferir', description: 'Enviar para fila/agente', icon: UserPlus, color: 'from-rose-500 to-rose-600' },
  { type: 'error', label: 'Erro', description: 'Encerrar com erro', icon: XCircle, color: 'from-red-500 to-red-600' },
];
interface NodePaletteNewProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

export const NodePaletteNew = ({ onDragStart }: NodePaletteNewProps) => {
  return (
    <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-2.5">
      <TooltipProvider delayDuration={0}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {nodeTypes.map((node) => (
            <Tooltip key={node.type}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "group relative w-10 h-10 rounded-xl flex items-center justify-center cursor-grab",
                    "active:cursor-grabbing transition-all duration-200 ease-out",
                    "hover:scale-110 hover:shadow-lg hover:-translate-y-0.5",
                    "bg-gradient-to-br shadow-sm",
                    node.color
                  )}
                  draggable
                  onDragStart={(e) => onDragStart(e, node.type)}
                >
                  <node.icon className="h-5 w-5 text-white drop-shadow-sm" />
                  <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/10 transition-colors" />
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg px-3 py-2 z-50"
                sideOffset={8}
              >
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{node.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{node.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
};
