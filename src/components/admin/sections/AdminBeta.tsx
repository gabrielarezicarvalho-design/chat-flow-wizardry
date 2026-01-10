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
  company_id: string | null;
  created_at: string | null;
}

export function AdminBeta() {
  const [users, setUsers] = useState<BetaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchBetaUsers();
  }, []);

  const fetchBetaUsers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, company_id, created_at")
        .order("created_at", { ascending: false });

      setUsers(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Beta Control</h1>
        <p className="text-slate-400">Gerenciamento de usuários beta</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">{users.length}</p>
              <p className="text-xs text-slate-400">Total de Usuários</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold text-white">{users.filter(u => u.company_id).length}</p>
              <p className="text-xs text-slate-400">Com Empresa</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-white">{users.filter(u => !u.company_id).length}</p>
              <p className="text-xs text-slate-400">Sem Empresa</p>
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
          Visualize todos os usuários cadastrados no sistema.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar usuário..."
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
            Nenhum usuário encontrado
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-300">Usuário</th>
                <th className="text-left p-4 text-sm font-medium text-slate-300">Status</th>
                <th className="text-left p-4 text-sm font-medium text-slate-300">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-white">{user.full_name || "Sem nome"}</p>
                  </td>
                  <td className="p-4">
                    {user.company_id ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400">Com Empresa</Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-400">Sem Empresa</Badge>
                    )}
                  </td>
                  <td className="p-4 text-sm text-slate-400">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
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
