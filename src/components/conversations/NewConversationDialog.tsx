import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquarePlus, Phone } from "lucide-react";
import { toast } from "sonner";

interface NewConversationDialogProps {
  defaultPhone?: string;
  defaultName?: string;
  trigger?: React.ReactNode;
  externalOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const NewConversationDialog = ({ 
  defaultPhone = "", 
  defaultName = "",
  trigger,
  externalOpen,
  onOpenChange
}: NewConversationDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) onOpenChange(value);
    setInternalOpen(value);
  };
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [loading, setLoading] = useState(false);

  const handleCreateConversation = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement when conversations table is created
      toast.success("Conversa criada com sucesso!");
      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Erro ao criar conversa:", error);
      toast.error(error.message || "Erro ao criar conversa");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setPhone("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full" size="lg">
            <MessageSquarePlus className="w-5 h-5 mr-2" />
            Nova Conversa
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar Nova Conversa</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Phone className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Funcionalidade em desenvolvimento</p>
            <p className="text-xs mt-1">As conversas serão habilitadas quando as tabelas forem criadas</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome do Contato</Label>
            <Input
              id="name"
              placeholder="Ex: João Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone (WhatsApp)</Label>
            <Input
              id="phone"
              placeholder="5511999999999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleCreateConversation} 
            disabled={loading || !name || !phone}
            className="w-full"
          >
            {loading ? "Criando..." : "Iniciar Conversa"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
