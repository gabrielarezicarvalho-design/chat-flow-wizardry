import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  HardDrive, Cloud, RefreshCw, Database, Loader2
} from "lucide-react";

export function AdminArmazenamento() {
  const [loading, setLoading] = useState(false);

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
          <p className="text-slate-400 mt-1">Gerenciamento de armazenamento (em desenvolvimento)</p>
        </div>
        <Button 
          variant="outline"
          className="border-white/10 text-slate-300 hover:text-white"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Cloud className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Google Drive</h2>
              <p className="text-slate-400 text-sm">Backup de conversas (configurar)</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/20">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Database className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Banco de Dados</h2>
              <p className="text-slate-400 text-sm">Lovable Cloud</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Placeholder Content */}
      <Card className="p-8 bg-white/5 border-white/10">
        <div className="text-center">
          <HardDrive className="h-12 w-12 mx-auto mb-4 text-slate-600" />
          <p className="text-lg font-medium text-slate-400">Módulo de armazenamento</p>
          <p className="text-sm text-slate-500 mt-1">
            Funcionalidades de backup e monitoramento serão configuradas posteriormente
          </p>
        </div>
      </Card>
    </div>
  );
}
