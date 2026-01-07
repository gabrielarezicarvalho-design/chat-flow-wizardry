import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FlaskConical, Users, CheckCircle, XCircle, Clock, Search, RefreshCw, MessageSquare
} from "lucide-react";

interface BetaUser {
  id: string;
  full_name: string | null;
  company_name: string | null;
  created_at: string | null;
  status: "approved" | "pending" | "rejected";
}

export function AdminBeta() {
  const [users, setUsers] = useState<BetaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0
  });

  useEffect(() => {
    fetchBetaUsers();
  }, []);

  const fetchBetaUsers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, created_at, status")
        .order("created_at", { ascending: false });

      const betaUsers = (data || []).map(u => ({
        ...u,
        status: (u.status as "approved" | "pending" | "rejected") || "pending"
      }));

      setUsers(betaUsers);
      setStats({
        total: betaUsers.length,
        approved: betaUsers.filter(u => u.status === "approved").length,
        pending: betaUsers.filter(u => u.status === "pending").length,
        rejected: betaUsers.filter(u => u.status === "rejected").length
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (userId: string, status: string) => {
    try {
      await supabase
        .from("profiles")
        .update({ status })
        .eq("id", userId);
      fetchBetaUsers();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-500/20 text-emerald-400">Aprovado</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-400">Rejeitado</Badge>;
      default:
        return <Badge className="bg-amber-500/20 text-amber-400">Aguardando</Badge>;
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Beta Control</h1>
        <p className="text-slate-400">Gerenciamento de usuários beta</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-slate-400">Total de Betas</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.approved}</p>
              <p className="text-xs text-slate-400">Aprovados</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.pending}</p>
              <p className="text-xs text-slate-400">Aguardando</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/20">
          <div className="flex items-center gap-3">
            <XCircle className="h-8 w-8 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.rejected}</p>
              <p className="text-xs text-slate-400">Rejeitados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Beta Info */}
      <div className="p-6 rounded-xl bg-purple-500/10 border border-purple-500/20 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical className="h-5 w-5 text-purple-400" />
          <h2 className="font-semibold text-white">Programa Beta</h2>
        </div>
        <p className="text-sm text-slate-300 mb-4">
          Gerencie o acesso antecipado de usuários beta. Aprove, rejeite ou mantenha em espera 
          conforme a capacidade do sistema.
        </p>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-slate-400" />
            <span className="text-slate-400">Limite atual: 100 empresas</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar usuário beta..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white max-w-md"
        />
      </div>

      {/* Users List */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-500" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Nenhum usuário beta encontrado
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-300">Usuário</th>
                <th className="text-left p-4 text-sm font-medium text-slate-300">Empresa</th>
                <th className="text-left p-4 text-sm font-medium text-slate-300">Status</th>
                <th className="text-right p-4 text-sm font-medium text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-white">{user.full_name || "Sem nome"}</p>
                  </td>
                  <td className="p-4">
                    <span className="text-slate-300">{user.company_name || "—"}</span>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      {user.status !== "approved" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateStatus(user.id, "approved")}
                          className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        >
                          Aprovar
                        </Button>
                      )}
                      {user.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateStatus(user.id, "rejected")}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          Rejeitar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
