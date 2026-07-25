import { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, ExternalLink, Trash2, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UazapiInstance {
  id: string;
  name: string;
  status: string;
  token?: string;
}

interface SyncReport {
  summary: {
    totalUazapi: number;
    totalDb: number;
    synced: number;
    onlyInUazapi: number;
    onlyInDb: number;
  };
  onlyInUazapi: UazapiInstance[];
  onlyInDb: any[];
  synced: any[];
}

export const OrphanedInstancesAlert = () => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const fetchSyncReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wa-list-instances', {
        body: { environment: 'PROD' }
      });

      if (error) throw error;

      if (data?.success) {
        setReport(data);
        setLastCheck(new Date());
        
        if (data.summary.onlyInUazapi > 0) {
          toast.warning(`⚠️ Encontradas ${data.summary.onlyInUazapi} instância(s) órfã(s) no servidor Evolution`);
        } else {
          toast.success("✅ Todas as instâncias estão sincronizadas!");
        }
      }
    } catch (err: any) {
      console.error("Error fetching sync report:", err);
      toast.error("Erro ao verificar sincronização");
    } finally {
      setLoading(false);
    }
  };

  // Auto-check on mount
  useEffect(() => {
    fetchSyncReport();
  }, []);

  const hasOrphans = report && report.summary.onlyInUazapi > 0;

  if (!report && !loading) {
    return null;
  }

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Sincronização Evolution
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSyncReport}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Verificar</span>
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading && !report ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando sincronização...
          </div>
        ) : report ? (
          <div className="space-y-4">
            {/* Summary badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                {report.summary.synced} sincronizadas
              </Badge>
              {report.summary.onlyInUazapi > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {report.summary.onlyInUazapi} órfãs no servidor
                </Badge>
              )}
              {report.summary.onlyInDb > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {report.summary.onlyInDb} apenas no banco
                </Badge>
              )}
            </div>

            {/* Orphaned instances warning */}
            {hasOrphans && (
              <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <Alert variant="destructive" className="border-destructive/50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    <span>Instâncias órfãs detectadas</span>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        {isOpen ? "Ocultar" : "Ver detalhes"}
                      </Button>
                    </CollapsibleTrigger>
                  </AlertTitle>
                  <AlertDescription className="mt-2">
                    <p className="text-sm">
                      Existem <strong>{report.summary.onlyInUazapi} instância(s)</strong> ativas no servidor Evolution 
                      que não estão cadastradas no sistema. Essas instâncias consomem seu limite e precisam 
                      ser removidas manualmente.
                    </p>
                    
                    <CollapsibleContent className="mt-4 space-y-4">
                      {/* List of orphaned instances */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Instâncias para remover:</p>
                        <div className="rounded-md border border-destructive/30 bg-background/50 p-3">
                          {report.onlyInUazapi.map((instance) => (
                            <div 
                              key={instance.id} 
                              className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                            >
                              <div>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {instance.name || instance.id}
                                </code>
                                <span className="ml-2 text-xs text-muted-foreground">
                                  Status: {instance.status || 'desconhecido'}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-destructive">
                                <Trash2 className="h-3 w-3 mr-1" />
                                Remover
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" />
                          Como remover instâncias órfãs:
                        </p>
                        <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                          <li>
                            Acesse o painel de administração Evolution:
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 ml-1"
                              onClick={() => window.open('https://marketflowchat.uazapi.com', '_blank')}
                            >
                              marketflowchat.uazapi.com
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </li>
                          <li>Faça login com suas credenciais de administrador</li>
                          <li>Navegue até a seção de <strong>Instâncias</strong></li>
                          <li>
                            Localize as instâncias listadas acima e clique em <strong>Excluir</strong>
                          </li>
                          <li>Após remover, clique em "Verificar" acima para confirmar</li>
                        </ol>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertTriangle className="h-3 w-3" />
                        <span>
                          A API Evolution não suporta exclusão programática. A remoção deve ser feita manualmente.
                        </span>
                      </div>
                    </CollapsibleContent>
                  </AlertDescription>
                </Alert>
              </Collapsible>
            )}

            {/* All synced message */}
            {!hasOrphans && report.summary.onlyInDb === 0 && (
              <Alert className="border-green-500/50 bg-green-500/5">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>Tudo sincronizado!</AlertTitle>
                <AlertDescription>
                  Todas as instâncias do servidor Evolution estão corretamente cadastradas no sistema.
                </AlertDescription>
              </Alert>
            )}

            {/* Last check time */}
            {lastCheck && (
              <p className="text-xs text-muted-foreground">
                Última verificação: {lastCheck.toLocaleTimeString('pt-BR')}
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
