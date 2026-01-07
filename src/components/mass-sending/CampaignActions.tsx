import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Tag, Send, MessageSquare, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TagItem {
  id: string;
  name: string;
  color: string | null;
}

interface CampaignAction {
  id: string;
  action_type: string;
  tag_id: string;
  is_enabled: boolean;
}

interface CampaignActionsProps {
  tags: TagItem[];
  onActionsChange?: (actions: CampaignAction[]) => void;
}

export function CampaignActions({ tags, onActionsChange }: CampaignActionsProps) {
  const [actions, setActions] = useState<CampaignAction[]>([]);

  const addAction = (type: "tag_on_send" | "tag_on_response") => {
    if (tags.length === 0) {
      toast.error("Crie etiquetas primeiro na página de Contatos");
      return;
    }
    const newAction: CampaignAction = {
      id: `action_${Date.now()}`,
      action_type: type,
      tag_id: tags[0].id,
      is_enabled: true,
    };
    const updated = [...actions, newAction];
    setActions(updated);
    onActionsChange?.(updated);
  };

  const updateAction = (id: string, field: keyof CampaignAction, value: any) => {
    const updated = actions.map((a) =>
      a.id === id ? { ...a, [field]: value } : a
    );
    setActions(updated);
    onActionsChange?.(updated);
  };

  const removeAction = (id: string) => {
    const updated = actions.filter((a) => a.id !== id);
    setActions(updated);
    onActionsChange?.(updated);
  };

  const getTagById = (tagId: string) => tags.find((t) => t.id === tagId);

  const getActionLabel = (type: string) => {
    switch (type) {
      case "tag_on_send":
        return "Etiquetar ao enviar";
      case "tag_on_response":
        return "Etiquetar quando responder";
      default:
        return type;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "tag_on_send":
        return Send;
      case "tag_on_response":
        return MessageSquare;
      default:
        return Tag;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base">Ações Automáticas</Label>
          <p className="text-xs text-muted-foreground">
            Configure ações que serão executadas automaticamente
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addAction("tag_on_send")}
          className="flex items-center gap-2"
        >
          <Send className="w-3 h-3" />
          Etiquetar ao enviar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addAction("tag_on_response")}
          className="flex items-center gap-2"
        >
          <MessageSquare className="w-3 h-3" />
          Etiquetar quando responder
        </Button>
      </div>

      {actions.length > 0 && (
        <div className="space-y-2">
          {actions.map((action) => {
            const Icon = getActionIcon(action.action_type);
            const tag = getTagById(action.tag_id);
            return (
              <Card key={action.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {getActionLabel(action.action_type)}
                    </span>
                  </div>
                  <Select
                    value={action.tag_id}
                    onValueChange={(v) => updateAction(action.id, "tag_id", v)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tags.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: t.color || "#3B82F6" }}
                            />
                            {t.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Switch
                    checked={action.is_enabled}
                    onCheckedChange={(v) =>
                      updateAction(action.id, "is_enabled", v)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAction(action.id)}
                    className="shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {actions.length === 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
          <Tag className="w-6 h-6 mx-auto mb-2 opacity-50" />
          <p>Nenhuma ação configurada</p>
          <p className="text-xs">Clique nos botões acima para adicionar</p>
        </div>
      )}
    </div>
  );
}
