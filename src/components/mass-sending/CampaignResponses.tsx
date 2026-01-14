import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, Search, Phone, User, Calendar, Eye, Megaphone, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Campaign {
  id: string;
  name: string;
}

interface CampaignResponse {
  id: string;
  campaign_id: string;
  contact_phone: string;
  contact_name: string | null;
  response_text: string | null;
  response_type: string;
  response_value: string | null;
  responded_at: string;
  campaign?: Campaign;
}

interface CampaignResponsesProps {
  campaigns: Campaign[];
}

export function CampaignResponses({ campaigns }: CampaignResponsesProps) {
  const [responses, setResponses] = useState<CampaignResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [selectedResponse, setSelectedResponse] = useState<CampaignResponse | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadResponses();
  }, []);

  const loadResponses = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from("campaign_responses")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("responded_at", { ascending: false });

      if (error) throw error;

      // Map campaign names
      const responsesWithCampaigns = (data || []).map((r: any) => ({
        ...r,
        campaign: campaigns.find((c) => c.id === r.campaign_id),
      }));

      setResponses(responsesWithCampaigns);
    } catch (err) {
      console.error("Error loading responses:", err);
      toast.error("Erro ao carregar respostas");
    }
    setLoading(false);
  };

  const filteredResponses = responses.filter((r) => {
    const matchesSearch =
      !search ||
      r.contact_phone.includes(search) ||
      r.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.response_text?.toLowerCase().includes(search.toLowerCase());

    const matchesCampaign =
      selectedCampaign === "all" || r.campaign_id === selectedCampaign;

    return matchesSearch && matchesCampaign;
  });

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "").replace("@s.whatsapp.net", "");
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return cleaned;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por telefone, nome ou mensagem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Filtrar por campanha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as campanhas</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={loadResponses}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold">{responses.length}</p>
          <p className="text-xs text-muted-foreground">Total de Respostas</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold">
            {new Set(responses.map((r) => r.contact_phone)).size}
          </p>
          <p className="text-xs text-muted-foreground">Contatos Únicos</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold">
            {responses.filter((r) => r.response_type === "button").length}
          </p>
          <p className="text-xs text-muted-foreground">Cliques em Botões</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold">
            {responses.filter((r) => r.response_type === "poll").length}
          </p>
          <p className="text-xs text-muted-foreground">Votos em Enquetes</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold">
            {responses.filter((r) => r.response_type === "text").length}
          </p>
          <p className="text-xs text-muted-foreground">Mensagens de Texto</p>
        </Card>
      </div>

      {/* Responses List */}
      {filteredResponses.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-1">Nenhuma resposta encontrada</h3>
          <p className="text-sm text-muted-foreground">
            {responses.length === 0
              ? "As respostas de campanhas aparecerão aqui"
              : "Tente ajustar os filtros de busca"}
          </p>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {filteredResponses.map((r) => (
              <Card
                key={r.id}
                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedResponse(r);
                  setShowDetails(true);
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {r.contact_name || formatPhone(r.contact_phone)}
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {r.response_type === "button"
                          ? "Botão"
                          : r.response_type === "list"
                          ? "Lista"
                          : r.response_type === "poll"
                          ? "Enquete"
                          : "Texto"}
                      </Badge>
                    </div>
                    {r.campaign && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Megaphone className="w-3 h-3" />
                        <span>{r.campaign.name}</span>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {r.response_value || r.response_text || "Sem conteúdo"}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {format(new Date(r.responded_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Resposta</DialogTitle>
          </DialogHeader>
          {selectedResponse && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Contato</p>
                  <p className="font-medium">
                    {selectedResponse.contact_name ||
                      formatPhone(selectedResponse.contact_phone)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium font-mono">
                    {formatPhone(selectedResponse.contact_phone)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Campanha</p>
                  <p className="font-medium">
                    {selectedResponse.campaign?.name || "Não identificada"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <Badge variant="outline">
                    {selectedResponse.response_type === "button"
                      ? "Clique em Botão"
                      : selectedResponse.response_type === "list"
                      ? "Seleção de Lista"
                      : selectedResponse.response_type === "poll"
                      ? "Voto em Enquete"
                      : "Mensagem de Texto"}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Respondido em</p>
                  <p className="font-medium">
                    {format(
                      new Date(selectedResponse.responded_at),
                      "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss",
                      { locale: ptBR }
                    )}
                  </p>
                </div>
              </div>
              {selectedResponse.response_value && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Valor Selecionado
                  </p>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="font-medium">{selectedResponse.response_value}</p>
                  </div>
                </div>
              )}
              {selectedResponse.response_text && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Mensagem</p>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    {selectedResponse.response_text}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" asChild>
                  <a
                    href={`https://wa.me/${selectedResponse.contact_phone
                      .replace(/\D/g, "")
                      .replace("@s.whatsapp.net", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Abrir WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
