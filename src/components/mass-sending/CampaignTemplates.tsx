import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BookmarkPlus, MoreVertical, Play, Trash2, Edit2, Copy, FileText, Image, Video, Music, MousePointer, List, LayoutGrid, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CampaignTemplate {
  id: string;
  name: string;
  connection_id: string | null;
  message_type: string;
  message_content: string | null;
  media_url: string | null;
  interactive_type: string | null;
  buttons: any[];
  list_items: any[];
  carousel_cards: any[];
  contact_source: string | null;
  selected_tags: string[];
  created_at: string;
}

interface CampaignTemplatesProps {
  templates: CampaignTemplate[];
  onRefresh: () => void;
  onUseTemplate: (template: CampaignTemplate) => void;
  connections: { id: string; name: string }[];
}

export function CampaignTemplates({ templates, onRefresh, onUseTemplate, connections }: CampaignTemplatesProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<CampaignTemplate | null>(null);
  const [newName, setNewName] = useState("");

  const getTypeIcon = (type: string, interactiveType: string | null) => {
    if (interactiveType === "buttons") return <MousePointer className="w-4 h-4" />;
    if (interactiveType === "list") return <List className="w-4 h-4" />;
    if (interactiveType === "carousel") return <LayoutGrid className="w-4 h-4" />;
    
    switch (type) {
      case "image": return <Image className="w-4 h-4" />;
      case "video": return <Video className="w-4 h-4" />;
      case "audio": return <Music className="w-4 h-4" />;
      case "document": return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string, interactiveType: string | null) => {
    if (interactiveType && interactiveType !== "none") {
      return interactiveType === "buttons" ? "Botões" : 
             interactiveType === "list" ? "Lista" : "Carrossel";
    }
    return type === "text" ? "Texto" : 
           type === "image" ? "Imagem" : 
           type === "video" ? "Vídeo" : 
           type === "audio" ? "Áudio" : "Documento";
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Excluir este template?")) return;
    setDeleting(id);
    try {
      await supabase.from("campaign_templates").delete().eq("id", id);
      toast.success("Template excluído");
      onRefresh();
    } catch (err) {
      toast.error("Erro ao excluir");
    }
    setDeleting(null);
  };

  const duplicateTemplate = async (template: CampaignTemplate) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      await supabase.from("campaign_templates").insert({
        user_id: userData.user.id,
        name: `${template.name} (cópia)`,
        connection_id: template.connection_id,
        message_type: template.message_type,
        message_content: template.message_content,
        media_url: template.media_url,
        interactive_type: template.interactive_type,
        buttons: template.buttons,
        list_items: template.list_items,
        carousel_cards: template.carousel_cards,
        contact_source: template.contact_source,
        selected_tags: template.selected_tags
      });
      toast.success("Template duplicado");
      onRefresh();
    } catch (err) {
      toast.error("Erro ao duplicar");
    }
  };

  const renameTemplate = async () => {
    if (!renaming || !newName.trim()) return;
    try {
      await supabase.from("campaign_templates").update({ name: newName.trim() }).eq("id", renaming.id);
      toast.success("Template renomeado");
      setRenaming(null);
      setNewName("");
      onRefresh();
    } catch (err) {
      toast.error("Erro ao renomear");
    }
  };

  const getConnectionName = (id: string | null) => {
    if (!id) return "Nenhuma";
    return connections.find(c => c.id === id)?.name || "Desconhecida";
  };

  if (templates.length === 0) {
    return (
      <Card className="p-8 text-center">
        <BookmarkPlus className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-1">Nenhum template salvo</h3>
        <p className="text-sm text-muted-foreground">
          Ao criar uma campanha, você pode salvar como template para reutilizar depois.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {templates.map(template => (
          <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  {getTypeIcon(template.message_type, template.interactive_type)}
                </div>
                <div>
                  <p className="font-medium text-sm truncate max-w-[150px]">{template.name}</p>
                  <p className="text-xs text-muted-foreground">{getConnectionName(template.connection_id)}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onUseTemplate(template)}>
                    <Play className="w-4 h-4 mr-2" />Usar Template
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setRenaming(template); setNewName(template.name); }}>
                    <Edit2 className="w-4 h-4 mr-2" />Renomear
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => duplicateTemplate(template)}>
                    <Copy className="w-4 h-4 mr-2" />Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => deleteTemplate(template.id)} className="text-destructive">
                    {deleting === template.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {getTypeLabel(template.message_type, template.interactive_type)}
              </Badge>
              {template.message_content && (
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                  {template.message_content.substring(0, 30)}...
                </span>
              )}
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-3"
              onClick={() => onUseTemplate(template)}
            >
              <Play className="w-3 h-3 mr-1" />
              Usar Template
            </Button>
          </Card>
        ))}
      </div>

      <Dialog open={!!renaming} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Renomear Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)} 
              placeholder="Nome do template"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenaming(null)}>Cancelar</Button>
              <Button onClick={renameTemplate} disabled={!newName.trim()}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
