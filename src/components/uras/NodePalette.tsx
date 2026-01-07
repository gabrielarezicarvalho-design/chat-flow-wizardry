import { Card } from "@/components/ui/card";
import { MessageSquare, HelpCircle, GitBranch, Webhook, Users, XCircle } from "lucide-react";

interface NodeType {
  id: string;
  icon: any;
  label: string;
  description: string;
}

const nodeTypes: NodeType[] = [
  {
    id: "message",
    icon: MessageSquare,
    label: "Mensagem",
    description: "Enviar mensagem de texto",
  },
  {
    id: "question",
    icon: HelpCircle,
    label: "Pergunta",
    description: "Fazer uma pergunta ao usuário",
  },
  {
    id: "condition",
    icon: GitBranch,
    label: "Condição",
    description: "Criar ramificação condicional",
  },
  {
    id: "webhook",
    icon: Webhook,
    label: "Webhook",
    description: "Chamar API externa",
  },
  {
    id: "transfer",
    icon: Users,
    label: "Encaminhar",
    description: "Transferir para departamento",
  },
  {
    id: "end",
    icon: XCircle,
    label: "Finalizar",
    description: "Encerrar atendimento",
  },
];

interface NodePaletteProps {
  onSelectNode: (nodeType: string) => void;
  selectedNode: string | null;
}

export const NodePalette = ({ onSelectNode, selectedNode }: NodePaletteProps) => {
  return (
    <Card className="w-64 p-4">
      <h3 className="font-semibold mb-4">Blocos Disponíveis</h3>
      <div className="space-y-2">
        {nodeTypes.map((node) => {
          const isSelected = selectedNode === node.id;
          return (
            <button
              key={node.id}
              onClick={() => onSelectNode(node.id)}
              className={`w-full p-3 rounded-lg border transition-colors text-left group ${
                isSelected 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:bg-primary/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded bg-primary/10 group-hover:bg-primary group-hover:text-white transition-colors">
                  <node.icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{node.label}</p>
                  <p className="text-xs text-muted-foreground">{node.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
};
