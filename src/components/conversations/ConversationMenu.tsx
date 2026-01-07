import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, History, Download, ArrowRightLeft, Folder, UserPlus, Trash2, FileText, XCircle } from "lucide-react";
import { toast } from "sonner";

interface ConversationMenuProps {
  onTransfer: () => void;
  onDelete: () => void;
  onClose?: () => void;
}

export const ConversationMenu = ({ onTransfer, onDelete, onClose }: ConversationMenuProps) => {
  const handleDownload = (format: 'pdf' | 'txt') => {
    toast.success(`Baixando conversa em ${format.toUpperCase()}...`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => toast.info('Histórico em desenvolvimento')}>
          <History className="w-4 h-4 mr-2" />
          Ver histórico
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload('pdf')}>
          <FileText className="w-4 h-4 mr-2" />
          Baixar PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload('txt')}>
          <Download className="w-4 h-4 mr-2" />
          Baixar TXT
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onTransfer}>
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Transferir conversa
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.info('Mover para departamento em desenvolvimento')}>
          <Folder className="w-4 h-4 mr-2" />
          Mover para departamento
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.info('Atribuir agente em desenvolvimento')}>
          <UserPlus className="w-4 h-4 mr-2" />
          Atribuir agente
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {onClose && (
          <DropdownMenuItem onClick={onClose} className="text-warning">
            <XCircle className="w-4 h-4 mr-2" />
            Encerrar conversa
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onDelete} className="text-destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          Excluir conversa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};