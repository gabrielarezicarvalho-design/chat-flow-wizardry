import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Users, Download, Upload, Tag, RefreshCw } from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { useConnections } from "@/hooks/useConnections";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const Contacts = () => {
  const { leads, isLoading } = useLeads();
  const { connections } = useConnections();
  const [searchTerm, setSearchTerm] = useState("");
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();
  
  const activeConnection = connections.find(c => c.status === 'connected');

  const filteredLeads = leads.filter((lead) =>
    lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone?.includes(searchTerm) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lead.tags && lead.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const handleSyncFromWhatsApp = async () => {
    if (!activeConnection) {
      toast.error("Nenhuma conexão ativa encontrada");
      return;
    }

    const connAny = activeConnection as any;
    if (!connAny.token) {
      toast.error("Conexão sem token");
      return;
    }

    setSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('wa-contacts', {
        body: {
          action: 'sync',
          connectionId: activeConnection.id,
          userId: user?.id
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`${data.added} contatos sincronizados! (${data.skipped} já existentes)`);
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      } else {
        toast.error(data?.error || "Erro ao sincronizar");
      }
    } catch (err) {
      console.error("Error syncing:", err);
      toast.error("Erro ao sincronizar contatos");
    } finally {
      setSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contatos</h1>
          <p className="text-muted-foreground">
            {leads.length} contatos
            {activeConnection && ` • Sincronizado com: ${activeConnection.instance_name}`}
          </p>
        </div>
        <div className="flex gap-2">
          {activeConnection && (
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleSyncFromWhatsApp}
              disabled={syncing}
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar WhatsApp'}
            </Button>
          )}
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            Importar
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar contatos ou etiquetas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Contacts Grid */}
      {filteredLeads.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Nenhum contato encontrado</h3>
          <p className="text-muted-foreground mb-4">
            {leads.length === 0 
              ? "Adicione contatos ou sincronize do WhatsApp"
              : "Nenhum contato corresponde à busca"
            }
          </p>
          {activeConnection && leads.length === 0 && (
            <Button onClick={handleSyncFromWhatsApp} disabled={syncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar do WhatsApp
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(lead.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{lead.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{lead.phone}</p>
                    {lead.email && (
                      <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                    )}
                    {/* Tags */}
                    {lead.tags && lead.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {lead.tags.map((tag: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {lead.source || 'Manual'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Contacts;
