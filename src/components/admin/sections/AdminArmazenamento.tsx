import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  HardDrive, RefreshCw, Loader2, FileVideo, FileImage, FileText, Trash2, File
} from "lucide-react";
import { toast } from "sonner";

interface StorageFile {
  id: string;
  name: string;
  bucket_id: string;
  created_at: string;
  metadata: { size?: number; mimetype?: string } | null;
}

interface BucketInfo {
  name: string;
  fileCount: number;
  totalSize: number;
  files: StorageFile[];
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (mimetype?: string) => {
  if (!mimetype) return <File className="h-4 w-4 text-slate-400" />;
  if (mimetype.startsWith('video/')) return <FileVideo className="h-4 w-4 text-purple-400" />;
  if (mimetype.startsWith('image/')) return <FileImage className="h-4 w-4 text-blue-400" />;
  return <FileText className="h-4 w-4 text-emerald-400" />;
};

export function AdminArmazenamento() {
  const [loading, setLoading] = useState(true);
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const planLimit = 1024 * 1024 * 1024; // 1GB

  const fetchStorage = async () => {
    setLoading(true);
    try {
      const bucketNames = ['campaign-media', 'agent-documents'];
      const results: BucketInfo[] = [];

      for (const bucketName of bucketNames) {
        try {
          const { data: files, error } = await supabase.storage
            .from(bucketName)
            .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });

          if (error) {
            results.push({ name: bucketName, fileCount: 0, totalSize: 0, files: [] });
            continue;
          }

          const validFiles = (files || []).filter(f => f.name && f.id);
          let size = 0;
          for (const f of validFiles) {
            if (f.metadata?.size) size += f.metadata.size;
          }

          results.push({
            name: bucketName,
            fileCount: validFiles.length,
            totalSize: size,
            files: validFiles.map(f => ({
              id: f.id || f.name,
              name: f.name,
              bucket_id: bucketName,
              created_at: f.created_at || '',
              metadata: f.metadata as any,
            })),
          });
        } catch {
          results.push({ name: bucketName, fileCount: 0, totalSize: 0, files: [] });
        }
      }

      setBuckets(results);
      setTotalSize(results.reduce((a, b) => a + b.totalSize, 0));
      setTotalFiles(results.reduce((a, b) => a + b.fileCount, 0));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStorage(); }, []);

  const handleDelete = async (bucketName: string, fileName: string) => {
    if (!confirm(`Excluir "${fileName}"?`)) return;
    setDeleting(fileName);
    try {
      const { error } = await supabase.storage.from(bucketName).remove([fileName]);
      if (error) throw error;
      toast.success('Arquivo excluído');
      fetchStorage();
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const usagePercent = planLimit > 0 ? (totalSize / planLimit) * 100 : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <HardDrive className="h-5 w-5 text-white" />
            </div>
            Armazenamento
          </h1>
          <p className="text-muted-foreground mt-1">Gerenciamento de arquivos e storage</p>
        </div>
        <Button variant="outline" onClick={fetchStorage} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Atualizar
        </Button>
      </div>

      {/* Usage Overview */}
      <Card className="p-6 border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">Uso total</span>
          <span className="text-sm text-muted-foreground">{formatBytes(totalSize)} / {formatBytes(planLimit)}</span>
        </div>
        <Progress value={Math.min(usagePercent, 100)} className="h-3" />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{totalFiles} arquivos</span>
          <span>{usagePercent.toFixed(1)}% utilizado</span>
        </div>
      </Card>

      {/* Buckets */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        buckets.map((bucket) => (
          <Card key={bucket.name} className="p-6 border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{bucket.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {bucket.fileCount} arquivos · {formatBytes(bucket.totalSize)}
                </p>
              </div>
            </div>

            {bucket.files.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum arquivo</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {bucket.files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {getFileIcon(file.metadata?.mimetype)}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.metadata?.size ? formatBytes(file.metadata.size) : '—'}
                          {file.created_at && ` · ${new Date(file.created_at).toLocaleDateString('pt-BR')}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={() => handleDelete(bucket.name, file.name)}
                      disabled={deleting === file.name}
                    >
                      {deleting === file.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
