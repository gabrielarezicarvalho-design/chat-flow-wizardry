import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug, Lightbulb, MessageSquare, CheckCircle2 } from "lucide-react";

const AdminFeedback = () => {
  // Placeholder data - table needs to be created
  const stats = {
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Feedbacks dos Usuários</h2>
        <p className="text-muted-foreground">Gerencie bugs e sugestões de melhorias</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4 border-yellow-500/30">
          <p className="text-sm text-yellow-500">Pendentes</p>
          <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
        </Card>
        <Card className="p-4 border-blue-500/30">
          <p className="text-sm text-blue-500">Em Análise</p>
          <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
        </Card>
        <Card className="p-4 border-green-500/30">
          <p className="text-sm text-green-500">Resolvidos</p>
          <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
        </Card>
      </div>

      {/* Info */}
      <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-amber-400" />
        <h3 className="text-lg font-medium text-white mb-2">Módulo de Feedback</h3>
        <p className="text-slate-400 text-sm">
          Para gerenciar feedbacks, será necessário criar a tabela feedback_reports no banco de dados.
        </p>
      </div>
    </div>
  );
};

export default AdminFeedback;
