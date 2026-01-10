import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Cog } from "lucide-react";

interface CreateURADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateURA?: (ura: {
    name: string;
    type: "chat" | "automation";
    trigger: string;
  }) => void;
  onSubmit?: (ura: {
    name: string;
    type: "chat" | "automation";
    trigger: string;
  }) => void;
}

export const CreateURADialog = ({ open, onOpenChange, onCreateURA, onSubmit }: CreateURADialogProps) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<"chat" | "automation">("chat");
  const [trigger, setTrigger] = useState("Primeira mensagem");

  const handleCreate = () => {
    const data = { name, type, trigger };
    if (onCreateURA) onCreateURA(data);
    if (onSubmit) onSubmit(data);
    onOpenChange(false);
    setName("");
    setType("chat");
    setTrigger("Primeira mensagem");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar nova URA</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Nome da URA*</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=""
              className="mt-2"
            />
          </div>
          
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v: "chat" | "automation") => setType(v)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="chat">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>Ura avançada (Chat)</span>
                  </div>
                </SelectItem>
                <SelectItem value="automation">
                  <div className="flex items-center gap-2">
                    <Cog className="h-4 w-4" />
                    <span>Fluxo de automação</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {type === "chat" 
                ? "Para atendimento interativo via WhatsApp" 
                : "Para usar como função em assistentes de IA e automações"}
            </p>
          </div>

          {type === "chat" && (
            <div>
              <Label>Gatilho</Label>
              <Select value={trigger} onValueChange={setTrigger}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="Primeira mensagem">Primeira mensagem</SelectItem>
                  <SelectItem value="Palavra-chave">Palavra-chave específica</SelectItem>
                  <SelectItem value="Horário comercial">Horário comercial</SelectItem>
                  <SelectItem value="Fora do horário">Fora do horário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!name}
          >
            Criar URA
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
