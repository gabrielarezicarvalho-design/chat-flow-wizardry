import React, { useState, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
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
import { MessageSquare, Plus, Loader2, Trash2, QrCode, Webhook, Users, Settings, Code, Wifi, WifiOff, Copy, Save, X, Bot, AlertTriangle, RefreshCw, Tag, Download, Smartphone, Link2, Bell, Globe, ArrowLeft, Send, Search, MoreHorizontal, Eye, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { TelegramNotifications } from "@/components/mass-sending/TelegramNotifications";
import { OrphanedInstancesAlert } from "@/components/connections/OrphanedInstancesAlert";
import { DeleteConnectionDialog } from "@/components/connections/DeleteConnectionDialog";
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
  const [metaConnections, setMetaConnections] = useState<any[]>([]);
  const [metaTestDialogOpen, setMetaTestDialogOpen] = useState(false);
  const [metaTestConnection, setMetaTestConnection] = useState<any>(null);
  const [metaDetailsDialogOpen, setMetaDetailsDialogOpen] = useState(false);
  const [metaDetailsConnection, setMetaDetailsConnection] = useState<any>(null);
  const [metaDisconnecting, setMetaDisconnecting] = useState<string | null>(null);
  const [metaTestPhone, setMetaTestPhone] = useState('');
  const [metaTestType, setMetaTestType] = useState<'text' | 'template'>('text');
  const [metaTestMessage, setMetaTestMessage] = useState('');
  const [metaTestTemplateName, setMetaTestTemplateName] = useState('');
  const [metaTestTemplateLang, setMetaTestTemplateLang] = useState('pt_BR');
  const [metaTestSending, setMetaTestSending] = useState(false);
  const [metaTemplates, setMetaTemplates] = useState<any[]>([]);
  const [metaTemplatesLoading, setMetaTemplatesLoading] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [connectMethod, setConnectMethod] = useState<'qrcode' | 'paircode'>('qrcode');
  const [selectedProvider, setSelectedProvider] = useState<'uazapi' | 'meta' | 'instagram' | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [pendingConnection, setPendingConnection] = useState<any>(null);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [_activeTab, _setActiveTab] = useState("conexao"); // kept for compatibility
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingMessages, setSavingMessages] = useState(false);
  const [syncingContacts, setSyncingContacts] = useState(false);
  const [syncingLabels, setSyncingLabels] = useState(false);
  const [contactsStats, setContactsStats] = useState({ synced: 0, lastSync: '' });
  const [labelsStats, setLabelsStats] = useState({ synced: 0, lastSync: '' });
  const [instanceLimit, setInstanceLimit] = useState<number>(2);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedConnectionId, setExpandedConnectionId] = useState<string | null>(null);
  const [connectionToDelete, setConnectionToDelete] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    environment: 'PROD'
  });

  // Fetch Meta connections from whatsapp_connections table
  useEffect(() => {
    const fetchMetaConnections = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.company_id) return;

      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('provider', 'meta')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMetaConnections(data);
      }
    };

    fetchMetaConnections();
  }, [connections]); // Refresh when connections change

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
    transferMessage: '',
    autoReplyEnabled: false,
    autoReplyMessage: '',
    autoReplyButtonText: '',
    autoReplyButtonUrl: ''
  });

  // Listen for Instagram/Meta connect postMessage callbacks
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'instagram-connect-success') {
        toast.success("📸 " + (event.data.message || "Instagram conectado com sucesso!"));
        // Refresh connections
        window.location.reload();
      } else if (event.data?.type === 'instagram-connect-error') {
        toast.error("❌ " + (event.data.message || "Erro ao conectar Instagram"));
      } else if (event.data?.type === 'meta-connect-success') {
        toast.success("✅ " + (event.data.message || "WhatsApp Meta conectado!"));
        window.location.reload();
      } else if (event.data?.type === 'meta-connect-error') {
        toast.error("❌ " + (event.data.message || "Erro ao conectar Meta"));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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
        // Check all connections that have a token and are not already marked as deleted
        const connAny = connection as any;
        if (connAny.token && connection.status !== 'deleted') {
          try {
            const { data, error } = await supabase.functions.invoke('wa-status-instance', {
              body: { 
                token: connAny.token,
                environment: connAny.environment || 'PROD',
                base_url: connAny.base_url
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
            
            // If UAZAPI reports connected but local status is not connected, update
            if (data?.success && data?.connected && (connection.status === 'disconnected' || connection.status === 'connecting')) {
              console.log(`Connection ${connection.instance_name} is connected in UAZAPI, updating local status...`);
              await updateConnection.mutateAsync({
                id: connection.id,
                updates: { status: 'connected' }
              });
              
              // 🎆 Fireworks!
              const end = Date.now() + 3000;
              const colors = ['#22c55e', '#3b82f6', '#a855f7', '#eab308', '#ef4444'];
              const frame = () => {
                confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors });
                confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors });
                if (Date.now() < end) requestAnimationFrame(frame);
              };
              frame();
              
              toast.success(`🎉 ${connection.instance_name} conectado com sucesso!`, { duration: 5000 });
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

  // Track which connections have been auto-synced to avoid repeated syncs
  const [autoSyncedConnections, setAutoSyncedConnections] = useState<Set<string>>(new Set());

  // Auto-sync contacts and labels when connection is selected and connected
  useEffect(() => {
    const autoSync = async () => {
      if (!selectedConnection) return;
      
      const connAny = selectedConnection as any;
      
      // Only auto-sync if:
      // 1. Connection is connected
      // 2. Connection has a token
      // 3. Haven't already synced this connection in this session
      if (
        selectedConnection.status === 'connected' && 
        connAny.token && 
        !autoSyncedConnections.has(selectedConnection.id)
      ) {
        // Mark as synced to prevent repeated syncs
        setAutoSyncedConnections(prev => new Set(prev).add(selectedConnection.id));
        
        // Auto-sync contacts
        try {
          setSyncingContacts(true);
          const { data: { user } } = await supabase.auth.getUser();
          
          const { data: contactsData } = await supabase.functions.invoke('wa-contacts', {
            body: {
              action: 'sync',
              connectionId: selectedConnection.id,
              userId: user?.id
            }
          });

          if (contactsData?.success) {
            setContactsStats({
              synced: contactsData.added || 0,
              lastSync: new Date().toLocaleTimeString('pt-BR')
            });
            if (contactsData.added > 0) {
              toast.success(`📱 ${contactsData.added} contatos sincronizados automaticamente!`);
            }
          }
        } catch (err) {
          console.error("Auto-sync contacts error:", err);
        } finally {
          setSyncingContacts(false);
        }

        // Auto-sync labels
        try {
          setSyncingLabels(true);
          const baseUrl = connAny.base_url || "https://marketflowchat.uazapi.com";
          
          const response = await fetch(`${baseUrl}/chat/labels`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'token': connAny.token
            }
          });

          if (response.ok) {
            const result = await response.json();
            let labels: any[] = [];
            
            if (Array.isArray(result)) {
              labels = result;
            } else if (result?.labels || result?.data) {
              labels = result.labels || result.data;
            }

            const { data: { user } } = await supabase.auth.getUser();
            let addedTagsCount = 0;

            for (const label of labels) {
              const labelName = label.name || label.displayName || label.title;
              const labelColor = label.color || label.hexColor || '#3b82f6';
              
              if (!labelName) continue;

              const { data: existing } = await supabase
                .from('tags')
                .select('id')
                .eq('user_id', user?.id)
                .eq('name', labelName)
                .maybeSingle();

              if (!existing) {
                const { error: insertError } = await supabase
                  .from('tags')
                  .insert({
                    user_id: user?.id,
                    name: labelName,
                    color: labelColor
                  });

                if (!insertError) {
                  addedTagsCount++;
                }
              }
            }

            setLabelsStats({
              synced: addedTagsCount,
              lastSync: new Date().toLocaleTimeString('pt-BR')
            });

            if (addedTagsCount > 0) {
              toast.success(`🏷️ ${addedTagsCount} etiquetas sincronizadas automaticamente!`);
            }
          }
        } catch (err) {
          console.error("Auto-sync labels error:", err);
        } finally {
          setSyncingLabels(false);
        }
      }
    };

    autoSync();
  }, [selectedConnection, autoSyncedConnections]);

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
          transferMessage: '',
          autoReplyEnabled: false,
          autoReplyMessage: '',
          autoReplyButtonText: '',
          autoReplyButtonUrl: ''
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
    setSelectedProvider(null);
  };

  const handleCreateAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Digite um nome para a conexão");
      return;
    }

    // Phone is required for pairing code method
    if (connectMethod === 'paircode' && !formData.phone) {
      toast.error("Digite o número de telefone para usar o código de pareamento");
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
        status: data.qrcode ? 'connecting' : 'disconnected',
        instance_id: data.instance_id,
        token: data.token,
        base_url: data.base_url
      });

      setPendingConnection(tempConnection);

      if (data.qrcode) {
        setQrCodeData(data.qrcode);
        setPairCode(data.paircode || null);
        toast.success("QR Code gerado! Escaneie ou use o código para conectar.");
      } else {
        // Instance created but QR failed (e.g. max connections reached)
        toast.warning(
          data.connect_error || "Instância criada, mas não foi possível gerar o QR Code. Use o botão de reconectar.",
          { duration: 8000 }
        );
        setQrDialogOpen(false);
        setLoadingQr(false);
        resetForm();
        return;
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

      // If token is invalid (401), try to find the instance by ID in the UAZAPI list
      if (!data?.success && data?.originalStatus === 401) {
        console.log("Token invalid, trying to find instance via list...");
        const conn = connections.find(c => c.id === connectionId);
        const connAny = conn as any;
        if (connAny?.instance_id) {
          const { data: listData } = await supabase.functions.invoke('wa-list-instances', {
            body: { environment, base_url: baseUrl }
          });
          
          if (listData?.uazapi_instances) {
            const match = listData.uazapi_instances.find((inst: any) => inst.id === connAny.instance_id);
            if (match && match.connected) {
              // Update token in DB and mark as connected
              await updateConnection.mutateAsync({
                id: connectionId,
                updates: { 
                  status: 'connected', 
                  token: match.token,
                  last_test: new Date().toISOString() 
                }
              });

              if (conn) {
                await handleConfigureWebhook({ ...conn, token: match.token });
              }
              await syncContactsAfterConnect(connectionId);

              // 🎆 Fireworks celebration!
              const duration = 3000;
              const end = Date.now() + duration;
              const colors = ['#22c55e', '#3b82f6', '#a855f7', '#eab308', '#ef4444'];
              const frame = () => {
                confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors });
                confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors });
                if (Date.now() < end) requestAnimationFrame(frame);
              };
              frame();

              toast.success("🎉 WhatsApp conectado com sucesso!", { duration: 5000 });
              setQrDialogOpen(false);
              setQrCodeData(null);
              setPendingConnection(null);
              return true;
            }
          }
        }
        return false;
      }

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

        // 🎆 Fireworks celebration!
        const duration = 3000;
        const end = Date.now() + duration;
        const colors = ['#22c55e', '#3b82f6', '#a855f7', '#eab308', '#ef4444'];

        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();

        toast.success("🎉 WhatsApp conectado com sucesso!", { duration: 5000 });

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

  const handleDownloadQR = async (connection: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      toast.info("Gerando QR Code...");
      const { data, error } = await supabase.functions.invoke('wa-public-qrcode', {
        body: { connection_id: connection.id, action: 'refresh' }
      });
      if (error) throw error;
      if (data?.connected) {
        toast.success("Esta conexão já está conectada!");
        return;
      }
      if (!data?.qrcode) {
        toast.error("Não foi possível gerar o QR Code. Tente reconectar a instância.");
        return;
      }
      const qrSrc = data.qrcode.startsWith("data:") ? data.qrcode : `data:image/png;base64,${data.qrcode}`;
      const link = document.createElement("a");
      link.href = qrSrc;
      link.download = `qrcode-${connection.name || connection.instance_name || "conexao"}.png`;
      link.click();
      toast.success("QR Code baixado com sucesso!");
    } catch (err: any) {
      console.error("Erro ao baixar QR:", err);
      toast.error("Erro ao gerar QR Code para download.");
    }
  };

  const handleCopyLink = (connection: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const url = `${window.location.origin}/connect/${connection.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado! Envie para o cliente conectar o WhatsApp.");
  };

  const handleDeleteClick = (connection: any) => {
    setConnectionToDelete(connection);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (deleteData: boolean) => {
    if (!connectionToDelete) return;
    
    const connection = connectionToDelete;
    const id = connection.id;
    
    // If connection has a token, delete from UAZAPI first
    if (connection?.token) {
      try {
        const { data, error } = await supabase.functions.invoke('wa-delete-instance', {
          body: {
            token: connection.token,
            base_url: connection.base_url
          }
        });
        
        if (error) {
          console.error("Error deleting from UAZAPI:", error);
          // Continue to delete locally even if UAZAPI fails
        } else if (data?.success) {
          toast.success("Instância removida da UAZAPI");
        }
      } catch (err) {
        console.error("Error calling wa-delete-instance:", err);
      }
    }
    
    // If user chose to delete data, remove leads and tags associated with this connection
    if (deleteData) {
      try {
        // Get current user
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        
        if (userId) {
          // Delete all leads synced from WhatsApp (source = 'WhatsApp Sync')
          const { data: deletedLeads, error: leadsError } = await supabase
            .from('leads')
            .delete()
            .eq('user_id', userId)
            .eq('source', 'WhatsApp Sync')
            .select('id');
          
          if (leadsError) {
            console.error("Error deleting leads:", leadsError);
          } else {
            const leadsCount = deletedLeads?.length || 0;
            if (leadsCount > 0) {
              toast.success(`${leadsCount} contatos removidos`);
            }
          }
          
          // Delete all tags associated with this user
          const { data: deletedTags, error: tagsError } = await supabase
            .from('tags')
            .delete()
            .eq('user_id', userId)
            .select('id');
          
          if (tagsError) {
            console.error("Error deleting tags:", tagsError);
          } else {
            const tagsCount = deletedTags?.length || 0;
            if (tagsCount > 0) {
              toast.success(`${tagsCount} etiquetas removidas`);
            }
          }
          
          // Also delete conversations associated with this connection
          const { data: deletedConvs, error: convsError } = await supabase
            .from('conversations')
            .delete()
            .eq('connection_id', id)
            .select('id');
          
          if (convsError) {
            console.error("Error deleting conversations:", convsError);
          } else {
            const convsCount = deletedConvs?.length || 0;
            if (convsCount > 0) {
              toast.info(`${convsCount} conversas removidas`);
            }
          }
        }
      } catch (err) {
        console.error("Error deleting associated data:", err);
        toast.error("Erro ao remover dados associados");
      }
    }
    
    // Delete from local database
    await deleteConnection.mutateAsync(id);
    if (selectedConnection?.id === id) {
      setSelectedConnection(connections.find(c => c.id !== id) || null);
    }
    
    setConnectionToDelete(null);
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
        setPairCode(data.paircode || null);
        toast.success("QR Code gerado! Escaneie ou use o código para reconectar.");

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

  // Sync contacts from WhatsApp
  const handleSyncContacts = async () => {
    if (!selectedConnection) {
      toast.error("Selecione uma conexão");
      return;
    }

    const connAny = selectedConnection as any;
    if (!connAny.token) {
      toast.error("Conexão sem token configurado");
      return;
    }

    setSyncingContacts(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('wa-contacts', {
        body: {
          action: 'sync',
          connectionId: selectedConnection.id,
          userId: user?.id
        }
      });

      if (error) throw error;

      if (data?.success) {
        setContactsStats({
          synced: data.added || 0,
          lastSync: new Date().toLocaleTimeString('pt-BR')
        });
        toast.success(`${data.added} contatos sincronizados! (${data.skipped} já existentes)`);
      } else {
        toast.error(data?.error || "Erro ao sincronizar contatos");
      }
    } catch (err) {
      console.error("Error syncing contacts:", err);
      toast.error("Erro ao sincronizar contatos");
    } finally {
      setSyncingContacts(false);
    }
  };

  // Sync labels/tags from WhatsApp
  const handleSyncLabels = async () => {
    if (!selectedConnection) {
      toast.error("Selecione uma conexão");
      return;
    }

    const connAny = selectedConnection as any;
    if (!connAny.token) {
      toast.error("Conexão sem token configurado");
      return;
    }

    setSyncingLabels(true);
    try {
      const baseUrl = connAny.base_url || "https://marketflowchat.uazapi.com";
      
      // Fetch labels from WhatsApp using UAZAPI
      const response = await fetch(`${baseUrl}/chat/labels`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'token': connAny.token
        }
      });

      if (!response.ok) {
        throw new Error("Falha ao buscar etiquetas");
      }

      const result = await response.json();
      let labels: any[] = [];
      
      if (Array.isArray(result)) {
        labels = result;
      } else if (result?.labels || result?.data) {
        labels = result.labels || result.data;
      }

      const { data: { user } } = await supabase.auth.getUser();
      let addedTagsCount = 0;
      let addedContactsCount = 0;

      // If no labels found
      if (labels.length === 0) {
        setLabelsStats({
          synced: 0,
          lastSync: new Date().toLocaleTimeString('pt-BR')
        });
        toast.info("Nenhuma etiqueta encontrada no WhatsApp Business");
        setSyncingLabels(false);
        return;
      }

      for (const label of labels) {
        const labelName = label.name || label.displayName || label.title;
        const labelColor = label.color || label.hexColor || '#3b82f6';
        const labelId = label.id || label.labelId;
        
        if (!labelName) continue;

        // Check if tag already exists
        const { data: existing } = await supabase
          .from('tags')
          .select('id')
          .eq('user_id', user?.id)
          .eq('name', labelName)
          .maybeSingle();

        let tagId = existing?.id;

        if (!existing) {
          const { data: newTag, error: insertError } = await supabase
            .from('tags')
            .insert({
              user_id: user?.id,
              name: labelName,
              color: labelColor
            })
            .select('id')
            .single();

          if (!insertError && newTag) {
            addedTagsCount++;
            tagId = newTag.id;
          }
        }

        // Try to fetch contacts with this label
        if (labelId && tagId) {
          try {
            const labelContactsResp = await fetch(`${baseUrl}/chat/labels/${labelId}/contacts`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'token': connAny.token
              }
            });

            if (labelContactsResp.ok) {
              const labelContacts = await labelContactsResp.json();
              const contacts = Array.isArray(labelContacts) ? labelContacts : (labelContacts?.contacts || labelContacts?.data || []);

              for (const contact of contacts) {
                const phone = contact.phone || contact.jid?.replace(/@.*$/, '') || contact.id?.replace(/@.*$/, '');
                const contactName = contact.name || contact.notify || contact.pushName || 'Sem nome';
                
                if (!phone || phone.length < 8) continue;

                // Check if lead exists
                const { data: existingLead } = await supabase
                  .from('leads')
                  .select('id, tags')
                  .eq('user_id', user?.id)
                  .eq('phone', phone)
                  .maybeSingle();

                if (existingLead) {
                  // Add tag to existing lead
                  const currentTags = existingLead.tags || [];
                  if (!currentTags.includes(labelName)) {
                    await supabase
                      .from('leads')
                      .update({ tags: [...currentTags, labelName] })
                      .eq('id', existingLead.id);
                    addedContactsCount++;
                  }
                } else {
                  // Create new lead with tag
                  const { error: insertErr } = await supabase
                    .from('leads')
                    .insert({
                      user_id: user?.id,
                      phone,
                      name: contactName,
                      source: 'WhatsApp Label',
                      status: 'new',
                      tags: [labelName]
                    });
                  
                  if (!insertErr) addedContactsCount++;
                }
              }
            }
          } catch (labelContactsErr) {
            console.log(`Não foi possível buscar contatos da etiqueta ${labelName}`);
          }
        }
      }

      setLabelsStats({
        synced: addedTagsCount,
        lastSync: new Date().toLocaleTimeString('pt-BR')
      });
      
      if (addedTagsCount === 0 && addedContactsCount === 0) {
        toast.info("Etiquetas já sincronizadas, nenhum contato etiquetado novo");
      } else {
        toast.success(`${addedTagsCount} etiquetas e ${addedContactsCount} contatos etiquetados sincronizados!`);
      }
    } catch (err) {
      console.error("Error syncing labels:", err);
      toast.error("Erro ao sincronizar etiquetas");
    } finally {
      setSyncingLabels(false);
    }
  };

  const handleMetaDisconnect = async (metaConn: any) => {
    if (!confirm(`Deseja realmente desconectar a conexão Meta Cloud API (WABA: ${metaConn.meta_waba_id || 'N/A'})?`)) return;
    
    setMetaDisconnecting(metaConn.id);
    try {
      const { error } = await supabase
        .from('whatsapp_connections')
        .update({ status: 'disconnected', meta_access_token: null })
        .eq('id', metaConn.id);

      if (error) throw error;

      setMetaConnections(prev => prev.map(c => 
        c.id === metaConn.id ? { ...c, status: 'disconnected', meta_access_token: null } : c
      ));
      toast.success("Conexão Meta desconectada com sucesso");
    } catch (err: any) {
      console.error("Error disconnecting Meta:", err);
      toast.error("Erro ao desconectar");
    } finally {
      setMetaDisconnecting(null);
    }
  };

  const handleMetaDelete = async (metaConn: any) => {
    if (!confirm(`Deseja realmente EXCLUIR a conexão Meta Cloud API? Esta ação não pode ser desfeita.`)) return;
    
    setMetaDisconnecting(metaConn.id);
    try {
      const { error } = await supabase
        .from('whatsapp_connections')
        .delete()
        .eq('id', metaConn.id);

      if (error) throw error;

      setMetaConnections(prev => prev.filter(c => c.id !== metaConn.id));
      toast.success("Conexão Meta excluída com sucesso");
    } catch (err: any) {
      console.error("Error deleting Meta:", err);
      toast.error("Erro ao excluir conexão");
    } finally {
      setMetaDisconnecting(null);
    }
  };

  const fetchMetaTemplates = async (connectionId: string) => {
    setMetaTemplatesLoading(true);
    setMetaTemplates([]);
    try {
      const { data, error } = await supabase.functions.invoke('meta-list-templates', {
        body: { connectionId }
      });
      if (error) throw error;
      if (data?.templates) {
        setMetaTemplates(data.templates);
      }
    } catch (err: any) {
      console.error("Error fetching templates:", err);
      toast.error("Erro ao buscar templates da Meta");
    } finally {
      setMetaTemplatesLoading(false);
    }
  };

  const handleMetaTestSend = async () => {
    if (!metaTestConnection || !metaTestPhone) {
      toast.error("Selecione uma conexão e digite o número");
      return;
    }

    if (metaTestType === 'template' && !metaTestTemplateName) {
      toast.error("Digite o nome do template");
      return;
    }

    if (metaTestType === 'text' && !metaTestMessage) {
      toast.error("Digite a mensagem");
      return;
    }

    setMetaTestSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-send-test', {
        body: {
          connectionId: metaTestConnection.id,
          to: metaTestPhone,
          ...(metaTestType === 'template' 
            ? { templateName: metaTestTemplateName, templateLanguage: metaTestTemplateLang }
            : { message: metaTestMessage }
          ),
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`✅ ${data.message}`);
        setMetaTestDialogOpen(false);
      } else {
        toast.error(data?.error || "Erro ao enviar");
      }
    } catch (err: any) {
      console.error("Meta test send error:", err);
      toast.error("Erro ao enviar mensagem de teste");
    } finally {
      setMetaTestSending(false);
    }
  };

  const renderConnectionTab = () => {
    const activeConnections = connections.filter(c => c.status === 'connected' || c.status === 'connecting').length;
    const isAtLimit = activeConnections >= instanceLimit;

    // Combine UAZAPI + Meta connections for unified table
    const allConnections = [
      ...connections.map(c => ({ ...c, provider: 'uazapi' as const })),
      ...metaConnections.map(c => ({ ...c, provider: 'meta' as const, instance_name: 'Meta Cloud API', name: 'Meta Cloud API' }))
    ];

    const filtered = allConnections.filter(c => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const name = (c.name || c.instance_name || '').toLowerCase();
      const phone = ((c as any).phone_number || (c as any).meta_phone_number_id || '').toLowerCase();
      return name.includes(q) || phone.includes(q);
    });

    const getStatusBadge = (status: string) => {
      switch (status) {
        case 'connected':
          return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 font-medium px-3">Conectado</Badge>;
        case 'disconnected':
          return <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 font-medium px-3">Desconectado</Badge>;
        case 'connecting':
          return <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 font-medium px-3">Conectando</Badge>;
        case 'deleted':
          return <Badge variant="destructive" className="font-medium px-3">Removido</Badge>;
        case 'error':
          return <Badge variant="destructive" className="font-medium px-3">Erro</Badge>;
        default:
          return <Badge variant="secondary" className="font-medium px-3">{status}</Badge>;
      }
    };

    const getProviderBadge = (provider: string) => {
      if (provider === 'meta') {
        return (
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-blue-600 text-white text-xs font-bold">
            FB
          </span>
        );
      }
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-emerald-600 text-white text-xs font-bold">
          WA
        </span>
      );
    };

    return (
      <div className="space-y-4">
        {/* Instance limit warning */}
        {isAtLimit && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Limite de {instanceLimit} instância(s) atingido. Desconecte uma existente para criar novas.</span>
          </div>
        )}

        <OrphanedInstancesAlert />

        {/* Table Card */}
        <Card className="border-border overflow-hidden">
          {/* Search bar */}
          <div className="flex items-center justify-end p-4 pb-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-10"></th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">#</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Telefone</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-center w-20">Tipo</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Última modificação</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-center w-32">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      {searchQuery ? 'Nenhuma conexão encontrada' : 'Nenhuma conexão cadastrada'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((connection, index) => {
                    const connAny = connection as any;
                    const isExpanded = expandedConnectionId === connection.id;
                    const phone = connAny.phone_number || connAny.meta_phone_number_id || '—';
                    const updatedAt = connection.updated_at 
                      ? new Date(connection.updated_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '—';

                    return (
                      <React.Fragment key={connection.id}>
                        <tr 
                          className={`hover:bg-muted/50 transition-colors cursor-pointer ${isExpanded ? 'bg-primary/5' : ''}`}
                          onClick={() => {
                            setSelectedConnection(connection);
                            setExpandedConnectionId(isExpanded ? null : connection.id);
                          }}
                        >
                          <td className="px-4 py-3 text-muted-foreground">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{index + 1}</td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-foreground">
                              {(connection.name || connection.instance_name || 'Sem nome').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{phone}</td>
                          <td className="px-4 py-3 text-center">{getProviderBadge(connection.provider)}</td>
                          <td className="px-4 py-3 text-center">{getStatusBadge(connection.status || 'disconnected')}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{updatedAt}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {connection.provider === 'meta' ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Detalhes"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMetaDetailsConnection(connection);
                                      setMetaDetailsDialogOpen(true);
                                    }}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    title="Excluir"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMetaDelete(connection);
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  {connection.status === 'connected' ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-orange-500 hover:text-orange-600"
                                      title="Desconectar"
                                      onClick={(e) => { e.stopPropagation(); handleDisconnect(connection); }}
                                    >
                                      <WifiOff className="w-4 h-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-emerald-500 hover:text-emerald-600"
                                      title="Reconectar"
                                      onClick={(e) => { e.stopPropagation(); handleReconnect(connection); }}
                                    >
                                      <QrCode className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Copiar link"
                                    onClick={(e) => handleCopyLink(connection, e)}
                                  >
                                    <Link2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    title="Excluir"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(connection); }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {/* Expanded config panel - UAZAPI */}
                        {isExpanded && connection.provider !== 'meta' && (
                          <tr>
                            <td colSpan={8} className="p-0">
                              <div className="bg-muted/30 border-t border-border">
                                {/* Connection quick actions bar */}
                                <div className="flex items-center justify-between px-6 py-3 border-b border-border">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${
                                      connection.status === 'connected' ? 'bg-emerald-500/10' : 'bg-muted'
                                    }`}>
                                      {connection.status === 'connected' ? (
                                        <Wifi className="w-4 h-4 text-emerald-500" />
                                      ) : (
                                        <WifiOff className="w-4 h-4 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-foreground">{connection.name || connection.instance_name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {connection.status === 'connected' ? 'Conectado' : 'Desconectado'} • {connAny.environment || 'PROD'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleCopyLink(connection); }}>
                                      <Link2 className="w-4 h-4 mr-1.5" />
                                      Link
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDownloadQR(connection); }}>
                                      <Download className="w-4 h-4 mr-1.5" />
                                      QR
                                    </Button>
                                    {connection.status !== 'connected' ? (
                                      <Button size="sm" onClick={(e) => { e.stopPropagation(); handleReconnect(connection); }}>
                                        <QrCode className="w-4 h-4 mr-1.5" />
                                        Conectar
                                      </Button>
                                    ) : (
                                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDisconnect(connection); }}>
                                        Desconectar
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {/* Config tabs inside expanded row */}
                                <Tabs defaultValue="configuracoes" className="w-full">
                                  <TabsList className="w-full justify-start border-b border-border bg-transparent p-0 h-auto px-6">
                                    <TabsTrigger value="configuracoes" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3 text-xs">
                                      <Settings className="w-3.5 h-3.5 mr-1.5" />
                                      Configurações
                                    </TabsTrigger>
                                    <TabsTrigger value="mensagens" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3 text-xs">
                                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                                      Mensagens
                                    </TabsTrigger>
                                    <TabsTrigger value="contatos" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3 text-xs">
                                      <Users className="w-3.5 h-3.5 mr-1.5" />
                                      Contatos
                                    </TabsTrigger>
                                    <TabsTrigger value="api" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3 text-xs">
                                      <Code className="w-3.5 h-3.5 mr-1.5" />
                                      API e Webhooks
                                    </TabsTrigger>
                                    <TabsTrigger value="notificacao" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3 text-xs">
                                      <Bell className="w-3.5 h-3.5 mr-1.5" />
                                      Notificação
                                    </TabsTrigger>
                                  </TabsList>
                                  <div className="p-6">
                                    <TabsContent value="configuracoes" className="mt-0">
                                      {renderSettingsTab()}
                                    </TabsContent>
                                    <TabsContent value="mensagens" className="mt-0">
                                      {renderMessagesTab()}
                                    </TabsContent>
                                    <TabsContent value="contatos" className="mt-0">
                                      {renderContactsTab()}
                                    </TabsContent>
                                    <TabsContent value="api" className="mt-0">
                                      {renderApiTab()}
                                    </TabsContent>
                                    <TabsContent value="notificacao" className="mt-0">
                                      <TelegramNotifications connections={connections.map(c => ({ id: c.id, name: c.name || c.instance_name || 'Sem nome' }))} />
                                    </TabsContent>
                                  </div>
                                </Tabs>
                              </div>
                            </td>
                          </tr>
                        )}
                        {/* Expanded config panel - Meta Cloud API */}
                        {isExpanded && connection.provider === 'meta' && (
                          <tr>
                            <td colSpan={8} className="p-0">
                              <div className="bg-muted/30 border-t border-border">
                                {/* Meta connection quick actions bar */}
                                <div className="flex items-center justify-between px-6 py-3 border-b border-border">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${
                                      connection.status === 'connected' ? 'bg-emerald-500/10' : 'bg-muted'
                                    }`}>
                                      {connection.status === 'connected' ? (
                                        <Wifi className="w-4 h-4 text-emerald-500" />
                                      ) : (
                                        <WifiOff className="w-4 h-4 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-foreground">Meta Cloud API</p>
                                      <p className="text-xs text-muted-foreground">
                                        {connection.status === 'connected' ? 'Conectado' : connection.status === 'error' ? 'Erro' : 'Desconectado'} • Meta WhatsApp Cloud API
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    {connection.status === 'connected' && (
                                      <Button variant="outline" size="sm" onClick={(e) => {
                                        e.stopPropagation();
                                        setMetaTestConnection(connection);
                                        setMetaTestDialogOpen(true);
                                      }}>
                                        <Send className="w-4 h-4 mr-1.5" />
                                        Testar Envio
                                      </Button>
                                    )}
                                    {connection.status === 'connected' && (
                                      <Button variant="outline" size="sm" onClick={(e) => {
                                        e.stopPropagation();
                                        handleMetaDisconnect(connection);
                                      }} disabled={metaDisconnecting === connection.id}>
                                        {metaDisconnecting === connection.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <>
                                            <WifiOff className="w-4 h-4 mr-1.5" />
                                            Desconectar
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {/* Config tabs inside expanded row - same as UAZAPI */}
                                <Tabs defaultValue="configuracoes" className="w-full">
                                  <TabsList className="w-full justify-start border-b border-border bg-transparent p-0 h-auto px-6">
                                    <TabsTrigger value="configuracoes" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3 text-xs">
                                      <Settings className="w-3.5 h-3.5 mr-1.5" />
                                      Configurações
                                    </TabsTrigger>
                                    <TabsTrigger value="api" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3 text-xs">
                                      <Code className="w-3.5 h-3.5 mr-1.5" />
                                      API e Webhooks
                                    </TabsTrigger>
                                    <TabsTrigger value="notificacao" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3 text-xs">
                                      <Bell className="w-3.5 h-3.5 mr-1.5" />
                                      Notificação
                                    </TabsTrigger>
                                    <TabsTrigger value="detalhes" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3 text-xs">
                                      <Globe className="w-3.5 h-3.5 mr-1.5" />
                                      Detalhes Meta
                                    </TabsTrigger>
                                  </TabsList>
                                  <div className="p-6">
                                    <TabsContent value="configuracoes" className="mt-0">
                                      {renderSettingsTab()}
                                    </TabsContent>
                                    <TabsContent value="api" className="mt-0">
                                      {renderApiTab()}
                                    </TabsContent>
                                    <TabsContent value="notificacao" className="mt-0">
                                      <TelegramNotifications connections={[...connections.map(c => ({ id: c.id, name: c.name || c.instance_name || 'Sem nome' })), ...metaConnections.map((c: any) => ({ id: c.id, name: 'Meta Cloud API' }))]} />
                                    </TabsContent>
                                    <TabsContent value="detalhes" className="mt-0">
                                      <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-foreground mb-3">Detalhes da Conexão Meta</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                          {connAny.meta_waba_id && (
                                            <div className="space-y-1.5">
                                              <Label className="text-xs text-muted-foreground">WABA ID</Label>
                                              <div className="flex gap-2">
                                                <Input value={connAny.meta_waba_id} readOnly className="font-mono text-sm h-9" />
                                                <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => { navigator.clipboard.writeText(connAny.meta_waba_id); toast.success("WABA ID copiado!"); }}>
                                                  <Copy className="w-3.5 h-3.5" />
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                          {connAny.meta_phone_number_id && (
                                            <div className="space-y-1.5">
                                              <Label className="text-xs text-muted-foreground">Phone Number ID</Label>
                                              <div className="flex gap-2">
                                                <Input value={connAny.meta_phone_number_id} readOnly className="font-mono text-sm h-9" />
                                                <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => { navigator.clipboard.writeText(connAny.meta_phone_number_id); toast.success("Phone Number ID copiado!"); }}>
                                                  <Copy className="w-3.5 h-3.5" />
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                          {connAny.meta_business_id && (
                                            <div className="space-y-1.5">
                                              <Label className="text-xs text-muted-foreground">Business ID</Label>
                                              <div className="flex gap-2">
                                                <Input value={connAny.meta_business_id} readOnly className="font-mono text-sm h-9" />
                                                <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => { navigator.clipboard.writeText(connAny.meta_business_id); toast.success("Business ID copiado!"); }}>
                                                  <Copy className="w-3.5 h-3.5" />
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {/* Status info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                                          <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                                            <span className="text-xs text-muted-foreground">Provedor</span>
                                            <span className="text-sm font-medium">Meta Cloud API</span>
                                          </div>
                                          {connAny.meta_connected_at && (
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                                              <span className="text-xs text-muted-foreground">Conectado em</span>
                                              <span className="text-sm font-medium">{new Date(connAny.meta_connected_at).toLocaleString('pt-BR')}</span>
                                            </div>
                                          )}
                                          <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                                            <span className="text-xs text-muted-foreground">Criado em</span>
                                            <span className="text-sm font-medium">{new Date(connection.created_at).toLocaleString('pt-BR')}</span>
                                          </div>
                                        </div>

                                        {/* Last error */}
                                        {connAny.last_error && (
                                          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                            <p className="text-sm font-medium text-destructive mb-1">Último Erro</p>
                                            <p className="text-xs text-muted-foreground">{connAny.last_error}</p>
                                          </div>
                                        )}
                                      </div>
                                    </TabsContent>
                                  </div>
                                </Tabs>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer info */}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>{filtered.length} conexão(ões) • {activeConnections}/{instanceLimit} ativa(s)</span>
            {selectedConnection && (
              <span className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${selectedConnection.status === 'connected' ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`} />
                Selecionada: {selectedConnection.name || selectedConnection.instance_name}
              </span>
            )}
          </div>
        </Card>

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

  const renderContactsTab = () => (
    <div className="space-y-6">
      {/* Auto-Sync Progress Indicator */}
      {(syncingContacts || syncingLabels) && autoSyncedConnections.has(selectedConnection?.id || '') && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-primary">Sincronização automática em andamento...</p>
                <p className="text-xs text-muted-foreground">
                  {syncingContacts && syncingLabels 
                    ? 'Sincronizando contatos e etiquetas'
                    : syncingContacts 
                      ? 'Sincronizando contatos' 
                      : 'Sincronizando etiquetas'
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                {syncingContacts && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-full">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs text-primary font-medium">Contatos</span>
                  </div>
                )}
                {syncingLabels && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-full">
                    <Tag className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs text-primary font-medium">Etiquetas</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Contacts Card */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Sincronizar Contatos do WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Importe os contatos salvos no WhatsApp para sua base de leads. Contatos duplicados serão ignorados.
          </p>
          
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Contatos do WhatsApp</p>
                <p className="text-xs text-muted-foreground">
                  {contactsStats.lastSync 
                    ? `Última sincronização: ${contactsStats.lastSync} (${contactsStats.synced} novos)`
                    : 'Nunca sincronizado'
                  }
                </p>
              </div>
            </div>
            <Button 
              onClick={handleSyncContacts} 
              disabled={syncingContacts || !selectedConnection}
              variant="outline"
            >
              {syncingContacts ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {syncingContacts ? 'Sincronizando...' : 'Sincronizar Contatos'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync Labels Card */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Sincronizar Etiquetas do WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Importe as etiquetas do WhatsApp Business para usar como tags no sistema.
          </p>
          
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Tag className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Etiquetas do WhatsApp</p>
                <p className="text-xs text-muted-foreground">
                  {labelsStats.lastSync 
                    ? `Última sincronização: ${labelsStats.lastSync} (${labelsStats.synced} novas)`
                    : 'Nunca sincronizado'
                  }
                </p>
              </div>
            </div>
            <Button 
              onClick={handleSyncLabels} 
              disabled={syncingLabels || !selectedConnection}
              variant="outline"
            >
              {syncingLabels ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {syncingLabels ? 'Sincronizando...' : 'Sincronizar Etiquetas'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connection Info */}
      {!selectedConnection && (
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Wifi className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Selecione uma conexão na aba "Conexão" para sincronizar contatos e etiquetas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderMessagesTab = () => (
    <div className="space-y-6">
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

    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">📩 Resposta Automática</CardTitle>
          <Switch 
            checked={messageSettings.autoReplyEnabled}
            onCheckedChange={(checked) => setMessageSettings({...messageSettings, autoReplyEnabled: checked})}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Envia automaticamente uma mensagem padrão com botão para toda pessoa que enviar qualquer mensagem nesta conexão.
        </p>
      </CardHeader>
      {messageSettings.autoReplyEnabled && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Mensagem automática</Label>
            <Textarea 
              value={messageSettings.autoReplyMessage}
              onChange={(e) => setMessageSettings({...messageSettings, autoReplyMessage: e.target.value})}
              placeholder={`🤖 MENSAGEM AUTOMÁTICA\n\nEste WhatsApp é exclusivo para o envio de comunicados importantes.`}
              rows={6}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Texto do botão</Label>
              <Input 
                value={messageSettings.autoReplyButtonText}
                onChange={(e) => setMessageSettings({...messageSettings, autoReplyButtonText: e.target.value})}
                placeholder="Ex: Falar com ComuNET"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">URL do botão (WhatsApp link)</Label>
              <Input 
                value={messageSettings.autoReplyButtonUrl}
                onChange={(e) => setMessageSettings({...messageSettings, autoReplyButtonUrl: e.target.value})}
                placeholder="Ex: https://wa.me/5551999999999"
              />
            </div>
          </div>

          {messageSettings.autoReplyMessage && (
            <div className="border border-border rounded-lg p-4 bg-muted/30">
              <Label className="text-sm text-muted-foreground mb-2 block">📱 Pré-visualização</Label>
              <div className="bg-background rounded-lg p-3 text-sm whitespace-pre-wrap">
                {messageSettings.autoReplyMessage}
              </div>
              {messageSettings.autoReplyButtonText && (
                <div className="mt-2 flex justify-center">
                  <span className="inline-block bg-primary/10 text-primary border border-primary/30 rounded-full px-4 py-1.5 text-sm font-medium">
                    🔗 {messageSettings.autoReplyButtonText}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveMessages} disabled={savingMessages}>
              {savingMessages ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {savingMessages ? 'Salvando...' : 'Salvar Resposta Automática'}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
    </div>
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
          <h1 className="text-2xl font-bold text-foreground">Conexões</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie suas conexões WhatsApp</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-semibold">
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedProvider ? (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedProvider(null)}>
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    {selectedProvider === 'instagram' ? 'Conectar Instagram' : 'Conectar WhatsApp'}
                  </div>
                ) : (
                  'Nova Conexão'
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedProvider 
                  ? selectedProvider === 'instagram'
                    ? 'Conecte sua conta Instagram Business via Meta'
                    : 'Preencha os dados e escolha como deseja conectar'
                  : 'Escolha a plataforma que deseja conectar'
                }
              </DialogDescription>
            </DialogHeader>

            {!selectedProvider ? (
              <div className="space-y-3 py-2">
                <div 
                  onClick={() => setSelectedProvider('meta')}
                  className="cursor-pointer p-4 rounded-lg border-2 border-border hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Globe className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">API Oficial Meta</p>
                      <p className="text-xs text-muted-foreground">WhatsApp Cloud API — conexão oficial via Meta Business</p>
                    </div>
                  </div>
                </div>
                <div 
                  onClick={() => setSelectedProvider('uazapi')}
                  className="cursor-pointer p-4 rounded-lg border-2 border-border hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <QrCode className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">UAZAPI</p>
                      <p className="text-xs text-muted-foreground">Conexão via QR Code ou código de pareamento</p>
                    </div>
                  </div>
                </div>
                <div 
                  onClick={() => setSelectedProvider('instagram')}
                  className="cursor-pointer p-4 rounded-lg border-2 border-border hover:border-pink-500/50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Instagram</p>
                      <p className="text-xs text-muted-foreground">Instagram Messaging — DMs via Meta Business</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : selectedProvider === 'meta' ? (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  Clique no botão abaixo para iniciar a conexão via Meta Embedded Signup. Um popup do Facebook será aberto para autorizar o acesso.
                </p>
                <Button 
                  className="w-full" 
                  disabled={loadingQr}
                  onClick={async () => {
                    setLoadingQr(true);
                    try {
                      // Get user's company_id
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) throw new Error("Usuário não autenticado");
                      
                      const { data: profile } = await supabase
                        .from('profiles')
                        .select('company_id')
                        .eq('id', user.id)
                        .maybeSingle();
                      
                      if (!profile?.company_id) throw new Error("Empresa não encontrada");
                      
                      const { data, error } = await supabase.functions.invoke("meta-start-connect", {
                        body: { company_id: profile.company_id },
                      });
                      
                      if (error) throw error;
                      if (data?.error) throw new Error(data.error);
                      
                      if (data?.login_url) {
                        const width = 600;
                        const height = 700;
                        const left = window.screenX + (window.innerWidth - width) / 2;
                        const top = window.screenY + (window.innerHeight - height) / 2;
                        window.open(
                          data.login_url,
                          "meta-connect",
                          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
                        );
                        toast.success("Popup do Facebook aberto. Complete a autorização na janela.");
                        setDialogOpen(false);
                      }
                    } catch (err: any) {
                      console.error("Meta connect error:", err);
                      toast.error("Erro ao iniciar conexão: " + (err.message || "Falha"));
                    } finally {
                      setLoadingQr(false);
                    }
                  }}
                >
                  {loadingQr ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}
                  Conectar com a Meta
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setSelectedProvider(null)}>
                    Voltar
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : selectedProvider === 'instagram' ? (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  Conecte sua conta Instagram Business. É necessário ter uma Página do Facebook vinculada à sua conta Instagram Business.
                </p>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground">
                    <strong>Requisitos:</strong>
                  </p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                    <li>Conta Instagram Business ou Creator</li>
                    <li>Página do Facebook vinculada ao Instagram</li>
                    <li>Permissões de gerenciamento da página</li>
                  </ul>
                </div>
                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white" 
                  disabled={loadingQr}
                  onClick={async () => {
                    setLoadingQr(true);
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) throw new Error("Usuário não autenticado");
                      
                      const { data: profile } = await supabase
                        .from('profiles')
                        .select('company_id')
                        .eq('id', user.id)
                        .maybeSingle();
                      
                      if (!profile?.company_id) throw new Error("Empresa não encontrada");
                      
                      const { data, error } = await supabase.functions.invoke("instagram-start-connect", {
                        body: { company_id: profile.company_id },
                      });
                      
                      if (error) throw error;
                      if (data?.error) throw new Error(data.error);
                      
                      if (data?.login_url) {
                        const width = 600;
                        const height = 700;
                        const left = window.screenX + (window.innerWidth - width) / 2;
                        const top = window.screenY + (window.innerHeight - height) / 2;
                        window.open(
                          data.login_url,
                          "instagram-connect",
                          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
                        );
                        toast.success("Popup do Facebook aberto. Autorize o acesso ao Instagram.");
                        setDialogOpen(false);
                      }
                    } catch (err: any) {
                      console.error("Instagram connect error:", err);
                      toast.error("Erro ao iniciar conexão: " + (err.message || "Falha"));
                    } finally {
                      setLoadingQr(false);
                    }
                  }}
                >
                  {loadingQr ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  )}
                  Conectar com Instagram
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setSelectedProvider(null)}>
                    Voltar
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
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
                  <Label htmlFor="phone">
                    Telefone {connectMethod === 'paircode' && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ex: 5511999999999"
                    required={connectMethod === 'paircode'}
                    className={connectMethod === 'paircode' && !formData.phone ? 'border-destructive/50' : ''}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {connectMethod === 'paircode' 
                      ? 'Obrigatório para conexão via código de pareamento'
                      : 'Opcional - deixe em branco se não quiser vincular a um número específico'
                    }
                  </p>
                </div>

                <div>
                  <Label className="mb-3 block">Método de Conexão</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      onClick={() => setConnectMethod('qrcode')}
                      className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                        connectMethod === 'qrcode' 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2 text-center">
                        <QrCode className={`w-8 h-8 ${connectMethod === 'qrcode' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-sm font-medium ${connectMethod === 'qrcode' ? 'text-primary' : ''}`}>
                          QR Code
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Escaneie com a câmera
                        </span>
                      </div>
                    </div>
                    <div 
                      onClick={() => setConnectMethod('paircode')}
                      className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                        connectMethod === 'paircode' 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2 text-center">
                        <Smartphone className={`w-8 h-8 ${connectMethod === 'paircode' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-sm font-medium ${connectMethod === 'paircode' ? 'text-primary' : ''}`}>
                          Código
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Digite um código
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    {connectMethod === 'qrcode' ? 'Gerar QR Code' : 'Gerar Código'}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Connection Table */}
      {renderConnectionTab()}

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={(open) => {
        setQrDialogOpen(open);
        if (!open) {
          setPairCode(null);
          setConnectMethod('qrcode');
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Escolha como deseja conectar seu WhatsApp
            </DialogDescription>
          </DialogHeader>
          
          {/* Method Toggle */}
          {!loadingQr && (qrCodeData || pairCode) && (
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <Button
                variant={connectMethod === 'qrcode' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setConnectMethod('qrcode')}
              >
                <QrCode className="w-4 h-4 mr-2" />
                QR Code
              </Button>
              <Button
                variant={connectMethod === 'paircode' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setConnectMethod('paircode')}
                disabled={!pairCode}
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Código
              </Button>
            </div>
          )}

          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            {loadingQr ? (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Gerando conexão...</p>
              </>
            ) : connectMethod === 'qrcode' && qrCodeData ? (
              <>
                <img src={qrCodeData} alt="QR Code WhatsApp" className="max-w-full rounded-lg border" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Aguardando conexão...</span>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Abra o WhatsApp {'>'} Menu {'>'} Dispositivos conectados {'>'} Conectar dispositivo
                </p>
              </>
            ) : connectMethod === 'paircode' && pairCode ? (
              <>
                <div className="text-center space-y-4">
                  <div className="bg-primary/10 border-2 border-primary rounded-xl p-6">
                    <p className="text-3xl font-mono font-bold tracking-[0.3em] text-primary">
                      {pairCode}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Aguardando conexão...</span>
                  </div>
                </div>
                <div className="text-xs text-center text-muted-foreground space-y-1">
                  <p className="font-medium">Como usar o código:</p>
                  <p>1. Abra o WhatsApp no celular</p>
                  <p>2. Vá em Menu {'>'} Dispositivos conectados</p>
                  <p>3. Toque em "Conectar dispositivo"</p>
                  <p>4. Selecione "Conectar com número de telefone"</p>
                  <p>5. Digite o código acima</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(pairCode);
                    toast.success("Código copiado!");
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Código
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">Gerando QR Code...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Connection Dialog */}
      <DeleteConnectionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        connectionName={connectionToDelete?.name || connectionToDelete?.instance_name || "Conexão"}
        onConfirm={handleDeleteConfirm}
      />

      {/* Meta Test Send Dialog */}
      <Dialog open={metaTestDialogOpen} onOpenChange={setMetaTestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Testar Envio - Meta Cloud API
            </DialogTitle>
            <DialogDescription>
              Envie uma mensagem de teste ou template via Meta WhatsApp Cloud API
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Número de destino</Label>
              <Input
                placeholder="5511999999999"
                value={metaTestPhone}
                onChange={(e) => setMetaTestPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Formato: código do país + DDD + número (ex: 5511999999999)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tipo de envio</Label>
              <Select value={metaTestType} onValueChange={(v: 'text' | 'template') => {
                setMetaTestType(v);
                if (v === 'template' && metaTestConnection && metaTemplates.length === 0) {
                  fetchMetaTemplates(metaTestConnection.id);
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Mensagem de Texto</SelectItem>
                  <SelectItem value="template">Template Aprovado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {metaTestType === 'text' ? (
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea
                  placeholder="Digite sua mensagem de teste..."
                  value={metaTestMessage}
                  onChange={(e) => setMetaTestMessage(e.target.value)}
                  rows={3}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Template</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      disabled={metaTemplatesLoading || !metaTestConnection}
                      onClick={() => metaTestConnection && fetchMetaTemplates(metaTestConnection.id)}
                    >
                      {metaTemplatesLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <RefreshCw className="w-3 h-3 mr-1" />
                      )}
                      Atualizar
                    </Button>
                  </div>

                  {metaTemplatesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Buscando templates...</span>
                    </div>
                  ) : metaTemplates.length > 0 ? (
                    <Select 
                      value={metaTestTemplateName} 
                      onValueChange={(v) => {
                        setMetaTestTemplateName(v);
                        // Auto-set language from template
                        const tpl = metaTemplates.find((t: any) => t.name === v);
                        if (tpl?.language) {
                          setMetaTestTemplateLang(tpl.language);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Group by unique name */}
                        {Array.from(new Set(metaTemplates.map((t: any) => t.name))).map((name: string) => {
                          const tpl = metaTemplates.find((t: any) => t.name === name);
                          return (
                            <SelectItem key={name} value={name}>
                              <div className="flex items-center gap-2">
                                <span>{name}</span>
                                <Badge 
                                  variant={tpl?.status === 'APPROVED' ? 'default' : 'secondary'} 
                                  className="text-[10px] h-4 px-1"
                                >
                                  {tpl?.status === 'APPROVED' ? '✓' : tpl?.status}
                                </Badge>
                                <span className="text-muted-foreground text-xs">{tpl?.language}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        placeholder="hello_world"
                        value={metaTestTemplateName}
                        onChange={(e) => setMetaTestTemplateName(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Nenhum template encontrado. Digite o nome manualmente ou clique em Atualizar.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Idioma do Template</Label>
                  <Select value={metaTestTemplateLang} onValueChange={setMetaTestTemplateLang}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt_BR">Português (BR)</SelectItem>
                      <SelectItem value="en_US">English (US)</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <Button
              onClick={handleMetaTestSend}
              disabled={metaTestSending}
              className="w-full"
            >
              {metaTestSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Mensagem de Teste
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Meta Details Dialog */}
      <Dialog open={metaDetailsDialogOpen} onOpenChange={setMetaDetailsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Detalhes da Conexão Meta
            </DialogTitle>
            <DialogDescription>
              Informações completas da conexão Meta Cloud API
            </DialogDescription>
          </DialogHeader>
          {metaDetailsConnection && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Status</span>
                <Badge variant={metaDetailsConnection.status === 'connected' ? 'default' : 'destructive'}>
                  {metaDetailsConnection.status === 'connected' ? 'Conectado' : metaDetailsConnection.status === 'error' ? 'Erro' : 'Desconectado'}
                </Badge>
              </div>

              {/* Provider */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Provedor</span>
                <span className="text-sm text-muted-foreground">Meta Cloud API</span>
              </div>

              {/* WABA ID */}
              {metaDetailsConnection.meta_waba_id && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">WABA ID</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-background px-2 py-1 rounded">{metaDetailsConnection.meta_waba_id}</code>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => {
                        navigator.clipboard.writeText(metaDetailsConnection.meta_waba_id);
                        toast.success("WABA ID copiado!");
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Phone Number ID */}
              {metaDetailsConnection.meta_phone_number_id && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Phone Number ID</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-background px-2 py-1 rounded">{metaDetailsConnection.meta_phone_number_id}</code>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => {
                        navigator.clipboard.writeText(metaDetailsConnection.meta_phone_number_id);
                        toast.success("Phone Number ID copiado!");
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Business ID */}
              {metaDetailsConnection.meta_business_id && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Business ID</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-background px-2 py-1 rounded">{metaDetailsConnection.meta_business_id}</code>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => {
                        navigator.clipboard.writeText(metaDetailsConnection.meta_business_id);
                        toast.success("Business ID copiado!");
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Connected At */}
              {metaDetailsConnection.meta_connected_at && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Conectado em</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(metaDetailsConnection.meta_connected_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              )}

              {/* Last Error */}
              {metaDetailsConnection.last_error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm font-medium text-destructive mb-1">Último Erro</p>
                  <p className="text-xs text-muted-foreground">{metaDetailsConnection.last_error}</p>
                </div>
              )}

              {/* Created At */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Criado em</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(metaDetailsConnection.created_at).toLocaleString('pt-BR')}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {metaDetailsConnection.status === 'connected' && (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setMetaTestConnection(metaDetailsConnection);
                        setMetaDetailsDialogOpen(false);
                        setMetaTestDialogOpen(true);
                      }}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Testar Envio
                    </Button>
                    <Button
                      variant="outline"
                      className="text-orange-500 hover:text-orange-600 border-orange-200 hover:border-orange-300"
                      disabled={metaDisconnecting === metaDetailsConnection.id}
                      onClick={() => {
                        handleMetaDisconnect(metaDetailsConnection);
                        setMetaDetailsDialogOpen(false);
                      }}
                    >
                      {metaDisconnecting === metaDetailsConnection.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <WifiOff className="w-4 h-4 mr-2" />
                          Desconectar
                        </>
                      )}
                    </Button>
                  </>
                )}
                <Button
                  variant="destructive"
                  disabled={metaDisconnecting === metaDetailsConnection.id}
                  onClick={() => {
                    handleMetaDelete(metaDetailsConnection);
                    setMetaDetailsDialogOpen(false);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Connections;
