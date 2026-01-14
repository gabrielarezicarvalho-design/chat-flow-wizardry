import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";

interface DeleteConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionName: string;
  onConfirm: (deleteData: boolean) => Promise<void>;
}

export function DeleteConnectionDialog({
  open,
  onOpenChange,
  connectionName,
  onConfirm,
}: DeleteConnectionDialogProps) {
  const [deleteOption, setDeleteOption] = useState<"keep" | "delete">("keep");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(deleteOption === "delete");
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting connection:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Excluir Conexão
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-4">
            <p>
              Você está prestes a excluir a conexão <strong>"{connectionName}"</strong>.
            </p>
            
            <div className="bg-muted/50 p-4 rounded-lg space-y-4">
              <p className="text-sm font-medium text-foreground">
                O que fazer com os contatos e tags associados?
              </p>
              
              <RadioGroup
                value={deleteOption}
                onValueChange={(value) => setDeleteOption(value as "keep" | "delete")}
                className="space-y-3"
              >
                <div className="flex items-start space-x-3 p-3 rounded-lg border bg-background hover:bg-accent/50 cursor-pointer transition-colors">
                  <RadioGroupItem value="keep" id="keep" className="mt-0.5" />
                  <Label htmlFor="keep" className="cursor-pointer flex-1">
                    <span className="font-medium">Manter dados</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Os contatos e tags permanecem no sistema para uso futuro
                    </p>
                  </Label>
                </div>
                
                <div className="flex items-start space-x-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 cursor-pointer transition-colors">
                  <RadioGroupItem value="delete" id="delete" className="mt-0.5" />
                  <Label htmlFor="delete" className="cursor-pointer flex-1">
                    <span className="font-medium text-destructive">Excluir tudo</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Remove também todos os contatos e tags desta conexão
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Conexão
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
