import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, RefreshCw, UserPlus, Phone, Download, Upload, MessageSquare, Tag, Edit, Mail, Calendar, Trash2, FileSpreadsheet } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useConnections } from "@/hooks/useConnections";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EditContactDialog } from "@/components/conversations/EditContactDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";

interface Contact {
  id?: string;
  contact_name: string;
  contact_FirstName?: string;
  jid: string;
  phone?: string;
  // DB lead fields
  dbId?: string;
  email?: string;
  birth_date?: string;
  tags?: string[];
  notes?: string;
}

const Contacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [dbLeads, setDbLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [editContactOpen, setEditContactOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [addingContact, setAddingContact] = useState(false);
  const { connections } = useConnections();
  
  const activeConnection = connections.find((c: any) => c.status === 'connected');

  // Get all unique tags from contacts
  const allTags = Array.from(new Set(dbLeads.flatMap(lead => lead.tags || [])));

  const extractPhoneFromJid = (jid: string): string => {
    return jid?.replace(/@.*$/, '') || '';
  };

  // Fetch leads from database - RLS handles access control
  const fetchDbLeads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Don't filter by user_id - let RLS handle access control
      // This allows agents to see leads from their assigned connections
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Leads fetched:', data?.length);
      setDbLeads(data || []);
    } catch (err) {
      console.error("Erro ao buscar leads:", err);
    }
  };

  // Subscribe to real-time updates on leads table
  useEffect(() => {
    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          console.log('Lead change received:', payload);
          // Refresh leads when any change occurs
          fetchDbLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchContacts = async () => {
    if (!activeConnection) {
      toast.error("Nenhuma conexão ativa encontrada");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wa-contacts', {
        body: {
          action: "list",
          connectionId: activeConnection.id
        }
      });

      if (error) throw error;
      
      const contactList = data?.contacts || 
                         (Array.isArray(data?.data) ? data.data : 
                         Array.isArray(data) ? data : []);
      
      const mappedContacts = contactList.map((c: any, index: number) => ({
        id: c.jid || String(index),
        contact_name: c.contact_name || c.name || c.notify || 'Sem nome',
        contact_FirstName: c.contact_FirstName || '',
        jid: c.jid || c.id || '',
        phone: extractPhoneFromJid(c.jid || c.id || '')
      }));
      
      // Deduplicate by phone
      const uniqueContacts = mappedContacts.reduce((acc: Contact[], current: Contact) => {
        const exists = acc.find(c => c.phone === current.phone);
        if (!exists && current.phone) {
          acc.push(current);
        }
        return acc;
      }, []);
      
      setContacts(uniqueContacts);
      toast.success(`${uniqueContacts.length} contatos carregados`);
    } catch (err: any) {
      console.error("Erro ao buscar contatos:", err);
      toast.error(err.message || "Erro ao buscar contatos");
    } finally {
      setLoading(false);
    }
  };

  // Sync contacts from WhatsApp to database (leads table)
  const syncContacts = async () => {
    if (!activeConnection) {
      toast.error("Nenhuma conexão ativa encontrada");
      return;
    }

    setSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.functions.invoke('wa-contacts', {
        body: {
          action: "sync",
          connectionId: activeConnection.id,
          userId: user.id
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success(`Sincronização concluída! ${data.added} novos contatos adicionados, ${data.skipped} já existiam.`);
        // Refresh db leads after sync
        await fetchDbLeads();
      } else {
        throw new Error(data?.error || "Erro na sincronização");
      }
    } catch (err: any) {
      console.error("Erro ao sincronizar contatos:", err);
      toast.error(err.message || "Erro ao sincronizar contatos");
    } finally {
      setSyncing(false);
    }
  };

  // Initial load of leads only (no auto-sync from WhatsApp)
  useEffect(() => {
    fetchDbLeads();
  }, []);

  // Don't auto-fetch WhatsApp contacts anymore - only load from database
  // User can manually sync using the sync button

  // Use DB leads as primary source (already synced contacts)
  const allContacts = dbLeads.map(lead => ({
    id: lead.id,
    contact_name: lead.name,
    jid: '',
    phone: lead.phone,
    dbId: lead.id,
    email: lead.email,
    birth_date: lead.birth_date,
    tags: lead.tags || [],
    notes: lead.notes,
    origin: lead.origin,
    created_at: lead.created_at
  })).sort((a, b) => {
    return (a.contact_name || '').localeCompare(b.contact_name || '');
  });

  const filteredContacts = allContacts.filter((contact) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = (
      contact.contact_name?.toLowerCase().includes(searchLower) ||
      contact.phone?.includes(searchQuery) ||
      contact.email?.toLowerCase().includes(searchLower)
    );

    const matchesTag = tagFilter === "all" || 
      (contact.tags && contact.tags.includes(tagFilter));

    return matchesSearch && matchesTag;
  });

  const addContact = async () => {
    if (!activeConnection || !newContactName.trim() || !newContactPhone.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    // Check for duplicate
    const cleanPhone = newContactPhone.replace(/\D/g, '');
    const exists = dbLeads.some(l => l.phone === cleanPhone) || 
                   contacts.some(c => c.phone === cleanPhone);
    
    if (exists) {
      toast.error("Este número já existe na sua lista de contatos");
      return;
    }

    setAddingContact(true);
    try {
      // Add to WhatsApp
      const { data, error } = await supabase.functions.invoke('wa-contacts', {
        body: {
          action: "add",
          connectionId: activeConnection.id,
          phone: cleanPhone,
          name: newContactName
        }
      });

      if (error) throw error;
      
      // Also add to leads database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('leads').insert({
          user_id: user.id,
          phone: cleanPhone,
          name: newContactName,
          origin: "Manual",
          status: "novo"
        });
      }
      
      toast.success("Contato adicionado!");
      setAddContactOpen(false);
      setNewContactName("");
      setNewContactPhone("");
      fetchContacts();
      fetchDbLeads();
    } catch (err: any) {
      toast.error(err.message || "Erro ao adicionar contato");
    } finally {
      setAddingContact(false);
    }
  };

  const checkNumber = async (phone: string) => {
    if (!activeConnection) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('wa-contacts', {
        body: {
          action: "check",
          connectionId: activeConnection.id,
          numbers: [phone]
        }
      });

      if (error) throw error;
      const isValid = data?.data?.[0]?.exists || data?.data?.[0]?.valid || data?.results?.[0]?.exists || false;
      if (isValid) {
        toast.success("Número válido no WhatsApp!");
      } else {
        toast.error("Número não encontrado no WhatsApp");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao verificar número");
    }
  };

  const exportContacts = () => {
    if (allContacts.length === 0) {
      toast.error("Nenhum contato para exportar");
      return;
    }

    const csvContent = "Nome,Telefone,Email,Tags\n" + allContacts
      .map(c => `"${c.contact_name}","${c.phone}","${c.email || ''}","${(c.tags || []).join(';')}"`)
      .join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `contatos_whatsapp_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success("Contatos exportados!");
  };

  // Download template spreadsheet
  const downloadTemplate = () => {
    const templateData = [
      { nome: "João Silva", telefone: "5511999999999", email: "joao@email.com", tags: "cliente;vip" },
      { nome: "Maria Santos", telefone: "5511888888888", email: "maria@email.com", tags: "lead" }
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contatos");
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // nome
      { wch: 18 }, // telefone
      { wch: 30 }, // email
      { wch: 20 }  // tags
    ];
    
    XLSX.writeFile(wb, "modelo_contatos.xlsx");
    toast.success("Modelo baixado!");
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast.error("Formato inválido. Use .xlsx, .xls ou .csv");
        return;
      }
      setImportFile(file);
    }
  };

  const importContacts = async () => {
    if (!importFile) {
      toast.error("Selecione um arquivo para importar");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    setImporting(true);
    
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
          
          if (jsonData.length === 0) {
            toast.error("Planilha vazia ou formato inválido");
            setImporting(false);
            return;
          }

          let successCount = 0;
          let errorCount = 0;
          let duplicateCount = 0;

          // Get existing phones
          const existingPhones = new Set(dbLeads.map(l => l.phone));

          for (const row of jsonData) {
            // Support different column names
            const name = String(row.nome || row.name || row.Nome || row.Name || '').trim();
            const phone = String(row.telefone || row.phone || row.Telefone || row.Phone || row.celular || row.Celular || '').trim();
            const email = String(row.email || row.Email || row['e-mail'] || row['E-mail'] || '').trim();
            const tagsStr = String(row.tags || row.Tags || row.etiquetas || row.Etiquetas || '').trim();
            
            if (!name || !phone) {
              errorCount++;
              continue;
            }

            const cleanPhone = phone.replace(/\D/g, '');
            
            // Validate phone length
            if (cleanPhone.length < 10 || cleanPhone.length > 15) {
              errorCount++;
              continue;
            }
            
            // Skip duplicates
            if (existingPhones.has(cleanPhone)) {
              duplicateCount++;
              continue;
            }

            try {
              const tags = tagsStr ? tagsStr.split(';').map(t => t.trim()).filter(Boolean) : [];
              
              await supabase.from('leads').insert({
                user_id: user.id,
                phone: cleanPhone,
                name: name.substring(0, 100), // Limit name length
                email: email ? email.substring(0, 255) : null,
                tags: tags.length > 0 ? tags : null,
                origin: "Import Planilha",
                status: "novo"
              });
              
              existingPhones.add(cleanPhone);
              successCount++;
            } catch {
              errorCount++;
            }
          }
          
          setImporting(false);
          setImportOpen(false);
          setImportFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          
          toast.success(`${successCount} importados, ${duplicateCount} duplicados ignorados, ${errorCount} erros`);
          fetchDbLeads();
        } catch (parseError) {
          console.error("Erro ao processar planilha:", parseError);
          toast.error("Erro ao processar planilha. Verifique o formato.");
          setImporting(false);
        }
      };
      
      reader.onerror = () => {
        toast.error("Erro ao ler arquivo");
        setImporting(false);
      };
      
      reader.readAsArrayBuffer(importFile);
    } catch (err: any) {
      toast.error(err.message || "Erro ao importar contatos");
      setImporting(false);
    }
  };

  const startConversation = async (contact: Contact) => {
    if (!activeConnection) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let lead: any = null;
      
      if (contact.dbId) {
        lead = { id: contact.dbId };
      } else {
        const { data: existingLead } = await supabase
          .from("leads")
          .select("id")
          .eq("user_id", user.id)
          .eq("phone", contact.phone)
          .maybeSingle();

        if (existingLead) {
          lead = existingLead;
        } else {
          const { data: newLead, error: leadError } = await supabase
            .from("leads")
            .insert({
              user_id: user.id,
              name: contact.contact_name,
              phone: contact.phone,
              origin: "WhatsApp",
              status: "warm"
            })
            .select()
            .single();

          if (leadError) throw leadError;
          lead = newLead;
        }
      }

      const { error: convError } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          lead_id: lead.id,
          connection_id: activeConnection.id,
          platform: "whatsapp",
          user_phone: contact.phone,
          user_name: contact.contact_name,
          status: "active",
          last_message: "Conversa iniciada"
        });

      if (convError) throw convError;
      toast.success("Conversa criada! Vá para Conversas.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar conversa");
    }
  };

  const [deleteContactOpen, setDeleteContactOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  const handleEditContact = async (contact: Contact) => {
    if (!contact.dbId) {
      // Create lead first
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        const { data: newLead, error } = await supabase
          .from("leads")
          .insert({
            user_id: user.id,
            name: contact.contact_name,
            phone: contact.phone,
            origin: "WhatsApp",
            status: "warm"
          })
          .select()
          .single();

        if (error) throw error;
        setSelectedLead(newLead);
      } catch (err: any) {
        toast.error(err.message || "Erro ao criar contato");
        return;
      }
    } else {
      const dbLead = dbLeads.find(l => l.id === contact.dbId);
      setSelectedLead(dbLead);
    }
    setEditContactOpen(true);
  };

  const handleDeleteContact = async () => {
    if (!contactToDelete?.dbId) {
      toast.error("Este contato não está salvo no banco de dados");
      setDeleteContactOpen(false);
      setContactToDelete(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", contactToDelete.dbId);

      if (error) throw error;
      
      toast.success("Contato removido!");
      fetchDbLeads();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover contato");
    } finally {
      setDeleteContactOpen(false);
      setContactToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contatos</h1>
          <p className="text-muted-foreground mt-1">
            {dbLeads.length} contatos no banco de dados
            {activeConnection && ` • Sincronizado com: ${activeConnection.name}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importOpen} onOpenChange={(open) => {
            setImportOpen(open);
            if (!open) {
              setImportFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Importar Contatos por Planilha</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
                  <div className="flex items-center gap-3 mb-3">
                    <FileSpreadsheet className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-medium text-sm">Modelo de Planilha</p>
                      <p className="text-xs text-muted-foreground">Baixe e preencha com seus contatos</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Modelo (.xlsx)
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>Selecionar Planilha</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Formatos aceitos: .xlsx, .xls, .csv
                  </p>
                </div>
                
                {importFile && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700 truncate flex-1">{importFile.name}</span>
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Colunas obrigatórias:</strong> nome, telefone</p>
                  <p><strong>Colunas opcionais:</strong> email, tags (separadas por ;)</p>
                  <p>Números duplicados serão ignorados automaticamente</p>
                </div>
                
                <Button onClick={importContacts} disabled={importing || !importFile} className="w-full">
                  {importing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  {importing ? "Importando..." : "Importar Contatos"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" onClick={exportContacts} disabled={allContacts.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          
          <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={!activeConnection}>
                <UserPlus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Contato</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    placeholder="Nome do contato"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Telefone (com DDD)</Label>
                  <Input
                    placeholder="5511999999999"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                  />
                </div>
                <Button onClick={addContact} disabled={addingContact} className="w-full">
                  {addingContact ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button 
            onClick={syncContacts} 
            disabled={!activeConnection || syncing}
            title="Sincronizar contatos do WhatsApp com o banco de dados"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {allTags.length > 0 && (
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tags</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-280px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery || tagFilter !== "all" 
                ? "Nenhum contato encontrado com os filtros aplicados"
                : "Nenhum contato encontrado. Clique em Sincronizar para buscar do WhatsApp."
              }
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContacts.map((contact, index) => (
                <div
                  key={contact.id || contact.phone || index}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {contact.contact_name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{contact.contact_name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        <span>{contact.phone}</span>
                        {contact.email && (
                          <>
                            <Mail className="w-3 h-3 ml-2" />
                            <span>{contact.email}</span>
                          </>
                        )}
                        {contact.birth_date && (
                          <>
                            <Calendar className="w-3 h-3 ml-2" />
                            <span>{new Date(contact.birth_date).toLocaleDateString('pt-BR')}</span>
                          </>
                        )}
                      </div>
                      {contact.tags && contact.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {contact.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditContact(contact)}
                      title="Editar contato"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startConversation(contact)}
                      disabled={!activeConnection}
                      title="Iniciar conversa"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => contact.phone && checkNumber(contact.phone)}
                      disabled={!activeConnection}
                      title="Verificar número"
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setContactToDelete(contact);
                        setDeleteContactOpen(true);
                      }}
                      title="Remover contato"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {selectedLead && (
        <EditContactDialog
          open={editContactOpen}
          onOpenChange={(open) => {
            setEditContactOpen(open);
            if (!open) {
              setSelectedLead(null);
              fetchDbLeads();
            }
          }}
          lead={selectedLead}
          onUpdated={() => fetchDbLeads()}
        />
      )}

      <AlertDialog open={deleteContactOpen} onOpenChange={setDeleteContactOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover contato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{contactToDelete?.contact_name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContact} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Contacts;