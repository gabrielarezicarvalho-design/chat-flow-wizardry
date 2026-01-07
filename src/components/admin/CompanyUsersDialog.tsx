import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Users, Trash2, Key, Loader2, UserPlus, Shield, User, 
  RefreshCw, Eye, EyeOff, Check, X
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CompanyUser {
  id: string;
  username: string | null;
  full_name: string | null;
  is_company_admin: boolean;
  is_online: boolean;
  last_seen_at: string | null;
  created_at: string | null;
  role?: string;
}

interface CompanyUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
}

export function CompanyUsersDialog({ open, onOpenChange, companyId, companyName }: CompanyUsersDialogProps) {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<CompanyUser | null>(null);
  
  // Password change state
  const [changingPasswordUserId, setChangingPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  
  // New user state
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: "",
    full_name: "",
    password: "",
    is_company_admin: false
  });
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    if (open && companyId) {
      fetchUsers();
    }
  }, [open, companyId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch users for this company
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, is_company_admin, is_online, last_seen_at, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch roles for these users
      const userIds = profiles?.map(p => p.id) || [];
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const rolesMap = (roles || []).reduce((acc, r) => {
        acc[r.user_id] = r.role;
        return acc;
      }, {} as Record<string, string>);

      const usersWithRoles = (profiles || []).map(p => ({
        ...p,
        role: rolesMap[p.id] || 'user'
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setDeletingUserId(userToDelete.id);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: userToDelete.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Usuário excluído com sucesso!");
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Erro ao excluir usuário");
    } finally {
      setDeletingUserId(null);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const handleChangePassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setSavingPassword(true);
    try {
      // Get user info
      const user = users.find(u => u.id === userId);
      if (!user) throw new Error("Usuário não encontrado");

      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          username: user.username,
          full_name: user.full_name,
          password: newPassword,
          company_id: companyId,
          role: user.role || 'user'
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Senha alterada com sucesso!");
      setChangingPasswordUserId(null);
      setNewPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserForm.username || !newUserForm.full_name || !newUserForm.password) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (newUserForm.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setCreatingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          username: newUserForm.username,
          full_name: newUserForm.full_name,
          password: newUserForm.password,
          company_id: companyId,
          role: newUserForm.is_company_admin ? 'admin' : 'user',
          is_company_admin: newUserForm.is_company_admin
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Usuário criado com sucesso!");
      setShowNewUserForm(false);
      setNewUserForm({ username: "", full_name: "", password: "", is_company_admin: false });
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Erro ao criar usuário");
    } finally {
      setCreatingUser(false);
    }
  };

  const getRoleBadge = (user: CompanyUser) => {
    if (user.is_company_admin) {
      return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Admin</Badge>;
    }
    if (user.role === 'admin') {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Super Admin</Badge>;
    }
    return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Usuário</Badge>;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              Usuários - {companyName}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-400">
              {users.length} usuário(s) cadastrado(s)
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={fetchUsers}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                size="sm"
                onClick={() => setShowNewUserForm(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </div>
          </div>

          {/* New User Form */}
          {showNewUserForm && (
            <div className="bg-slate-800/50 rounded-lg p-4 mb-4 space-y-4 border border-emerald-500/30">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-emerald-400">Novo Usuário</h4>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowNewUserForm(false)}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input
                    placeholder="João Silva"
                    value={newUserForm.full_name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Usuário (login) *</Label>
                  <Input
                    placeholder="joao.silva"
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Senha *</Label>
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    variant={newUserForm.is_company_admin ? "default" : "outline"}
                    onClick={() => setNewUserForm({ ...newUserForm, is_company_admin: !newUserForm.is_company_admin })}
                    className={newUserForm.is_company_admin ? "bg-purple-600" : "border-white/10"}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Admin da Empresa
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowNewUserForm(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={creatingUser}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {creatingUser ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Criar Usuário
                </Button>
              </div>
            </div>
          )}

          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum usuário cadastrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="bg-slate-800/50 rounded-lg p-4 border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          user.is_company_admin ? 'bg-purple-500/20' : 'bg-slate-700'
                        }`}>
                          {user.is_company_admin ? (
                            <Shield className="h-5 w-5 text-purple-400" />
                          ) : (
                            <User className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.full_name || 'Sem nome'}</span>
                            {getRoleBadge(user)}
                            {user.is_online && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            )}
                          </div>
                          <div className="text-sm text-slate-400">
                            @{user.username || 'sem-usuario'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {changingPasswordUserId === user.id ? (
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Nova senha"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="bg-white/5 border-white/10 w-40 pr-8"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-2"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleChangePassword(user.id)}
                              disabled={savingPassword}
                              className="text-emerald-400 hover:text-emerald-300"
                            >
                              {savingPassword ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setChangingPasswordUserId(null);
                                setNewPassword("");
                              }}
                              className="text-slate-400 hover:text-white"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setChangingPasswordUserId(user.id)}
                              className="text-amber-400 hover:text-amber-300"
                              title="Alterar senha"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setUserToDelete(user);
                                setShowDeleteConfirm(true);
                              }}
                              disabled={deletingUserId === user.id}
                              className="text-red-400 hover:text-red-300"
                              title="Excluir usuário"
                            >
                              {deletingUserId === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {user.created_at && (
                      <div className="mt-2 text-xs text-slate-500">
                        Criado em: {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-slate-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja excluir o usuário{" "}
              <span className="font-medium text-white">{userToDelete?.full_name}</span>?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-white/10 text-white hover:bg-slate-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingUserId ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}