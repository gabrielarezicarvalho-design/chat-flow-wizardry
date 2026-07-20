import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  HardDrive, RefreshCw, Loader2, FileVideo, FileImage, FileText, Trash2, File
} from "lucide-react";
import { toast } from "sonner";
import { listVpsFiles, deleteVpsFile, VpsFileInfo } from "@/lib/cloud-storage";

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (mimetype?: string) => {
  if (!mimetype) return <File className="h-4 w-4 text-muted-foreground" />;
  if (mimetype.startsWith('video/')) return <FileVideo className="h-4 w-4 text-muted-foreground" />;
  if (mimetype.startsWith('image/')) return <FileImage className="h-4 w-4 text-muted-foreground" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
};

export function AdminArmazenamento() {
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<VpsFileInfo[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const planLimit = 9 * 1024 * 1024 * 1024; // 9GB (VPS default)

  const fetchStorage = async () => {
    setLoading(true);
    try {
      const result = await listVpsFiles();
      if (result.success) {
        setFiles(result.files);
        setTotalSize(result.files.reduce((a, b) => a + (b.size || 0), 0));
      } else {
        toast.error(result.error || 'Erro ao carregar arquivos');
        setFiles([]);
        setTotalSize(0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStorage(); }, []);

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Excluir "${fileName}"?`)) return;
    setDeleting(fileName);
    try {
      const result = await deleteVpsFile(fileName);
      if (!result.success) throw new Error(result.error);
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <HardDrive className="h-5 w-5 text-primary-foreground" />
            </div>
            Armazenamento (VPS)
          </h1>
          <p className="text-muted-foreground mt-1">Gerenciamento de arquivos no servidor</p>
        </div>
        <Button variant="outline" onClick={fetchStorage} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Atualizar
        </Button>
      </div>

      <Card className="p-6 border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">Uso total (VPS)</span>
          <span className="text-sm text-muted-foreground">{formatBytes(totalSize)} / {formatBytes(planLimit)}</span>
        </div>
        <Progress value={Math.min(usagePercent, 100)} className="h-3" />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{files.length} arquivos</span>
          <span>{usagePercent.toFixed(1)}% utilizado</span>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="p-6 border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Arquivos</h3>
              <p className="text-sm text-muted-foreground">
                {files.length} arquivos · {formatBytes(totalSize)}
              </p>
            </div>
          </div>

          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum arquivo</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {files.map((file) => (
                <div key={file.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    {getFileIcon(file.mimetype)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.size ? formatBytes(file.size) : '—'}
                        {file.createdAt && ` · ${new Date(file.createdAt).toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => handleDelete(file.name)}
                    disabled={deleting === file.name}
                  >
                    {deleting === file.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
