import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  HardDrive, Cloud, CheckCircle, XCircle, RefreshCw, 
  ExternalLink, Database, Search, Calendar,
  FileText, FolderSync, Loader2, Settings, Building2,
  Trash2, Archive, Filter, AlertTriangle, Download, Eye, FolderArchive
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

interface BackupRecord {
  id: string;
  file_name: string;
  backup_month: string;
  protocol_number: string | null;
  drive_file_url: string | null;
  drive_file_id: string;
  created_at: string;
  user_id: string;
}

// Helper function to format bytes
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to calculate storage percentage
const getStoragePercent = (usage: number | undefined, limit: number | undefined): number => {
  if (!usage || !limit || limit === 0) return 0;
  return Math.min((usage / limit) * 100, 100);
};

export function AdminArmazenamento() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [selectedBackups, setSelectedBackups] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("");
  const [deleteFromDrive, setDeleteFromDrive] = useState(true);
  const [deleteType, setDeleteType] = useState<"selected" | "all" | "month">("selected");
  const [archiveType, setArchiveType] = useState<"selected" | "all" | "month">("selected");
  const [archiveFolderName, setArchiveFolderName] = useState("");

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const driveConnected = urlParams.get('drive_connected');
    const driveError = urlParams.get('drive_error');

    if (driveConnected === 'true') {
      toast.success('Google Drive conectado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['admin-google-drive-connection'] });
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (driveError) {
      toast.error(`Erro ao conectar: ${driveError}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [queryClient]);

  // Fetch Drive connection
  const { data: driveConnection, isLoading: loadingDrive } = useQuery({
    queryKey: ['admin-google-drive-connection', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('google_drive_tokens')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch Drive storage info
  const { data: driveStorage, isLoading: loadingDriveStorage, refetch: refetchDriveStorage } = useQuery({
    queryKey: ['admin-google-drive-storage', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const response = await supabase.functions.invoke('google-drive-storage', {
        body: { userId: user.id },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    enabled: !!user && !!driveConnection,
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch Supabase storage info (our main Supabase instance)
  const { data: supabaseStorage, isLoading: loadingSupabaseStorage, refetch: refetchSupabaseStorage } = useQuery({
    queryKey: ['admin-supabase-storage'],
    queryFn: async () => {
      // List all buckets and calculate storage usage
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('Error fetching buckets:', bucketsError);
        return null;
      }

      let totalSize = 0;
      const bucketDetails: { name: string; size: number; filesCount: number }[] = [];

      for (const bucket of buckets || []) {
        try {
          const { data: files } = await supabase.storage.from(bucket.name).list('', { limit: 1000 });
          let bucketSize = 0;
          let filesCount = 0;
          
          if (files) {
            for (const file of files) {
              if (file.metadata?.size) {
                bucketSize += file.metadata.size;
                filesCount++;
              }
            }
          }
          
          totalSize += bucketSize;
          bucketDetails.push({ name: bucket.name, size: bucketSize, filesCount });
        } catch (e) {
          console.error(`Error listing files in bucket ${bucket.name}:`, e);
        }
      }

      // Supabase free tier limit is 1GB
      const limit = 1024 * 1024 * 1024; // 1GB
      
      return {
        used: totalSize,
        limit,
        percentage: Math.min((totalSize / limit) * 100, 100),
        buckets: bucketDetails,
        bucketsCount: buckets?.length || 0,
      };
    },
    refetchInterval: 120000, // Refresh every 2 minutes
  });

  // Fetch all backups using RPC to bypass RLS
  const { data: allBackups, isLoading: loadingBackups } = useQuery({
    queryKey: ['admin-all-backups'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_all_backups');
      if (error) {
        console.error('Error fetching backups:', error);
        // Fallback to direct query if RPC fails
        const { data: fallbackData } = await supabase
          .from('conversation_backups')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);
        return fallbackData || [];
      }
      return data || [];
    },
  });

  // Fetch storage stats using RPC
  const { data: storageStats } = useQuery({
    queryKey: ['admin-storage-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_storage_stats');
      if (error) {
        console.error('Error fetching storage stats:', error);
        return null;
      }
      return data?.[0] || null;
    },
  });

  // Fetch companies
  const { data: companies } = useQuery({
    queryKey: ['admin-companies-storage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, email')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Connect Drive
  const connectDrive = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('google-drive-auth', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { returnUrl: window.location.href },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data.authUrl;
    },
    onSuccess: (authUrl) => {
      window.location.href = authUrl;
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao conectar Google Drive');
    },
  });

  // Disconnect Drive
  const disconnectDrive = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('google_drive_tokens')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Google Drive desconectado');
      queryClient.invalidateQueries({ queryKey: ['admin-google-drive-connection'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao desconectar');
    },
  });

  // Run backup
  const runBackup = useMutation({
    mutationFn: async (params: { month: string; companyId?: string }) => {
      const response = await supabase.functions.invoke('google-drive-backup', {
        body: { 
          userId: user?.id,
          month: params.month,
          companyId: params.companyId,
        },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Backup concluído! ${data?.backedUp || 0} conversas salvas.`);
      queryClient.invalidateQueries({ queryKey: ['admin-all-backups'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao fazer backup');
    },
  });

  // Delete backups
  const deleteBackups = useMutation({
    mutationFn: async (params: { 
      backupIds?: string[]; 
      deleteAll?: boolean; 
      month?: string;
      deleteFromDrive: boolean;
    }) => {
      const response = await supabase.functions.invoke('delete-backups', {
        body: { 
          userId: user?.id,
          ...params,
        },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`${data?.deleted || 0} backups excluídos com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['admin-all-backups'] });
      setSelectedBackups([]);
      setShowDeleteDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir backups');
    },
  });

  // Archive backups
  const archiveBackups = useMutation({
    mutationFn: async (params: { 
      backupIds?: string[]; 
      archiveAll?: boolean; 
      month?: string;
      archiveFolderName?: string;
    }) => {
      const response = await supabase.functions.invoke('archive-backups', {
        body: { 
          userId: user?.id,
          ...params,
        },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(
        `${data?.archived || 0} backups arquivados com sucesso!`,
        {
          action: {
            label: "Ver pasta",
            onClick: () => window.open(data.archiveFolderUrl, "_blank"),
          },
        }
      );
      setSelectedBackups([]);
      setShowArchiveDialog(false);
      setArchiveFolderName("");
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao arquivar backups');
    },
  });

  const isConnected = !!driveConnection;
  const isRunningBackup = runBackup.isPending;
  const isDeleting = deleteBackups.isPending;
  const isArchiving = archiveBackups.isPending;

  // Generate month options
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: date.toISOString().slice(0, 7),
      label: format(date, 'MMMM yyyy', { locale: ptBR }),
    };
  });

  // Get unique months from backups
  const uniqueMonths = [...new Set(allBackups?.map(b => b.backup_month) || [])].sort().reverse();

  // Filter backups
  const filteredBackups = allBackups?.filter(b => {
    const matchesSearch = 
      b.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.protocol_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = filterMonth === "all" || b.backup_month === filterMonth;
    return matchesSearch && matchesMonth;
  }) || [];

  // Handle select all
  const handleSelectAll = () => {
    if (selectedBackups.length === filteredBackups.length) {
      setSelectedBackups([]);
    } else {
      setSelectedBackups(filteredBackups.map(b => b.id));
    }
  };

  // Handle delete confirmation
  const handleDelete = () => {
    if (deleteType === "all") {
      deleteBackups.mutate({ deleteAll: true, deleteFromDrive });
    } else if (deleteType === "month" && filterMonth !== "all") {
      deleteBackups.mutate({ month: filterMonth, deleteFromDrive });
    } else {
      deleteBackups.mutate({ backupIds: selectedBackups, deleteFromDrive });
    }
  };

  // Handle archive confirmation
  const handleArchive = () => {
    const params: any = { archiveFolderName: archiveFolderName || undefined };
    
    if (archiveType === "all") {
      params.archiveAll = true;
    } else if (archiveType === "month" && filterMonth !== "all") {
      params.month = filterMonth;
    } else {
      params.backupIds = selectedBackups;
    }
    
    archiveBackups.mutate(params);
  };

  // Handle preview
  const handlePreview = (backup: BackupRecord) => {
    if (backup.drive_file_id) {
      // Use Google Drive embed viewer
      const embedUrl = `https://drive.google.com/file/d/${backup.drive_file_id}/preview`;
      setPreviewUrl(embedUrl);
      setPreviewFileName(backup.file_name);
      setShowPreviewDialog(true);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <HardDrive className="h-5 w-5 text-white" />
            </div>
            Armazenamento
          </h1>
          <p className="text-slate-400 mt-1">Gerenciamento centralizado do Google Drive MarketFlow</p>
        </div>
        <Button 
          onClick={() => queryClient.invalidateQueries()}
          variant="outline"
          className="border-white/10 text-slate-300 hover:text-white"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Drive Connection Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <Cloud className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-semibold text-white">Google Drive MarketFlow</h2>
                {loadingDrive ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : isConnected ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                ) : (
                  <Badge className="bg-slate-500/20 text-slate-400">
                    <XCircle className="h-3 w-3 mr-1" />
                    Desconectado
                  </Badge>
                )}
              </div>
              <p className="text-slate-400 text-sm">
                Armazenamento centralizado para backups de todas as empresas clientes.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!isConnected ? (
              <Button
                onClick={() => connectDrive.mutate()}
                disabled={connectDrive.isPending}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                {connectDrive.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Cloud className="h-4 w-4 mr-2" />
                )}
                Conectar Google Drive
              </Button>
            ) : (
              <>
                {driveConnection?.folder_id && (
                  <Button
                    variant="outline"
                    className="border-white/10 text-slate-300"
                    onClick={() => window.open(`https://drive.google.com/drive/folders/${driveConnection.folder_id}`, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir Drive
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => disconnectDrive.mutate()}
                  disabled={disconnectDrive.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Drive Storage Info */}
      {isConnected && driveStorage?.connected && (
        <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border-emerald-500/20 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
                <HardDrive className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Armazenamento do Google Drive</h3>
                <p className="text-sm text-slate-400">
                  {driveStorage.user?.email || 'Conta conectada'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchDriveStorage()}
              disabled={loadingDriveStorage}
              className="text-slate-400 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${loadingDriveStorage ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          {/* Storage Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">
                {formatBytes(driveStorage.storage?.usage || 0)} usados
              </span>
              <span className="text-slate-400">
                {formatBytes(driveStorage.storage?.limit || 0)} total
              </span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  getStoragePercent(driveStorage.storage?.usage, driveStorage.storage?.limit) > 90
                    ? 'bg-gradient-to-r from-red-500 to-red-400'
                    : getStoragePercent(driveStorage.storage?.usage, driveStorage.storage?.limit) > 75
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                    : 'bg-gradient-to-r from-emerald-500 to-blue-500'
                }`}
                style={{ 
                  width: `${getStoragePercent(driveStorage.storage?.usage, driveStorage.storage?.limit)}%` 
                }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-slate-500">
                {getStoragePercent(driveStorage.storage?.usage, driveStorage.storage?.limit).toFixed(1)}% utilizado
              </span>
              {driveStorage.storage?.usageInDriveTrash > 0 && (
                <span className="text-amber-400">
                  {formatBytes(driveStorage.storage.usageInDriveTrash)} na lixeira
                </span>
              )}
            </div>
          </div>

          {/* Storage Details Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-white/5">
              <p className="text-xs text-slate-400 mb-1">Uso Total</p>
              <p className="text-lg font-bold text-white">
                {formatBytes(driveStorage.storage?.usage || 0)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white/5">
              <p className="text-xs text-slate-400 mb-1">Uso no Drive</p>
              <p className="text-lg font-bold text-white">
                {formatBytes(driveStorage.storage?.usageInDrive || 0)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white/5">
              <p className="text-xs text-slate-400 mb-1">Pasta MarketFlow</p>
              <p className="text-lg font-bold text-white">
                {formatBytes(driveStorage.backupFolder?.size || 0)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white/5">
              <p className="text-xs text-slate-400 mb-1">Arquivos Backup</p>
              <p className="text-lg font-bold text-white">
                {driveStorage.backupFolder?.filesCount || 0}
              </p>
            </div>
          </div>

          {/* Warning if storage is high */}
          {getStoragePercent(driveStorage.storage?.usage, driveStorage.storage?.limit) > 80 && (
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-300">
                Seu armazenamento está acima de 80%. Considere arquivar ou excluir backups antigos.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Supabase Storage Info */}
      <Card className="p-6 bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 border-cyan-500/20 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Armazenamento Supabase MarketFlow</h3>
              <p className="text-sm text-slate-400">
                Storage do projeto principal
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchSupabaseStorage()}
            disabled={loadingSupabaseStorage}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loadingSupabaseStorage ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {loadingSupabaseStorage ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          </div>
        ) : supabaseStorage ? (
          <>
            {/* Storage Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">
                  {formatBytes(supabaseStorage.used)} usados
                </span>
                <span className="text-slate-400">
                  {formatBytes(supabaseStorage.limit)} total
                </span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    supabaseStorage.percentage > 90
                      ? 'bg-gradient-to-r from-red-500 to-red-400'
                      : supabaseStorage.percentage > 75
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                      : 'bg-gradient-to-r from-cyan-500 to-emerald-500'
                  }`}
                  style={{ width: `${supabaseStorage.percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-slate-500">
                  {supabaseStorage.percentage.toFixed(1)}% utilizado
                </span>
                <span className="text-slate-500">
                  {supabaseStorage.bucketsCount} buckets
                </span>
              </div>
            </div>

            {/* Buckets Details */}
            {supabaseStorage.buckets && supabaseStorage.buckets.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {supabaseStorage.buckets.map((bucket: { name: string; size: number; filesCount: number }) => (
                  <div key={bucket.name} className="p-3 rounded-lg bg-white/5">
                    <p className="text-xs text-slate-400 mb-1 truncate">{bucket.name}</p>
                    <p className="text-lg font-bold text-white">{formatBytes(bucket.size)}</p>
                    <p className="text-xs text-slate-500">{bucket.filesCount} arquivos</p>
                  </div>
                ))}
              </div>
            )}

            {/* Warning if storage is high */}
            {supabaseStorage.percentage > 80 && (
              <div className={`p-3 rounded-lg flex items-center gap-3 ${
                supabaseStorage.percentage > 90 
                  ? 'bg-red-500/10 border border-red-500/20' 
                  : 'bg-amber-500/10 border border-amber-500/20'
              }`}>
                <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${
                  supabaseStorage.percentage > 90 ? 'text-red-400' : 'text-amber-400'
                }`} />
                <div>
                  <p className={`text-sm font-medium ${
                    supabaseStorage.percentage > 90 ? 'text-red-300' : 'text-amber-300'
                  }`}>
                    {supabaseStorage.percentage > 90 
                      ? 'Armazenamento crítico! Considere fazer upgrade.' 
                      : 'Armazenamento acima de 80%. Monitore o uso.'}
                  </p>
                  <a 
                    href="https://supabase.com/dashboard/project/lvldqyyzhlygwbgcdqcg/settings/billing/usage" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:underline"
                  >
                    Ver detalhes no Supabase →
                  </a>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4 text-slate-400">
            Não foi possível carregar informações de storage
          </div>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5 bg-white/5 border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Storage Buckets</p>
              <p className="text-2xl font-bold text-white">{supabaseStorage?.bucketsCount || 0}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Database className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-white/5 border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Backups</p>
              <p className="text-2xl font-bold text-white">{allBackups?.length || 0}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <FileText className="h-6 w-6 text-emerald-400" />
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-white/5 border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Empresas</p>
              <p className="text-2xl font-bold text-white">{companies?.length || 0}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-amber-400" />
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-white/5 border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Status Drive</p>
              <p className="text-2xl font-bold text-white">
                {isConnected ? "Ativo" : "Inativo"}
              </p>
            </div>
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isConnected ? 'bg-emerald-500/20' : 'bg-slate-500/20'}`}>
              {isConnected ? (
                <CheckCircle className="h-6 w-6 text-emerald-400" />
              ) : (
                <XCircle className="h-6 w-6 text-slate-400" />
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Backup Section */}
      {isConnected && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Backup Manual</h2>
          <Card className="p-5 bg-white/5 border-white/10">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-white mb-1">Executar Backup</p>
                <p className="text-sm text-slate-400">
                  Faça backup das conversas para o Google Drive (PDF estilo WhatsApp)
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                    <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => runBackup.mutate({ month: selectedMonth })}
                  disabled={isRunningBackup}
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
                >
                  {isRunningBackup ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FolderSync className="h-4 w-4 mr-2" />
                  )}
                  {isRunningBackup ? 'Executando...' : 'Fazer Backup'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Backups History */}
      <div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-white">Histórico de Backups</h2>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by month */}
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white">
                <Filter className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Filtrar mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {uniqueMonths.map(month => (
                  <SelectItem key={month} value={month}>
                    {format(new Date(`${month}-01`), 'MMM yyyy', { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar backup..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {selectedBackups.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    onClick={() => {
                      setArchiveType("selected");
                      setShowArchiveDialog(true);
                    }}
                  >
                    <FolderArchive className="h-4 w-4 mr-2" />
                    Arquivar ({selectedBackups.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => {
                      setDeleteType("selected");
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir ({selectedBackups.length})
                  </Button>
                </>
              )}
              
              <Button
                variant="outline"
                size="sm"
                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                onClick={() => {
                  setArchiveType("all");
                  setShowArchiveDialog(true);
                }}
              >
                <FolderArchive className="h-4 w-4 mr-2" />
                Arquivar Todos
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={() => {
                  setDeleteType("all");
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Todos
              </Button>
            </div>
          </div>
        </div>

        <Card className="bg-white/5 border-white/10 overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-4 p-4 border-b border-white/10 bg-white/5">
            <Checkbox
              checked={selectedBackups.length === filteredBackups.length && filteredBackups.length > 0}
              onCheckedChange={handleSelectAll}
              className="border-white/20"
            />
            <span className="text-sm font-medium text-slate-400">
              {selectedBackups.length > 0 
                ? `${selectedBackups.length} selecionados` 
                : `${filteredBackups.length} backups`}
            </span>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="divide-y divide-white/5">
              {loadingBackups ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                </div>
              ) : filteredBackups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <FileText className="h-12 w-12 mb-3 text-slate-600" />
                  <p>Nenhum backup encontrado</p>
                  {!isConnected && (
                    <p className="text-sm mt-1">Conecte o Google Drive para começar</p>
                  )}
                </div>
              ) : (
                filteredBackups.map((backup) => (
                  <div 
                    key={backup.id}
                    className={`flex items-center gap-4 p-4 hover:bg-white/5 transition-colors ${
                      selectedBackups.includes(backup.id) ? 'bg-white/5' : ''
                    }`}
                  >
                    <Checkbox
                      checked={selectedBackups.includes(backup.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedBackups([...selectedBackups, backup.id]);
                        } else {
                          setSelectedBackups(selectedBackups.filter(id => id !== backup.id));
                        }
                      }}
                      className="border-white/20"
                    />
                    
                    <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-red-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{backup.file_name}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        {backup.protocol_number && (
                          <span className="text-emerald-400">#{backup.protocol_number}</span>
                        )}
                        <span>•</span>
                        <span>{format(new Date(backup.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs border-white/20 text-slate-400">
                          {format(new Date(`${backup.backup_month}-01`), 'MMM yyyy', { locale: ptBR })}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Preview button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-purple-400 hover:text-purple-300"
                        onClick={() => handlePreview(backup as BackupRecord)}
                        title="Visualizar PDF"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {backup.drive_file_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-400 hover:text-blue-300"
                          onClick={() => window.open(backup.drive_file_url!, "_blank")}
                          title="Abrir no Drive"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="mt-8 p-6 bg-slate-800/50 border-white/10">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
            <Settings className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">Armazenamento Centralizado</h3>
            <p className="text-slate-400 text-sm">
              O Google Drive da MarketFlow armazena todos os backups de conversas das empresas clientes.
              Os PDFs são gerados com estilo visual similar ao WhatsApp para fácil leitura.
            </p>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {deleteType === "all" 
                ? "Você está prestes a excluir TODOS os backups do sistema."
                : deleteType === "month"
                ? `Você está prestes a excluir todos os backups do mês ${filterMonth}.`
                : `Você está prestes a excluir ${selectedBackups.length} backup(s) selecionado(s).`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-center gap-3 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <Checkbox
                id="deleteFromDrive"
                checked={deleteFromDrive}
                onCheckedChange={(checked) => setDeleteFromDrive(checked as boolean)}
                className="border-amber-500/50"
              />
              <label htmlFor="deleteFromDrive" className="text-sm text-amber-300 cursor-pointer">
                Excluir também os arquivos do Google Drive
              </label>
            </div>
            
            {deleteFromDrive && (
              <p className="text-xs text-red-400 mt-2 px-4">
                ⚠️ Esta ação é irreversível. Os arquivos serão permanentemente excluídos do Drive.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="border-white/10 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FolderArchive className="h-5 w-5 text-purple-500" />
              Arquivar Backups
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {archiveType === "all" 
                ? "Os backups serão movidos para uma pasta de arquivo no Google Drive."
                : archiveType === "month"
                ? `Os backups do mês ${filterMonth} serão arquivados.`
                : `${selectedBackups.length} backup(s) serão arquivados.`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">
                Nome da pasta de arquivo (opcional)
              </label>
              <Input
                placeholder={`Arquivo - ${new Date().toISOString().slice(0, 7)}`}
                value={archiveFolderName}
                onChange={(e) => setArchiveFolderName(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-xs text-slate-500 mt-1">
                Se vazio, será criada uma pasta com o mês atual
              </p>
            </div>
            
            <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <p className="text-sm text-purple-300">
                📁 Os arquivos serão movidos para uma subpasta dentro da pasta principal do MarketFlow no Drive.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowArchiveDialog(false)}
              className="border-white/10 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleArchive}
              disabled={isArchiving}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isArchiving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FolderArchive className="h-4 w-4 mr-2" />
              )}
              {isArchiving ? 'Arquivando...' : 'Arquivar Backups'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="bg-slate-900 border-white/10 max-w-5xl h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-500" />
              {previewFileName}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 -mx-6 -mb-6">
            {previewUrl && (
              <iframe
                src={previewUrl}
                className="w-full h-full rounded-b-lg"
                style={{ height: 'calc(90vh - 80px)' }}
                allow="autoplay"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
