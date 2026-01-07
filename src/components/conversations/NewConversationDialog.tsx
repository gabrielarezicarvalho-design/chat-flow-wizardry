import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquarePlus, CheckCircle, XCircle, Loader2, Search, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Contact {
  contact_name: string;
  jid: string;
  phone: string;
  isSaved?: boolean;
}

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
  const [checkingNumber, setCheckingNumber] = useState(false);
  const [numberValid, setNumberValid] = useState<boolean | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [activeConnection, setActiveConnection] = useState<any>(null);
  const queryClient = useQueryClient();

  const [savedContacts, setSavedContacts] = useState<any[]>([]);
  const [loadingSavedContacts, setLoadingSavedContacts] = useState(false);

  useEffect(() => {
    if (open) {
      loadContacts();
      loadSavedContacts();
      // Update state when defaults change
      setPhone(defaultPhone);
      setName(defaultName);
    }
  }, [open, defaultPhone, defaultName]);

  // Load saved contacts from leads table
  const loadSavedContacts = async () => {
    setLoadingSavedContacts(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // For agents, get connections assigned to them and fetch leads from those connections' owners
      const { data: userConnections } = await supabase
        .from('user_connections')
        .select(`
          connection_id,
          connections (
            id,
            user_id
          )
        `)
        .eq('user_id', user.id);

      // Collect user_ids from assigned connections
      const ownerIds = new Set<string>();
      ownerIds.add(user.id); // Always include own leads
      
      if (userConnections && userConnections.length > 0) {
        userConnections.forEach((uc: any) => {
          if (uc.connections?.user_id) {
            ownerIds.add(uc.connections.user_id);
          }
        });
      }

      // Fetch leads from all relevant owners
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, name, phone, avatar')
        .in('user_id', Array.from(ownerIds))
        .order('name');

      if (error) {
        console.error("Erro ao buscar leads:", error);
        return;
      }

      if (leads) {
        setSavedContacts(leads);
        console.log(`📇 ${leads.length} contatos salvos carregados`);
      }
    } catch (error) {
      console.error("Erro ao carregar contatos salvos:", error);
    } finally {
      setLoadingSavedContacts(false);
    }
  };

  const loadContacts = async () => {
    setLoadingContacts(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First try to get assigned connections (for agents)
      const { data: userConnections } = await supabase
        .from('user_connections')
        .select(`
          connection_id,
          connections (
            id, name, status, token, environment, base_url
          )
        `)
        .eq('user_id', user.id);

      let activeConnection = null;

      // Check assigned connections first
      if (userConnections && userConnections.length > 0) {
        const assignedConns = userConnections
          .map((uc: any) => uc.connections)
          .filter((c: any) => c && c.status === 'connected');
        
        if (assignedConns.length > 0) {
          activeConnection = assignedConns[0];
        }
      }

      // If no assigned connections, check owned connections
      if (!activeConnection) {
        const { data: connections } = await supabase
          .from("connections")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "connected")
          .limit(1);

        if (connections && connections.length > 0) {
          activeConnection = connections[0];
        }
      }

      if (!activeConnection) {
        setLoadingContacts(false);
        return;
      }

      setActiveConnection(activeConnection);

      const { data, error } = await supabase.functions.invoke('wa-contacts', {
        body: {
          action: "list",
          connectionId: activeConnection.id
        }
      });

      if (error) throw error;

      const contactList = Array.isArray(data?.data) ? data.data : 
                         Array.isArray(data) ? data : [];
      
      const mappedContacts = contactList.map((c: any) => ({
        contact_name: c.contact_name || c.name || 'Sem nome',
        jid: c.jid || '',
        phone: c.jid?.replace(/@.*$/, '') || ''
      }));

      setContacts(mappedContacts);
    } catch (error) {
      console.error("Erro ao carregar contatos:", error);
    } finally {
      setLoadingContacts(false);
    }
  };

  // Combine WhatsApp contacts with saved contacts
  const combinedContacts = [...contacts];
  
  // Add saved contacts that are not already in the WhatsApp contact list
  savedContacts.forEach(saved => {
    const exists = contacts.some(c => c.phone === saved.phone);
    if (!exists) {
      combinedContacts.push({
        contact_name: saved.name,
        jid: '',
        phone: saved.phone,
        isSaved: true
      });
    }
  });

  const filteredContacts = combinedContacts.filter(c => 
    c.contact_name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.phone.includes(contactSearch)
  );

  const selectContact = (contact: any) => {
    setName(contact.contact_name || contact.name);
    setPhone(contact.phone);
    setNumberValid(true);
  };

  const checkWhatsAppNumber = async () => {
    if (!phone.trim()) {
      toast.error("Digite um número de telefone");
      return;
    }

    setCheckingNumber(true);
    setNumberValid(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: connections } = await supabase
        .from("connections")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "connected")
        .limit(1);

      if (!connections || connections.length === 0) {
        toast.error("Você precisa ter uma conexão ativa");
        return;
      }

      const cleanPhone = phone.replace(/\D/g, "");
      
      const { data, error } = await supabase.functions.invoke('wa-contacts', {
        body: {
          action: "check",
          connectionId: connections[0].id,
          numbers: [cleanPhone]
        }
      });

      if (error) throw error;
      
      const isValid = data?.data?.[0]?.exists || data?.data?.[0]?.valid || false;
      setNumberValid(isValid);
      
      if (isValid) {
        toast.success("Número válido no WhatsApp!");
      } else {
        toast.error("Número não encontrado no WhatsApp");
      }
    } catch (error: any) {
      console.error("Erro ao verificar número:", error);
      toast.error(error.message || "Erro ao verificar número");
    } finally {
      setCheckingNumber(false);
    }
  };

  const handleCreateConversation = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Check for active connection - first try assigned connections (for agents)
      let connectionId = activeConnection?.id;

      if (!connectionId) {
        const { data: userConnections } = await supabase
          .from('user_connections')
          .select(`
            connection_id,
            connections (id, status)
          `)
          .eq('user_id', user.id);

        const assignedActiveConn = userConnections
          ?.map((uc: any) => uc.connections)
          .find((c: any) => c && c.status === 'connected');

        if (assignedActiveConn) {
          connectionId = assignedActiveConn.id;
        }
      }

      // Fallback to owned connections
      if (!connectionId) {
        const { data: connections } = await supabase
          .from("connections")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "connected")
          .limit(1);

        if (connections && connections.length > 0) {
          connectionId = connections[0].id;
        }
      }

      if (!connectionId) {
        toast.error("Você precisa ter uma conexão ativa para iniciar uma conversa");
        return;
      }

      const cleanPhone = phone.replace(/\D/g, "");

      let { data: lead } = await supabase
        .from("leads")
        .select("id")
        .eq("user_id", user.id)
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (!lead) {
        const { data: newLead, error: leadError } = await supabase
          .from("leads")
          .insert({
            user_id: user.id,
            name,
            phone: cleanPhone,
            origin: "WhatsApp",
            status: "warm"
          })
          .select()
          .single();

        if (leadError) throw leadError;
        lead = newLead;
      }

      const { error: convError } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          lead_id: lead.id,
          connection_id: connectionId,
          platform: "whatsapp",
          user_phone: cleanPhone,
          user_name: name,
          status: "active",
          last_message: "Conversa iniciada"
        });

      if (convError) throw convError;

      toast.success("Conversa criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
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
    setNumberValid(null);
    setContactSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <MessageSquarePlus className="w-5 h-5 mr-2" />
          Nova Conversa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar Nova Conversa</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="contacts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contacts">Contatos Salvos</TabsTrigger>
            <TabsTrigger value="phone">Por Telefone</TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contato..."
                className="pl-10"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
              />
            </div>

            <ScrollArea className="h-[300px]">
              {(loadingContacts || loadingSavedContacts) ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Carregando contatos...</p>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum contato encontrado</p>
                  <p className="text-xs mt-1">Os contatos serão sincronizados automaticamente</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredContacts.map((contact, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectContact(contact)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                        phone === contact.phone 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-accent'
                      }`}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className={`text-sm ${
                          phone === contact.phone 
                            ? 'bg-primary-foreground/20 text-primary-foreground' 
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {contact.contact_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{contact.contact_name}</p>
                        <p className={`text-xs ${phone === contact.phone ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{contact.phone}</p>
                      </div>
                      {phone === contact.phone && (
                        <CheckCircle className="w-5 h-5 text-primary-foreground" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {phone && (
              <Button 
                onClick={handleCreateConversation} 
                disabled={loading || !name}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  `Conversar com ${name}`
                )}
              </Button>
            )}
          </TabsContent>

          <TabsContent value="phone" className="space-y-4">
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
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="phone"
                    placeholder="Ex: 5511999999999"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setNumberValid(null);
                    }}
                    className="pr-10"
                  />
                  {numberValid !== null && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {numberValid ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  onClick={checkWhatsAppNumber}
                  disabled={checkingNumber || !phone.trim()}
                >
                  {checkingNumber ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Verificar"
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Inclua código do país + DDD + número
              </p>
            </div>

            <Button
              onClick={handleCreateConversation} 
              disabled={loading || !name || !phone}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Conversa"
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
