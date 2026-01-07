import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tag, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface ConversationTagsPopoverProps {
  conversationId: string;
  onTagsChange?: () => void;
}

export const ConversationTagsPopover = ({ 
  conversationId,
  onTagsChange 
}: ConversationTagsPopoverProps) => {
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load all tags
      const { data: tags } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      setAllTags(tags || []);

      // Load conversation tags
      const { data: convTags } = await supabase
        .from('conversation_tags')
        .select('tag_id')
        .eq('conversation_id', conversationId);

      setSelectedTagIds(convTags?.map(t => t.tag_id) || []);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, conversationId]);

  const toggleTag = async (tagId: string) => {
    const isSelected = selectedTagIds.includes(tagId);
    
    try {
      if (isSelected) {
        // Remove tag
        const { error } = await supabase
          .from('conversation_tags')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('tag_id', tagId);

        if (error) throw error;
        setSelectedTagIds(prev => prev.filter(id => id !== tagId));
      } else {
        // Add tag
        const { error } = await supabase
          .from('conversation_tags')
          .insert({ conversation_id: conversationId, tag_id: tagId });

        if (error) throw error;
        setSelectedTagIds(prev => [...prev, tagId]);
      }
      
      onTagsChange?.();
    } catch (error: any) {
      toast.error('Erro ao atualizar tag');
    }
  };

  const selectedTags = allTags.filter(t => selectedTagIds.includes(t.id));

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
          {selectedTags.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
              {selectedTags.length}
            </span>
          )}
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : allTags.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm px-4">
              Nenhuma etiqueta criada.
              <br />
              Crie etiquetas em Contatos → Tags.
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {allTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <div
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                      isSelected ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color || '#3B82F6' }}
                    />
                    <span className="flex-1 text-sm truncate">{tag.name}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {selectedTags.length > 0 && (
          <div className="p-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Selecionadas:</p>
            <div className="flex flex-wrap gap-1">
              {selectedTags.map((tag) => (
                <Badge 
                  key={tag.id}
                  variant="secondary"
                  className="text-xs gap-1"
                  style={{ 
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                    borderColor: tag.color 
                  }}
                >
                  {tag.name}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:opacity-70" 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTag(tag.id);
                    }}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};