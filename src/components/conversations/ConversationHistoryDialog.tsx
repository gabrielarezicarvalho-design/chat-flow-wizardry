import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, MessageSquare, Clock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ConversationHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
  leadName: string;
}

interface HistoryConversation {
  id: string;
  created_at: string;
  closed_at: string | null;
  status: string;
  last_message: string | null;
  platform: string;
}

export function ConversationHistoryDialog({ 
  open, 
  onOpenChange, 
  leadId,
  leadName
}: ConversationHistoryDialogProps) {
  const [history, setHistory] = useState<HistoryConversation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && leadId) {
      loadHistory();
    }
  }, [open, leadId]);

  const loadHistory = async () => {
    if (!leadId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, created_at, closed_at, status, last_message, platform')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Ativo</Badge>;
      case 'closed':
        return <Badge variant="secondary">Encerrado</Badge>;
      case 'waiting':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Aguardando</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDuration = (createdAt: string, closedAt: string | null) => {
    const start = new Date(createdAt);
    const end = closedAt ? new Date(closedAt) : new Date();
    const diff = Math.floor((end.getTime() - start.getTime()) / 1000 / 60);
    
    if (diff < 60) return `${diff}min`;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (hours < 24) return `${hours}h ${mins}min`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

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
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm">Nenhum atendimento anterior</p>
              <p className="text-xs mt-1">Este é o primeiro atendimento</p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {history.map((conv, index) => (
                <div
                  key={conv.id}
                  className={`p-4 rounded-lg border bg-card ${
                    index === 0 ? "border-primary/30 bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(conv.status)}
                      {index === 0 && conv.status === 'active' && (
                        <Badge variant="outline" className="text-xs">Atual</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      #{conv.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {new Date(conv.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Duração: {getDuration(conv.created_at, conv.closed_at)}</span>
                    </div>

                    {conv.last_message && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded line-clamp-2">
                        "{conv.last_message}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {history.length > 0 && (
          <p className="text-xs text-muted-foreground text-center pt-2 border-t">
            Total: {history.length} atendimento(s)
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
