import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tag } from "lucide-react";

interface ConversationTagsPopoverProps {
  conversationId: string;
  onTagsChange?: () => void;
}

export const ConversationTagsPopover = ({ 
  conversationId,
  onTagsChange 
}: ConversationTagsPopoverProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
          title="Etiqueta"
        >
          <Tag className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Etiquetas</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Clique para adicionar ou remover
          </p>
        </div>
        
        <ScrollArea className="max-h-64">
          <div className="py-8 text-center text-muted-foreground text-sm px-4">
            Nenhuma etiqueta criada.
            <br />
            Crie etiquetas em Contatos → Tags.
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
