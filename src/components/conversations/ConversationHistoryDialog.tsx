import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, MessageSquare, User } from "lucide-react";

interface ConversationHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
  leadName: string;
}

export function ConversationHistoryDialog({ 
  open, 
  onOpenChange, 
  leadId,
  leadName
}: ConversationHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Histórico de Atendimentos
          </DialogTitle>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            {leadName}
          </p>
        </DialogHeader>

        <ScrollArea className="h-[400px]">
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm">Nenhum atendimento anterior</p>
            <p className="text-xs mt-1">Histórico será exibido quando tabelas forem criadas</p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
