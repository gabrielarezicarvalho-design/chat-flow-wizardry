import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageSquare } from "lucide-react";

interface Message {
  id: string;
  conteudo: string;
  remetente: string;
  criado_em: string;
  recebido: boolean;
}

interface SearchMessagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Message[];
  onMessageClick?: (messageId: string) => void;
}

export function SearchMessagesDialog({ 
  open, 
  onOpenChange, 
  messages,
  onMessageClick 
}: SearchMessagesDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMessages = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return messages.filter(msg => 
      msg.conteudo?.toLowerCase().includes(term)
    );
  }, [messages, searchTerm]);

  const highlightText = (text: string, term: string) => {
    if (!term.trim()) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark>
      ) : part
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Buscar Mensagens
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Digite para buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <ScrollArea className="h-[300px]">
            {searchTerm.trim() === "" ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Digite algo para buscar</p>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Nenhuma mensagem encontrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => {
                      onMessageClick?.(msg.id);
                      onOpenChange(false);
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {msg.recebido ? "Recebida" : "Enviada"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.criado_em).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm line-clamp-2">
                      {highlightText(msg.conteudo, searchTerm)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {filteredMessages.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {filteredMessages.length} mensagem(ns) encontrada(s)
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
