import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, Clock, User, Download } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MessageContent } from "./MessageContent";

interface ViewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: any;
  agentName?: string;
}

export function ViewConversationDialog({
  open,
  onOpenChange,
  conversation,
  agentName,
}: ViewConversationDialogProps) {
  const { messages, isLoading } = useMessages(open ? conversation?.id : undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userName = conversation?.contact_name || conversation?.user_name || conversation?.leads?.name || "Desconhecido";
  const userPhone = conversation?.contact_phone || conversation?.user_phone || conversation?.leads?.phone || "";

  useEffect(() => {
    if (open && conversation) {
      console.log('📋 [ViewDialog] Opening conversation:', conversation.id, 'User:', userName);
    }
  }, [open, conversation, userName]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const getTimeOpen = (createdAt: string | null) => {
    if (!createdAt) return "N/A";
    return formatDistanceToNow(new Date(createdAt), {
      locale: ptBR,
      addSuffix: false,
    });
  };

  const downloadPDF = () => {
    if (messages.length === 0) {
      toast.error("Nenhuma mensagem para exportar");
      return;
    }

    const createdAt = conversation.created_at 
      ? format(new Date(conversation.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
      : "N/A";

    // Create HTML content for the PDF
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Histórico de Conversa - ${userName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
          .info { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .info p { margin: 5px 0; }
          .messages { margin-top: 20px; }
          .message { margin-bottom: 15px; padding: 10px 15px; border-radius: 10px; max-width: 80%; }
          .received { background: #f0f0f0; margin-right: auto; }
          .sent { background: #dcf8c6; margin-left: auto; }
          .time { font-size: 11px; color: #666; text-align: right; margin-top: 5px; }
          .sender { font-size: 12px; color: #007bff; font-weight: bold; margin-bottom: 3px; }
          .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 15px; }
        </style>
      </head>
      <body>
        <h1>📱 Histórico de Conversa</h1>
        <div class="info">
          <p><strong>Cliente:</strong> ${userName}</p>
          <p><strong>Telefone:</strong> ${userPhone || "Sem telefone"}</p>
          <p><strong>Data de Início:</strong> ${createdAt}</p>
          <p><strong>Total de Mensagens:</strong> ${messages.length}</p>
        </div>
        <div class="messages">
    `;

    messages.forEach((msg: any) => {
      const isReceived = msg.recebido === true;
      const dateObj = new Date(msg.criado_em);
      const time = !isNaN(dateObj.getTime()) 
        ? format(dateObj, "dd/MM/yyyy HH:mm", { locale: ptBR })
        : "Data inválida";
      const sender = isReceived ? userName : "Atendente";
      
      htmlContent += `
        <div class="message ${isReceived ? 'received' : 'sent'}">
          <div class="sender">${sender}</div>
          <div>${msg.conteudo.replace(/\n/g, '<br>')}</div>
          <div class="time">${time}</div>
        </div>
      `;
    });

    htmlContent += `
        </div>
        <div class="footer">
          Exportado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
        </div>
      </body>
      </html>
    `;

    // Open print dialog which allows saving as PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
      toast.success("Preparando PDF para download...");
    } else {
      toast.error("Erro ao abrir janela de impressão");
    }
  };

  if (!conversation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(conversation.user_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-lg">
                {conversation.user_name || "Desconhecido"}
              </DialogTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {conversation.user_phone || "Sem telefone"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Aberto há {getTimeOpen(conversation.created_at)}
                </span>
                {agentName && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {agentName}
                  </span>
                )}
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadPDF}
              disabled={isLoading || messages.length === 0}
              title="Baixar histórico em PDF"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma mensagem nesta conversa
              </div>
            ) : (
              messages.map((msg: any) => {
                const isReceived = msg.recebido === true;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      isReceived ? "justify-start" : "justify-end"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-lg px-4 py-2 text-sm",
                        isReceived
                          ? "bg-card border"
                          : "bg-primary text-primary-foreground"
                      )}
                    >
                      <MessageContent 
                        content={msg.conteudo} 
                        type={msg.tipo || 'text'} 
                        isSent={!isReceived} 
                      />
                      <p
                        className={cn(
                          "text-xs mt-1 text-right",
                          isReceived ? "text-muted-foreground" : "text-primary-foreground/70"
                        )}
                      >
                        {msg.criado_em && !isNaN(new Date(msg.criado_em).getTime())
                          ? format(new Date(msg.criado_em), "HH:mm")
                          : "--:--"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Footer - Read Only Notice */}
        <div className="px-6 py-4 border-t bg-muted/50">
          <p className="text-center text-sm text-muted-foreground">
            👁️ Modo visualização - Administradores não podem enviar mensagens
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}