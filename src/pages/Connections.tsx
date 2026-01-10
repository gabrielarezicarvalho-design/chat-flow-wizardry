import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useConnections } from "@/hooks/useConnections";
import { useFlows } from "@/hooks/useFlows";
import { useDepartments } from "@/hooks/useDepartments";
import { useAgents } from "@/hooks/useAgents";
import { useUserRole } from "@/hooks/useUserRole";
import { MessageSquare, Plus, Loader2, Trash2, QrCode, Webhook, Users, Settings, Code, Wifi, WifiOff, Copy, Save, X, Bot, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Connections = () => {
  const { connections, isLoading, createConnection, updateConnection, deleteConnection } = useConnections();
  const { flows } = useFlows();
  const { departments } = useDepartments();
  const { agents } = useAgents();
  const { isAdmin } = useUserRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [pendingConnection, setPendingConnection] = useState<any>(null);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("conexao");
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingMessages, setSavingMessages] = useState(false);
  const [instanceLimit, setInstanceLimit] = useState<number>(2);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    environment: 'PROD'
  });

  // Fetch company max_connections limit
  useEffect(() => {
    const fetchCompanyLimit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('max_connections')
          .eq('id', profile.company_id)
          .maybeSingle();

        if (company?.max_connections) {
          setInstanceLimit(company.max_connections);
        }
      }
    };

    fetchCompanyLimit();
  }, []);

  // Settings state
  const [settings, setSettings] = useState({
    departments: [] as string[],
    attendantsPerAgent: '',
    requireCloseReason: 'nao',
    requireContractNumber: 'nao',
    sendToUra: '',
    sendToAiAgent: '',
    headerSignature: 'nao',
    closeOnInactivity: 'nao',
    multiQueueHistory: 'nao',
    applyTriggersActive: 'nao',
    applyTriggersScheduled: 'nao',
    autoSaveContacts: 'sim',
    allowActiveAttendance: 'sim',
    importHistory: 'nao',
    limitTransfersToQueue: 'nao',
    distributionStrategy: 'round_robin',
    notifyNewAttendance: 'sim',
    externalDeviceMessage: 'ignorar'
  });

  // Message settings state
  const [messageSettings, setMessageSettings] = useState({
    welcomeMessage: '',
    closingMessage: '',
    absenceMessage: '',
    transferMessage: ''
  });

  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  useEffect(() => {
    if (!qrDialogOpen && statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
      setPendingConnection(null);
    }
  }, [qrDialogOpen]);

  useEffect(() => {
    if (connections.length > 0 && !selectedConnection) {
      setSelectedConnection(connections[0]);
    }
  }, [connections]);

  // Sync real connection status from UAZAPI periodically
  useEffect(() => {
    const syncConnectionStatus = async () => {
      for (const connection of connections) {
        // Check all connections that have an instance_id and are not already marked as deleted
        const connAny = connection as any;
        if (connAny.instance_id && connection.status !== 'deleted') {
          try {
            const { data, error } = await supabase.functions.invoke('wa-status-instance', {
              body: { 
                instance_id: connAny.instance_id
              }
            });

            // Parse error body if present (Supabase returns error body as string sometimes)
            let errorData = data;
            if (error?.message) {
              try {
                const parsed = JSON.parse(error.message.replace('Edge function returned 500: Error, ', ''));
                errorData = { ...data, ...parsed };
              } catch {
                // If parsing fails, use original data
              }
            }

            // Handle error responses - instance might have been deleted in UAZAPI
            const instanceDeleted = errorData?.instanceDeleted === true;
            const errorMessage = (errorData?.details?.error || errorData?.error || error?.message || '').toLowerCase();
            const isInstanceGone = instanceDeleted || 
              errorMessage.includes('instance details') || 
              errorMessage.includes('instance not found') ||
              (errorData?.status === 500 && errorMessage.includes('details'));
            
            if (isInstanceGone && connection.status !== 'deleted') {
              console.log(`Connection ${connection.instance_name} instance was deleted in UAZAPI, marking as deleted...`);
              
              // Only update status - don't clear token/instance_id to avoid FK constraint issues
              await updateConnection.mutateAsync({
                id: connection.id,
                updates: { status: 'deleted' }
              });
              toast.error(`🗑️ ${connection.instance_name} foi removida da UAZAPI. Crie uma nova conexão.`);
              continue;
            }

            // If UAZAPI reports disconnected but local status is connected, update the database
            if (data?.success && !data?.connected && connection.status === 'connected') {
              console.log(`Connection ${connection.instance_name} is disconnected in UAZAPI, updating local status...`);
              await updateConnection.mutateAsync({
                id: connection.id,
                updates: { status: 'disconnected' }
              });
              toast.warning(`⚠️ ${connection.instance_name} foi desconectado do WhatsApp`);
            }
            
            // If UAZAPI reports connected but local status is disconnected, update
            if (data?.success && data?.connected && connection.status === 'disconnected') {
              console.log(`Connection ${connection.instance_name} is connected in UAZAPI, updating local status...`);
              await updateConnection.mutateAsync({
                id: connection.id,
                updates: { status: 'connected' }
              });
              toast.success(`✅ ${connection.instance_name} está conectado!`);
            }
          } catch (err: any) {
            // Try to parse error message for instance deletion
            const errMsg = (err?.message || '').toLowerCase();
            if ((errMsg.includes('instancedeleted') || errMsg.includes('instance details')) && connection.status !== 'deleted') {
              console.log(`Connection ${connection.instance_name} instance was deleted (caught error), marking as deleted...`);
              await updateConnection.mutateAsync({
                id: connection.id,
                updates: { status: 'deleted' }
              });
              toast.error(`🗑️ ${connection.instance_name} foi removida da UAZAPI.`);
            } else {
              console.error(`Error checking status for ${connection.instance_name}:`, err);
            }
          }
        }
      }
    };

    // Initial sync after 2 seconds
    const initialTimeout = setTimeout(syncConnectionStatus, 2000);
    
    // Periodic sync every 30 seconds
    const syncInterval = setInterval(syncConnectionStatus, 30000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(syncInterval);
    };
  }, [connections, updateConnection]);

  // Load settings when connection changes
  useEffect(() => {
    const loadSettings = async () => {
      if (selectedConnection?.credentials) {
        const creds = selectedConnection.credentials as any;
        if (creds.settings) {
          setSettings(prev => ({ ...prev, ...creds.settings }));
        }
        if (creds.messages) {
          setMessageSettings(prev => ({ ...prev, ...creds.messages }));
        }
      } else {
        // Reset to defaults when no credentials
        setSettings({
          departments: [],
          attendantsPerAgent: '',
          requireCloseReason: 'nao',
          requireContractNumber: 'nao',
          sendToUra: '',
          sendToAiAgent: '',
          headerSignature: 'nao',
          closeOnInactivity: 'nao',
          multiQueueHistory: 'nao',
          applyTriggersActive: 'nao',
          applyTriggersScheduled: 'nao',
          autoSaveContacts: 'sim',
          allowActiveAttendance: 'sim',
          importHistory: 'nao',
          limitTransfersToQueue: 'nao',
          distributionStrategy: 'round_robin',
          notifyNewAttendance: 'sim',
          externalDeviceMessage: 'ignorar'
        });
        setMessageSettings({
          welcomeMessage: '',
          closingMessage: '',
          absenceMessage: '',
          transferMessage: ''
        });
      }

      // Load linked flow - simplified without connection_id
      // Connection-flow linking is stored in flow settings instead
    };

    loadSettings();
  }, [selectedConnection]);

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      environment: 'PROD'
    });
  };

  const handleCreateAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Digite um nome para a conexão");
      return;
    }

    setLoadingQr(true);
    setDialogOpen(false);
    setQrDialogOpen(true);
    setQrCodeData(null);

    try {
      const { data, error } = await supabase.functions.invoke('wa-create-instance', {
        body: {
          name: formData.name,
          phone: formData.phone,
          environment: formData.environment
        }
      });

      // Check for edge function error (includes 429)
      if (error) {
        // Try to parse error body for instance limit details
        const errorBody = error.context?.body || error.message || '';
        let parsedError: any = {};
        
        try {
          if (typeof errorBody === 'string' && errorBody.includes('{')) {
            const jsonMatch = errorBody.match(/\{.*\}/s);
            if (jsonMatch) {
              parsedError = JSON.parse(jsonMatch[0]);
            }
          }
        } catch (e) {
          // Ignore parse errors
        }

        // Check if it's a 429 instance limit error
        if (parsedError?.details?.error === "Maximum number of instances reached" || 
            parsedError?.status === 429 ||
            errorBody.includes("Maximum number of instances")) {
          const details = parsedError.details || {};
          const currentInstances = details.current_instances || 2;
          const maxInstances = details.max_instances || 1;
          
          toast.error(
            `⚠️ Limite de instâncias UAZAPI atingido!\n\nVocê possui ${currentInstances} instância(s) ativa(s) e o limite do seu plano é ${maxInstances}.\n\nPara criar uma nova conexão, acesse o painel UAZAPI e exclua instâncias não utilizadas, ou faça upgrade do seu plano.`,
            { duration: 10000 }
          );
          setQrDialogOpen(false);
          setLoadingQr(false);
          return;
        }
        
        throw error;
      }

      // Check for error in response data (non-throwing errors)
      if (data?.error && (data?.status === 429 || data?.details?.error === "Maximum number of instances reached")) {
        const details = data.details || {};
        const currentInstances = details.current_instances || 2;
        const maxInstances = details.max_instances || 1;
        
        toast.error(
          `⚠️ Limite de instâncias UAZAPI atingido!\n\nVocê possui ${currentInstances} instância(s) ativa(s) e o limite do seu plano é ${maxInstances}.\n\nPara criar uma nova conexão, acesse o painel UAZAPI e exclua instâncias não utilizadas, ou faça upgrade do seu plano.`,
          { duration: 10000 }
        );
        setQrDialogOpen(false);
        setLoadingQr(false);
        return;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao criar instância');
      }

      const tempConnection = await createConnection.mutateAsync({
        name: formData.name,
        platform: 'whatsapp',
        environment: formData.environment,
        status: 'connecting',
        instance_id: data.instance_id,
        token: data.token,
        base_url: data.base_url
      });

      setPendingConnection(tempConnection);

      if (data.qrcode) {
        setQrCodeData(data.qrcode);
        toast.success("QR Code gerado! Escaneie para conectar.");
      } else {
        throw new Error('QR code não retornado');
      }

      if (tempConnection && data.token) {
        const startTime = Date.now();
        const maxDuration = 60000;

        const interval = setInterval(async () => {
          const elapsed = Date.now() - startTime;

          if (elapsed > maxDuration) {
            clearInterval(interval);
            setStatusCheckInterval(null);
            toast.warning("⚠️ Tempo limite atingido. Tente gerar um novo QR Code.");
            return;
          }

          const connected = await checkInstanceStatus(tempConnection.id, data.token, formData.environment, data.base_url);
          if (connected) {
            clearInterval(interval);
            setStatusCheckInterval(null);
          }
        }, 4000);

        setStatusCheckInterval(interval);
      }
    } catch (error: any) {
      console.error("Erro ao criar conexão:", error);
      toast.error(error.message || "Erro ao criar conexão");
      setQrDialogOpen(false);
      
      if (pendingConnection) {
        await deleteConnection.mutateAsync(pendingConnection.id);
      }
    } finally {
      setLoadingQr(false);
      resetForm();
    }
  };

  const syncContactsAfterConnect = async (connectionId: string) => {
    try {
      toast.info("📱 Sincronizando contatos...");
      const { data, error } = await supabase.functions.invoke('wa-contacts', {
        body: { action: "list", connectionId }
      });
      
      if (error) throw error;
      
      const contactList = Array.isArray(data?.data) ? data.data : 
                         Array.isArray(data) ? data : [];
      
      if (contactList.length > 0) {
        toast.success(`✅ ${contactList.length} contatos sincronizados!`);
      }
    } catch (err) {
      console.error("Erro ao sincronizar contatos:", err);
    }
  };

  const checkInstanceStatus = async (connectionId: string, token: string, environment: string, baseUrl?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('wa-status-instance', {
        body: { token, environment, base_url: baseUrl }
      });

      if (error) throw error;

      if (data?.success && data?.connected) {
        await updateConnection.mutateAsync({
          id: connectionId,
          updates: { status: 'connected', last_test: new Date().toISOString() }
        });

        const connection = connections.find(c => c.id === connectionId);
        if (connection) {
          await handleConfigureWebhook(connection);
        }

        await syncContactsAfterConnect(connectionId);

        toast.success("✅ WhatsApp conectado com sucesso!");

        if (statusCheckInterval) {
          clearInterval(statusCheckInterval);
          setStatusCheckInterval(null);
        }
        setQrDialogOpen(false);
        setQrCodeData(null);
        setPendingConnection(null);

        return true;
      }
      return false;
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      return false;
    }
  };

  const handleConfigureWebhook = async (connection: any, showToast = false) => {
    if (!connection.instance_id || !connection.base_url || !connection.token) {
      if (showToast) toast.error("Dados da conexão incompletos");
      return false;
    }

    try {
      if (showToast) toast.info("Configurando webhook...");
      
      const { data, error } = await supabase.functions.invoke('wa-set-webhook', {
        body: {
          instance_id: connection.instance_id,
          base_url: connection.base_url,
          token: connection.token
        }
      });

      if (error) throw error;

      if (data?.success) {
        if (showToast) {
          toast.success(`Webhook configurado! URL: ${data.webhookUrl}`);
        }
        return true;
      }
      if (showToast) toast.error(data?.error || "Erro ao configurar webhook");
      return false;
    } catch (error: any) {
      console.error("Erro ao configurar webhook:", error);
      if (showToast) toast.error(error.message || "Erro ao configurar webhook");
      return false;
    }
  };

  const handleDisconnect = async (connection: any) => {
    if (!connection.token) {
      toast.error("Token não encontrado");
      return;
    }

    if (!confirm('Deseja realmente desconectar esta instância?')) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('wa-disconnect-instance', {
        body: {
          token: connection.token,
          environment: connection.environment || 'TESTE',
          base_url: connection.base_url
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("✅ Instância desconectada!");
        await updateConnection.mutateAsync({
          id: connection.id,
          updates: { status: 'disconnected' }
        });
      }
    } catch (error: any) {
      console.error("Erro ao desconectar:", error);
      toast.error("Erro ao desconectar!");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta conexão?')) {
      return;
    }
    await deleteConnection.mutateAsync(id);
    if (selectedConnection?.id === id) {
      setSelectedConnection(connections.find(c => c.id !== id) || null);
    }
  };

  const handleReconnect = async (connection: any) => {
    if (!connection.token) {
      toast.error("Token não encontrado");
      return;
    }

    setLoadingQr(true);
    setQrDialogOpen(true);
    setQrCodeData(null);
    setPendingConnection(connection);

    try {
      const { data, error } = await supabase.functions.invoke('wa-qrcode', {
        body: {
          token: connection.token,
          environment: connection.environment || 'TESTE',
          base_url: connection.base_url
        }
      });

      if (error) throw error;

      if (data?.success && data?.qrcode) {
        setQrCodeData(data.qrcode);
        toast.success("QR Code gerado! Escaneie para reconectar.");

        const startTime = Date.now();
        const maxDuration = 60000;

        const interval = setInterval(async () => {
          const elapsed = Date.now() - startTime;

          if (elapsed > maxDuration) {
            clearInterval(interval);
            setStatusCheckInterval(null);
            toast.warning("⚠️ Tempo limite atingido.");
            return;
          }

          const connected = await checkInstanceStatus(connection.id, connection.token, connection.environment, connection.base_url);
          if (connected) {
            clearInterval(interval);
            setStatusCheckInterval(null);
          }
        }, 4000);

        setStatusCheckInterval(interval);
      }
    } catch (error: any) {
      console.error("Erro ao gerar QR:", error);
      toast.error("Erro ao gerar QR Code!");
      setQrDialogOpen(false);
    } finally {
      setLoadingQr(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedConnection) {
      toast.error("Selecione uma conexão");
      return;
    }
    
    setSavingSettings(true);
    try {
      const currentCreds = (selectedConnection.credentials as any) || {};
      
      // Save settings to connection (including auto_save_contacts column)
      await updateConnection.mutateAsync({
        id: selectedConnection.id,
        updates: {
          credentials: {
            ...currentCreds,
            settings
          },
          auto_save_contacts: settings.autoSaveContacts === 'sim'
        }
      });

      // If a flow is selected, update the flow's is_active to link it
      if (settings.sendToUra && settings.sendToUra !== "none") {
        // First, deactivate any previously linked flows from this connection
        const { data: previousFlows } = await supabase
          .from("flows")
          .select("id")
          .eq("is_active", true);

        if (previousFlows && previousFlows.length > 0) {
          for (const prevFlow of previousFlows) {
            if (prevFlow.id !== settings.sendToUra) {
              await supabase
                .from("flows")
                .update({ is_active: false })
                .eq("id", prevFlow.id);
            }
          }
        }

        // Link the selected flow to this connection and activate it
        const { error: flowError } = await supabase
          .from("flows")
          .update({ 
            is_active: true 
          })
          .eq("id", settings.sendToUra);

        if (flowError) {
          console.error("Erro ao vincular fluxo:", flowError);
          toast.warning("Configurações salvas, mas houve erro ao vincular fluxo");
        } else {
          toast.success("Configurações e fluxo salvos com sucesso!");
        }
      } else {
        // Deactivate all flows if "none" is selected
        await supabase
          .from("flows")
          .update({ is_active: false });
          
        toast.success("Configurações salvas com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveMessages = async () => {
    if (!selectedConnection) {
      toast.error("Selecione uma conexão");
      return;
    }
    
    setSavingMessages(true);
    try {
      const currentCreds = (selectedConnection.credentials as any) || {};
      await updateConnection.mutateAsync({
        id: selectedConnection.id,
        updates: {
          credentials: {
            ...currentCreds,
            messages: messageSettings
          }
        }
      });
      toast.success("Mensagens salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar mensagens");
    } finally {
      setSavingMessages(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };


  const renderConnectionTab = () => {
    // Calculate active instances
    const activeConnections = connections.filter(c => c.status === 'connected' || c.status === 'connecting').length;
    const totalConnections = connections.length;
    const usagePercentage = instanceLimit > 0 ? (activeConnections / instanceLimit) * 100 : 0;
    const isAtLimit = activeConnections >= instanceLimit;

    return (
      <div className="space-y-6">
        {/* Instance Usage Indicator */}
        <Card className={`border-border ${isAtLimit ? 'border-orange-500/50 bg-orange-500/5' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Uso de Instâncias UAZAPI</span>
              </div>
              <div className="flex items-center gap-2">
                {isAtLimit && (
                  <Badge variant="outline" className="text-orange-600 border-orange-500 bg-orange-500/10">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Limite atingido
                  </Badge>
                )}
                <Badge variant="secondary">
                  {activeConnections} / {instanceLimit} ativas
                </Badge>
              </div>
            </div>
            <Progress 
              value={usagePercentage} 
              className={`h-2 ${isAtLimit ? '[&>div]:bg-orange-500' : '[&>div]:bg-green-500'}`}
            />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{totalConnections} conexão(ões) cadastrada(s)</span>
              <span>{instanceLimit - activeConnections} instância(s) disponível(is)</span>
            </div>
            {isAtLimit && (
              <p className="text-xs text-orange-600 mt-2">
                Para criar novas conexões, desconecte uma existente ou faça upgrade do seu plano UAZAPI.
              </p>
            )}
          </CardContent>
        </Card>
        {/* Connection Status Header */}
        {selectedConnection && (
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${
                    selectedConnection.status === 'connected' 
                      ? 'bg-green-500/10' 
                      : selectedConnection.status === 'disconnected'
                        ? 'bg-red-500/10'
                        : 'bg-muted'
                  }`}>
                    {selectedConnection.status === 'connected' ? (
                      <Wifi className="w-6 h-6 text-green-500" />
                    ) : (
                      <WifiOff className={`w-6 h-6 ${selectedConnection.status === 'disconnected' ? 'text-red-500' : 'text-muted-foreground'}`} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{selectedConnection.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedConnection.status === 'connected' 
                        ? 'Conectado' 
                        : selectedConnection.status === 'disconnected' 
                          ? 'Desconectado' 
                          : selectedConnection.status === 'connecting'
                            ? 'Conectando...'
                            : 'Offline'} • {selectedConnection.environment}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedConnection.status !== 'connected' ? (
                    <Button onClick={() => handleReconnect(selectedConnection)}>
                      <QrCode className="w-4 h-4 mr-2" />
                      Conectar
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => handleDisconnect(selectedConnection)}>
                      Desconectar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connection List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connections.map((connection) => (
            <Card 
              key={connection.id} 
              className={`cursor-pointer transition-all hover:border-primary/50 ${selectedConnection?.id === connection.id ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}
              onClick={() => setSelectedConnection(connection)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      connection.status === 'connected' 
                        ? 'bg-green-500/10' 
                        : connection.status === 'disconnected'
                          ? 'bg-red-500/10'
                          : 'bg-muted'
                    }`}>
                      <MessageSquare className={`w-4 h-4 ${
                        connection.status === 'connected' 
                          ? 'text-green-500' 
                          : connection.status === 'disconnected'
                            ? 'text-red-500'
                            : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground text-sm">{connection.instance_name}</h4>
                      <p className="text-xs text-muted-foreground">{connection.status}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={connection.status === 'connected' ? 'default' : 'destructive'} 
                    className={`text-xs ${
                      connection.status === 'connected' 
                        ? '' 
                        : connection.status === 'disconnected'
                          ? 'bg-red-500'
                          : ''
                    }`}
                  >
                    {connection.status === 'connected' 
                      ? 'Conectado' 
                      : connection.status === 'disconnected' 
                        ? 'Desconectado' 
                        : connection.status === 'connecting'
                          ? 'Conectando...'
                          : 'Offline'}
                  </Badge>
                </div>

                <div className="flex gap-2 mt-3">
                  {connection.status === 'connected' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleDisconnect(connection); }}
                      className="flex-1 h-8 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                    >
                      <WifiOff className="w-3 h-3 mr-1" />
                      Desconectar
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleReconnect(connection); }}
                      className="flex-1 h-8 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                    >
                      <QrCode className="w-3 h-3 mr-1" />
                      Reconectar
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleDelete(connection.id); }}
                    className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add New Connection Card */}
          <Card 
            className="cursor-pointer border-dashed border-2 border-muted-foreground/25 hover:border-primary/50 transition-all"
            onClick={() => setDialogOpen(true)}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[120px]">
              <Plus className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nova Conexão</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderSettingsTab = () => {
    const aiAgents = agents.filter((a: any) => a.status === 'active');
    
    const handleDepartmentToggle = (deptId: string) => {
      const current = settings.departments || [];
      if (current.includes(deptId)) {
        setSettings({ ...settings, departments: current.filter((id: string) => id !== deptId) });
      } else {
        setSettings({ ...settings, departments: [...current, deptId] });
      }
    };

    return (
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Configurações da Fila</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="space-y-2 xl:col-span-2">
              <Label className="text-sm text-muted-foreground">Departamentos (Filas)</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[40px] bg-background">
                {(settings.departments || []).length === 0 && (
                  <span className="text-sm text-muted-foreground">Clique para adicionar...</span>
                )}
                {(settings.departments || []).map((deptId: string) => {
                  const dept = departments.find((d: any) => d.id === deptId);
                  return dept ? (
                    <Badge key={deptId} variant="secondary" className="flex items-center gap-1">
                      {dept.name}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => handleDepartmentToggle(deptId)} 
                      />
                    </Badge>
                  ) : null;
                })}
              </div>
              <Select onValueChange={(v) => handleDepartmentToggle(v)}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="+ Adicionar departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departments.filter((d: any) => !(settings.departments || []).includes(d.id)).map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Atendimentos / agente</Label>
              <Input 
                type="number" 
                value={settings.attendantsPerAgent} 
                onChange={(e) => setSettings({...settings, attendantsPerAgent: e.target.value})}
                placeholder="0 = ilimitado"
              />
              <p className="text-xs text-muted-foreground">0 ou vazio = ilimitado</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Exigir motivo de encerramento</Label>
              <Select value={settings.requireCloseReason} onValueChange={(v) => setSettings({...settings, requireCloseReason: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Contrato obrigatório ao encerrar</Label>
              <Select value={settings.requireContractNumber} onValueChange={(v) => setSettings({...settings, requireContractNumber: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Enviar para URA (Fluxo)</Label>
              <Select value={settings.sendToUra || "none"} onValueChange={(v) => setSettings({...settings, sendToUra: v === "none" ? "" : v})}>
                <SelectTrigger><SelectValue placeholder="Selecione um fluxo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {flows.map((flow: any) => (
                    <SelectItem key={flow.id} value={flow.id}>
                      {flow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Assinatura no cabeçalho</Label>
              <Select value={settings.headerSignature} onValueChange={(v) => setSettings({...settings, headerSignature: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim (Obrigatório)</SelectItem>
                  <SelectItem value="nao">Não (Opcional)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {settings.headerSignature === 'sim' ? 'Agente não pode desativar' : 'Agente pode desativar'}
              </p>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Fechar por inatividade</Label>
              <Select value={settings.closeOnInactivity} onValueChange={(v) => setSettings({...settings, closeOnInactivity: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="30min">30 minutos</SelectItem>
                  <SelectItem value="1h">1 hora</SelectItem>
                  <SelectItem value="2h">2 horas</SelectItem>
                  <SelectItem value="4h">4 horas</SelectItem>
                  <SelectItem value="8h">8 horas</SelectItem>
                  <SelectItem value="24h">24 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Histórico multifila</Label>
              <Select value={settings.multiQueueHistory} onValueChange={(v) => setSettings({...settings, multiQueueHistory: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Aplicar gatilhos aos ativos</Label>
              <Select value={settings.applyTriggersActive} onValueChange={(v) => setSettings({...settings, applyTriggersActive: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Aplicar gatilhos aos agendados</Label>
              <Select value={settings.applyTriggersScheduled} onValueChange={(v) => setSettings({...settings, applyTriggersScheduled: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Salvar contatos automaticamente</Label>
              <Select value={settings.autoSaveContacts} onValueChange={(v) => setSettings({...settings, autoSaveContacts: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Permitir atendimento ativo</Label>
              <Select value={settings.allowActiveAttendance} onValueChange={(v) => setSettings({...settings, allowActiveAttendance: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Importar histórico</Label>
              <Select value={settings.importHistory} onValueChange={(v) => setSettings({...settings, importHistory: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Limitar transferências a agentes da fila</Label>
              <Select value={settings.limitTransfersToQueue} onValueChange={(v) => setSettings({...settings, limitTransfersToQueue: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Estratégia de distribuição</Label>
              <Select value={settings.distributionStrategy} onValueChange={(v) => setSettings({...settings, distributionStrategy: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="round_robin">Round Robin</SelectItem>
                  <SelectItem value="menos_ocupado">Menos Ocupado</SelectItem>
                  <SelectItem value="aleatorio">Aleatório</SelectItem>
                  <SelectItem value="por_prioridade">Por Prioridade</SelectItem>
                  <SelectItem value="primeiro_disponivel">Primeiro Disponível</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Notificar novos atendimentos</Label>
              <Select value={settings.notifyNewAttendance} onValueChange={(v) => setSettings({...settings, notifyNewAttendance: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Mensagem enviada por outro dispositivo</Label>
              <Select value={settings.externalDeviceMessage} onValueChange={(v) => setSettings({...settings, externalDeviceMessage: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ignorar">Ignorar</SelectItem>
                  <SelectItem value="processar">Processar</SelectItem>
                  <SelectItem value="notificar">Notificar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Enviar para Assistente IA</Label>
              <Select value={settings.sendToAiAgent || "none"} onValueChange={(v) => setSettings({...settings, sendToAiAgent: v === "none" ? "" : v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um assistente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {aiAgents.map((agent: any) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <Bot className="w-3 h-3" />
                        {agent.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filter Groups Toggle */}
          {selectedConnection && (
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Ignorar mensagens de grupos</p>
                    <p className="text-xs text-muted-foreground">Mensagens de grupos não serão processadas</p>
                  </div>
                </div>
                <Switch 
                  checked={(selectedConnection as any).filter_groups !== false}
                  onCheckedChange={async (checked) => {
                    try {
                      await updateConnection.mutateAsync({
                        id: selectedConnection.id,
                        updates: { filter_groups: checked }
                      });
                      toast.success(checked ? 'Grupos serão ignorados' : 'Grupos serão recebidos');
                    } catch (error) {
                      toast.error('Erro ao atualizar configuração');
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {savingSettings ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMessagesTab = () => (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Mensagens Automáticas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Mensagem de boas-vindas</Label>
            <Textarea 
              value={messageSettings.welcomeMessage}
              onChange={(e) => setMessageSettings({...messageSettings, welcomeMessage: e.target.value})}
              placeholder="Ex: Olá! Seja bem-vindo ao nosso atendimento."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Mensagem de encerramento</Label>
            <Textarea 
              value={messageSettings.closingMessage}
              onChange={(e) => setMessageSettings({...messageSettings, closingMessage: e.target.value})}
              placeholder="Ex: Obrigado pelo contato!"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Mensagem de ausência</Label>
            <Textarea 
              value={messageSettings.absenceMessage}
              onChange={(e) => setMessageSettings({...messageSettings, absenceMessage: e.target.value})}
              placeholder="Ex: No momento não há atendentes disponíveis."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Mensagem de transferência</Label>
            <Textarea 
              value={messageSettings.transferMessage}
              onChange={(e) => setMessageSettings({...messageSettings, transferMessage: e.target.value})}
              placeholder="Ex: Você será transferido para outro atendente."
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <Button onClick={handleSaveMessages} disabled={savingMessages}>
            {savingMessages ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {savingMessages ? 'Salvando...' : 'Salvar Mensagens'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderApiTab = () => (
    <div className="space-y-6">
      {selectedConnection && (
        <>
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Credenciais da API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Instance ID</Label>
                  <div className="flex gap-2">
                    <Input value={selectedConnection.instance_id || ''} readOnly className="font-mono text-sm" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(selectedConnection.instance_id || '')}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Token</Label>
                  <div className="flex gap-2">
                    <Input value={selectedConnection.token || ''} readOnly type="password" className="font-mono text-sm" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(selectedConnection.token || '')}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Base URL</Label>
                  <div className="flex gap-2">
                    <Input value={selectedConnection.base_url || ''} readOnly className="font-mono text-sm" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(selectedConnection.base_url || '')}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Ambiente</Label>
                  <Input value={selectedConnection.environment || ''} readOnly className="font-mono text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Webhook</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Webhook URL</Label>
                <div className="flex gap-2">
                  <Input 
                    value={`${window.location.origin}/api/webhook/${selectedConnection.instance_id}`} 
                    readOnly 
                    className="font-mono text-sm" 
                  />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(`${window.location.origin}/api/webhook/${selectedConnection.instance_id}`)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleConfigureWebhook(selectedConnection, true)}>
                  <Webhook className="w-4 h-4 mr-2" />
                  Configurar Webhook
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Conexões</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas conexões WhatsApp</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conexão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Conectar WhatsApp</DialogTitle>
              <DialogDescription>
                Preencha os dados para gerar o QR Code
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAndConnect} className="space-y-4">

              <div>
                <Label htmlFor="name">Nome da Conexão</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: WhatsApp Principal"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefone (Opcional)</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ex: 5511999999999"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Deixe em branco se não quiser vincular a um número específico
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  Gerar QR Code
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b border-border bg-transparent p-0 h-auto">
          <TabsTrigger 
            value="conexao" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3"
          >
            <Wifi className="w-4 h-4 mr-2" />
            Conexão
          </TabsTrigger>
          <TabsTrigger 
            value="configuracoes"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </TabsTrigger>
          <TabsTrigger 
            value="mensagens"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger 
            value="api"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3"
          >
            <Code className="w-4 h-4 mr-2" />
            API e Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conexao" className="mt-6">
          {renderConnectionTab()}
        </TabsContent>

        <TabsContent value="configuracoes" className="mt-6">
          {renderSettingsTab()}
        </TabsContent>

        <TabsContent value="mensagens" className="mt-6">
          {renderMessagesTab()}
        </TabsContent>

        <TabsContent value="api" className="mt-6">
          {renderApiTab()}
        </TabsContent>

      </Tabs>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code WhatsApp</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code com seu WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            {loadingQr ? (
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            ) : qrCodeData ? (
              <>
                <img src={qrCodeData} alt="QR Code WhatsApp" className="max-w-full rounded-lg border" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Aguardando conexão...</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Gerando QR Code...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Connections;
