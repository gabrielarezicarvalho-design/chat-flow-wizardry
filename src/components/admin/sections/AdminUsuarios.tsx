import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Users, Plus, Trash2, Search, Shield, UserCog, Eye, EyeOff, RefreshCw, Clock, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InternalUser {
  id: string;
  full_name: string | null;
  username: string | null;
  created_at: string | null;
  is_online: boolean | null;
  last_seen_at: string | null;
  role: string;
}

export function AdminUsuarios() {
  const [adminUsers, setAdminUsers] = useState<InternalUser[]>([]);
  const [moderatorUsers, setModeratorUsers] = useState<InternalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    full_name: "",
    role: "moderator" as "admin" | "moderator"
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Get profiles and their roles - only internal users (no company_id)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, username, created_at, is_online, last_seen_at, company_id")
        .is("company_id", null)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      
      const usersWithRoles = (profiles || []).map(p => ({
        ...p,
        role: roleMap.get(p.id) || "user"
      }));

      // Separate admin and moderator users
      setAdminUsers(usersWithRoles.filter(u => u.role === "admin"));
      setModeratorUsers(usersWithRoles.filter(u => u.role === "moderator"));
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.username || !form.password || !form.full_name) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          username: form.username,
          password: form.password,
          full_name: form.full_name,
          role: form.role
        }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success("Usuário criado com sucesso!");
      setShowDialog(false);
      setForm({ username: "", password: "", full_name: "", role: "moderator" });
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar usuário");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Tem certeza? Esta ação não pode ser desfeita.")) return;
    
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: userId }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success("Usuário excluído!");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir");
    }
  };

  const handleUpdateRole = async (userId: string, newRole: "admin" | "moderator" | "user" | "agent") => {
    try {
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("user_id", userId);
      } else {
        await supabase
          .from("user_roles")
          .insert([{ user_id: userId, role: newRole }]);
      }
      
      toast.success("Permissão atualizada!");
      fetchUsers();
    } catch (error) {
      toast.error("Erro ao atualizar permissão");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500/20 text-red-400">Admin Master</Badge>;
      case "moderator":
        return <Badge className="bg-purple-500/20 text-purple-400">Admin Next Pro</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400">{role}</Badge>;
    }
  };

  const filteredAdmins = adminUsers.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredModerators = moderatorUsers.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderUserCard = (user: InternalUser) => (
    <div 
      key={user.id} 
      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-medium ${
          user.role === "admin" ? "bg-red-500/20 text-red-400" : "bg-purple-500/20 text-purple-400"
        }`}>
          {user.full_name?.charAt(0) || "?"}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-white">{user.full_name || "Sem nome"}</p>
            <div className={`h-2 w-2 rounded-full ${user.is_online ? "bg-emerald-500" : "bg-slate-500"}`} />
          </div>
          <p className="text-sm text-slate-400">{user.username || "—"}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {getRoleBadge(user.role)}
        
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock className="h-3 w-3" />
          {user.created_at ? format(new Date(user.created_at), "dd/MM/yy", { locale: ptBR }) : "—"}
        </div>

        <Select 
          value={user.role} 
          onValueChange={(v) => handleUpdateRole(user.id, v as "admin" | "moderator" | "user" | "agent")}
        >
          <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin Master</SelectItem>
            <SelectItem value="moderator">Admin Next Pro</SelectItem>
          </SelectContent>
        </Select>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => handleDelete(user.id)}
          className="text-red-400 hover:text-red-300 h-8 w-8"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuários Internos</h1>
          <p className="text-slate-400">Equipe Next Pro (Admins e Moderadores)</p>
        </div>
        <Button 
          onClick={() => setShowDialog(true)}
          className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário Interno
        </Button>
      </div>

      {/* Role Legend */}
      <div className="flex gap-6 mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-red-400" />
          <span className="text-sm text-slate-300">Admin Master</span>
          <span className="text-xs text-slate-500">= Controle absoluto</span>
        </div>
        <div className="flex items-center gap-2">
          <UserCog className="h-4 w-4 text-purple-400" />
          <span className="text-sm text-slate-300">Admin Next Pro</span>
          <span className="text-xs text-slate-500">= Suporte e onboarding</span>
        </div>
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

      {loading ? (
        <div className="p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-500" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Admin Master Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-red-400" />
              <h2 className="text-lg font-semibold text-white">Admin Master</h2>
              <Badge className="bg-red-500/20 text-red-400">{filteredAdmins.length}</Badge>
            </div>
            <div className="space-y-3">
              {filteredAdmins.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-white/5 rounded-xl border border-white/10">
                  Nenhum Admin Master encontrado
                </div>
              ) : (
                filteredAdmins.map(renderUserCard)
              )}
            </div>
          </div>

          {/* Admin Next Pro Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <UserCog className="h-5 w-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Admin Next Pro</h2>
              <Badge className="bg-purple-500/20 text-purple-400">{filteredModerators.length}</Badge>
            </div>
            <div className="space-y-3">
              {filteredModerators.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-white/5 rounded-xl border border-white/10">
                  Nenhum Admin Next Pro encontrado
                </div>
              ) : (
                filteredModerators.map(renderUserCard)
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Novo Usuário Interno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Email (Username) *</Label>
              <Input
                type="email"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="usuario@nextpro.com.br"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Senha *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="bg-white/5 border-white/10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Acesso *</Label>
              <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin Master (Controle total)</SelectItem>
                  <SelectItem value="moderator">Admin Next Pro (Suporte)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button 
              onClick={handleCreate} 
              className="bg-emerald-500 hover:bg-emerald-600"
              disabled={saving || !form.username || !form.password || !form.full_name}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
