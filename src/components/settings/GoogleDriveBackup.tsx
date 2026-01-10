import { useState } from 'react';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CloudIcon, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  FolderSync,
  ExternalLink,
  Calendar,
  FileText,
  HardDrive
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function GoogleDriveBackup() {
  const { 
    driveConnection, 
    isConnected, 
    isLoading, 
    backups,
    loadingBackups,
    connectDrive, 
    disconnectDrive,
    runBackup 
  } = useGoogleDrive();

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Generate last 12 months options
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: date.toISOString().slice(0, 7),
      label: format(date, 'MMMM yyyy', { locale: ptBR }),
    };
  });

  const isRunningBackup = runBackup.isPending;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <HardDrive className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Backup Google Drive
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : isConnected ? (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Conectado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    <XCircle className="w-3 h-3 mr-1" />
                    Desconectado
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Backup automático das conversas em PDF no Google Drive
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <CloudIcon className="w-16 h-16 text-muted-foreground/30" />
            <p className="text-muted-foreground text-center max-w-md">
              Conecte sua conta do Google Drive para ativar o backup automático de conversas.
              Os backups são feitos automaticamente no último dia de cada mês.
            </p>
            <Button 
              onClick={() => connectDrive.mutate()} 
              disabled={connectDrive.isPending}
              className="gap-2"
            >
              {connectDrive.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CloudIcon className="w-4 h-4" />
              )}
              Conectar Google Drive
            </Button>
          </div>
        ) : (
          <>
            {/* Manual Backup */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex-1">
                <h4 className="font-medium mb-1">Backup Manual</h4>
                <p className="text-sm text-muted-foreground">
                  Execute um backup das conversas de um mês específico
                </p>
              </div>
              <div className="flex gap-2">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px]">
                    <Calendar className="w-4 h-4 mr-2" />
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
                  className="gap-2"
                >
                  {isRunningBackup ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FolderSync className="w-4 h-4" />
                  )}
                  {isRunningBackup ? 'Salvando...' : 'Fazer Backup'}
                </Button>
              </div>
            </div>

            {/* Test Backup */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-green-500/5 rounded-lg border border-green-500/20">
              <div className="flex-1">
                <h4 className="font-medium mb-1 text-green-600">Backup de Teste</h4>
                <p className="text-sm text-muted-foreground">
                  Gere um PDF de exemplo para testar a conexão com o Google Drive
                </p>
              </div>
              <Button 
                onClick={() => runBackup.mutate({ testMode: true })}
                disabled={isRunningBackup}
                variant="outline"
                className="gap-2 border-green-500/30 text-green-600 hover:bg-green-500/10"
              >
                {isRunningBackup ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Testar Backup
              </Button>
            </div>

            {/* Backup Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="text-2xl font-bold">{backups?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Backups realizados</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="text-2xl font-bold">0</div>
                <div className="text-sm text-muted-foreground">Este mês</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="text-2xl font-bold text-green-500">Ativo</div>
                <div className="text-sm text-muted-foreground">Backup automático</div>
              </div>
            </div>

            {/* Recent Backups */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Backups Recentes
              </h4>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {loadingBackups ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : backups?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum backup realizado ainda
                    </div>
                  ) : (
                    backups?.slice(0, 20).map((backup: any) => (
                      <div 
                        key={backup.id}
                        className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-red-500" />
                          <div>
                            <p className="text-sm font-medium">{backup.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {backup.protocol_number && `Protocolo: ${backup.protocol_number} • `}
                              {format(new Date(backup.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        {backup.drive_file_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a href={backup.drive_file_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Disconnect */}
            <div className="pt-4 border-t border-border/50">
              <Button 
                variant="outline" 
                onClick={() => disconnectDrive.mutate()}
                disabled={disconnectDrive.isPending}
                className="text-destructive hover:text-destructive"
              >
                {disconnectDrive.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Desconectar Google Drive
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
