import { Fragment, useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDepartments } from "@/hooks/useDepartments";
import { useConnections } from "@/hooks/useConnections";
import { useAllUserPermissions, defaultPermissions, type UserPermissions } from "@/hooks/useUserPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  EyeOff, 
  Calendar,
  LogOut,
  Search,
  Users as UsersIcon,
  UserCheck,
  UserX,
  ChevronRight,
  ChevronDown,
  Circle
} from "lucide-react";
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

interface UserWithRole {
  id: string;
  full_name: string | null;
  username: string | null;
  created_at: string | null;
  is_online: boolean | null;
  company_id: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_company_admin: boolean | null;
  role?: string;
}

interface UserAssignment {
  user_id: string;
  department_id?: string;
  connection_id?: string;
}

interface CurrentUserProfile {
  company_id: string | null;
}

const emptyPermissionsByUser: Record<string, UserPermissions> = {};
const emptyAssignments: UserAssignment[] = [];

export default function Users() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { connections } = useConnections();
  const { departments } = useDepartments();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userDepartments, setUserDepartments] = useState<Record<string, string[]>>({});
  const [userConnections, setUserConnections] = useState<Record<string, string[]>>({});
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    full_name: "",
    role: "agent" as "admin" | "agent",
    permissions: { ...defaultPermissions } as UserPermissions,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    start: "08:00",
    end: "18:00",
    days: [1, 2, 3, 4, 5] as number[],
  });

  // Get current user's profile to get their company_id
  const { data: currentUserProfile } = useQuery({
    queryKey: ["current-user-profile", user?.id],
    queryFn: async (): Promise<CurrentUserProfile | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch company data with limits
  const { data: companyData } = useQuery({
    queryKey: ["company-limits", currentUserProfile?.company_id],
    queryFn: async () => {
      if (!currentUserProfile?.company_id) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, max_users, max_connections")
        .eq("id", currentUserProfile.company_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentUserProfile?.company_id,
  });

  // Fetch all profiles with roles - filtered by company
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["users-with-roles", currentUserProfile?.company_id],
    queryFn: async () => {
      if (!currentUserProfile?.company_id) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("company_id", currentUserProfile.company_id)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const filteredProfiles = (profiles || []).filter(profile => {
        const isMainAdmin = profile.username === null && profile.full_name?.includes('MarketFlow');
        return !isMainAdmin;
      });

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);

      return filteredProfiles.map((profile) => ({
        ...profile,
        role: roleMap.get(profile.id) || "user",
      })) as UserWithRole[];
    },
    enabled: !!currentUserProfile?.company_id,
  });

  // Fetch permissions from database for all users
  const userIds = useMemo(() => users.map(u => u.id), [users]);
  const { data: allPermissionsData } = useAllUserPermissions(userIds);
  const allPermissions = allPermissionsData ?? emptyPermissionsByUser;

  // Local state for optimistic permission updates
  const [localPermissions, setLocalPermissions] = useState<Record<string, UserPermissions>>({});

  // Sync from DB whenever allPermissions changes
  useEffect(() => {
    setLocalPermissions(allPermissions);
  }, [allPermissions]);

  // Get permissions for a user (local override or DB or default)
  const getPerms = (userId: string): UserPermissions => {
    return localPermissions[userId] || allPermissions[userId] || defaultPermissions;
  };

  // Fetch department members for all users
  const { data: departmentMembersQueryData } = useQuery({
    queryKey: ["department-members-all"],
    queryFn: async (): Promise<UserAssignment[]> => {
      const { data, error } = await supabase
        .from("department_members")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });
  const departmentMembersData = departmentMembersQueryData ?? emptyAssignments;

  // Fetch user connections assignments
  const { data: userConnectionsQueryData } = useQuery({
    queryKey: ["user-connections-assignments"],
    queryFn: async (): Promise<UserAssignment[]> => {
      const { data, error } = await supabase
        .from("user_connections")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });
  const userConnectionsData = userConnectionsQueryData ?? emptyAssignments;

  useEffect(() => {
    const connectionsMap: Record<string, string[]> = {};
    userConnectionsData.forEach((uc) => {
      if (!uc.connection_id) return;
      if (!connectionsMap[uc.user_id]) connectionsMap[uc.user_id] = [];
      connectionsMap[uc.user_id].push(uc.connection_id);
    });
    setUserConnections(connectionsMap);
  }, [userConnectionsData]);

  useEffect(() => {
    const departmentsMap: Record<string, string[]> = {};
    departmentMembersData.forEach((dm) => {
      if (!dm.department_id) return;
      if (!departmentsMap[dm.user_id]) departmentsMap[dm.user_id] = [];
      departmentsMap[dm.user_id].push(dm.department_id);
    });
    setUserDepartments(departmentsMap);
  }, [departmentMembersData]);

  // Real-time subscription for profiles + user_roles changes
  useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      refetch();
    };
    const channel = supabase
      .channel('users-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, invalidate)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch, queryClient]);


  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return u.full_name?.toLowerCase().includes(query) || u.username?.toLowerCase().includes(query);
  });

  const onlineCount = users.filter((u) => u.is_online).length;
  const offlineCount = users.filter((u) => !u.is_online).length;
  const totalCount = users.length;

  // Save permissions mutation
  const savePermissions = useMutation({
    mutationFn: async ({ userId, perms }: { userId: string; perms: UserPermissions }) => {
      const { error } = await supabase
        .from("user_permissions")
        .upsert(
          {
            user_id: userId,
            company_id: currentUserProfile?.company_id || null,
            ...perms,
          },
          { onConflict: "user_id" }
        );
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["all-user-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["user-permissions", variables.userId] });
      toast.success("Permissão salva!");
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar permissão: " + (error.message || ""));
    },
  });

  // Create user mutation
  const createUser = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { ...userData, company_id: currentUserProfile?.company_id },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Save permissions for the new user
      if (data.user_id) {
        await supabase.from("user_permissions").upsert({
          user_id: data.user_id,
          company_id: currentUserProfile?.company_id || null,
          ...userData.permissions,
        }, { onConflict: "user_id" });
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      setIsDialogOpen(false);
      setNewUser({ username: "", password: "", full_name: "", role: "agent", permissions: { ...defaultPermissions } });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["all-user-permissions"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar usuário");
    },
  });

  // Delete user mutation
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: userId },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Usuário excluído com sucesso!");
      setDeleteUserId(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao excluir usuário");
    },
  });

  // Update role mutation
  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "agent" | "moderator" | "user" }) => {
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("user_roles").update({ role }).eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert([{ user_id: userId, role }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Permissão atualizada!");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar permissão");
    },
  });

  const handleSaveSchedule = async () => {
    toast.info("Funcionalidade de horários em desenvolvimento");
    setIsScheduleDialogOpen(false);
    setEditingUser(null);
  };

  const updateUserDepartment = useMutation({
    mutationFn: async ({ userId, departmentId, add }: { userId: string; departmentId: string; add: boolean }) => {
      if (add) {
        const { data: existing } = await supabase
          .from("department_members")
          .select("id")
          .eq("user_id", userId)
          .eq("department_id", departmentId)
          .maybeSingle();
        if (!existing) {
          const { error } = await supabase.from("department_members").insert([{ department_id: departmentId, user_id: userId }]);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from("department_members").delete().eq("user_id", userId).eq("department_id", departmentId);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["department-members-all"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success(variables.add ? "Departamento atribuído!" : "Departamento removido!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar departamento");
      queryClient.invalidateQueries({ queryKey: ["department-members-all"] });
    },
  });

  const logoutUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_online: false, last_seen_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário deslogado!");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao deslogar usuário");
    },
  });

  const updateUserConnection = useMutation({
    mutationFn: async ({ userId, connectionId, add }: { userId: string; connectionId: string; add: boolean }) => {
      if (add) {
        const { error } = await supabase.from("user_connections").insert([{ user_id: userId, connection_id: connectionId }]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_connections").delete().eq("user_id", userId).eq("connection_id", connectionId);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-connections-assignments"] });
      toast.success(variables.add ? "Conexão atribuída!" : "Conexão removida!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar conexão do usuário");
      queryClient.invalidateQueries({ queryKey: ["user-connections-assignments"] });
    },
  });

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const handleOpenSchedule = (u: UserWithRole) => {
    setEditingUser(u);
    setScheduleForm({ start: "08:00", end: "18:00", days: [1, 2, 3, 4, 5] });
    setIsScheduleDialogOpen(true);
  };

  const toggleDay = (day: number) => {
    if (scheduleForm.days.includes(day)) {
      setScheduleForm({ ...scheduleForm, days: scheduleForm.days.filter((d) => d !== day) });
    } else {
      setScheduleForm({ ...scheduleForm, days: [...scheduleForm.days, day].sort() });
    }
  };

  const toggleExpand = (userId: string) => {
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  const togglePermission = (userId: string, key: keyof UserPermissions) => {
    const currentPerms = getPerms(userId);
    const newPerms: UserPermissions = { ...currentPerms, [key]: !currentPerms[key] };

    // Optimistic local update
    setLocalPermissions((prev) => ({ ...prev, [userId]: newPerms }));

    // Persist to database
    savePermissions.mutate({ userId, perms: newPerms });
  };

  const toggleUserDepartment = (userId: string, deptId: string) => {
    setUserDepartments((prev) => {
      const current = prev[userId] || [];
      if (current.includes(deptId)) {
        return { ...prev, [userId]: current.filter((d) => d !== deptId) };
      } else {
        return { ...prev, [userId]: [...current, deptId] };
      }
    });
  };

  const toggleUserConnection = (userId: string, connId: string) => {
    const currentConnections = userConnections[userId] || [];
    const isCurrentlyAssigned = currentConnections.includes(connId);
    setUserConnections((prev) => {
      const current = prev[userId] || [];
      if (isCurrentlyAssigned) {
        return { ...prev, [userId]: current.filter((c) => c !== connId) };
      } else {
        return { ...prev, [userId]: [...current, connId] };
      }
    });
    updateUserConnection.mutate({ userId, connectionId: connId, add: !isCurrentlyAssigned });
  };

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // Permission groups - removed "activityMonitoring" and "ignoreLimitsLockedAttendances"
  const permissionGroups = [
    {
      title: "Geral",
      items: [
        { key: "can_supervise" as const, label: "Acessar funções de supervisão" },
        { key: "can_manage_tasks" as const, label: "Gestão de tarefas" },
        { key: "auto_login_queue" as const, label: "Logar automaticamente às filas" },
        { key: "can_export_chats" as const, label: "Exportar atendimentos" },
        { key: "can_create_tasks_for_others" as const, label: "Permitir criar tarefas para outros" },
      ],
    },
    {
      title: "Chat",
      items: [
        { key: "can_view_queue" as const, label: "Visualizar e selecionar atendimentos da fila" },
        { key: "can_read_chat_history" as const, label: "Ler mensagens no histórico de atendimentos" },
        { key: "can_open_new_chats" as const, label: "Abrir novos chats" },
        { key: "always_online" as const, label: "Usuário sempre online" },
        { key: "can_access_internal_chat" as const, label: "Acessar chat interno" },
        { key: "can_access_wa_groups" as const, label: "Acessar grupos de WA" },
      ],
    },
  ];

  const maxUsers = companyData?.max_users || 5;
  const canAddMoreUsers = totalCount < maxUsers;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1.5 py-1 px-2">
              <UserCheck className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-600">{onlineCount}</span>
            </Badge>
            <Badge variant="outline" className="gap-1.5 py-1 px-2">
              <UserX className="w-3.5 h-3.5 text-red-500" />
              <span className="text-red-600">{offlineCount}</span>
            </Badge>
            <Badge variant="outline" className="gap-1.5 py-1 px-2">
              <UsersIcon className="w-3.5 h-3.5 text-blue-500" />
              <span className={totalCount >= maxUsers ? "text-orange-600" : "text-blue-600"}>
                {totalCount}/{maxUsers}
              </span>
            </Badge>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setNewUser({ username: "", password: "", full_name: "", role: "agent", permissions: { ...defaultPermissions } });
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={!canAddMoreUsers}>
              <Plus className="w-4 h-4" />
              {canAddMoreUsers ? "Adicionar" : `Limite atingido (${maxUsers})`}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo usuário</DialogTitle>
              <p className="text-sm text-muted-foreground">Campos marcados com * são obrigatórios</p>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Usuário*</Label>
                  <Input placeholder="Usuário" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Nome*</Label>
                  <Input placeholder="Nome completo" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Senha*</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Senha de acesso"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={newUser.role} onValueChange={(value: "admin" | "agent") => setNewUser({ ...newUser, role: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agente</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Permissions section */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-4">Permissões do Usuário</h3>
                <div className="space-y-4">
                  {permissionGroups.map((group) => (
                    <div key={group.title} className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{group.title}</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {group.items.map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                            <span className="text-sm">{item.label}</span>
                            <Switch
                              checked={newUser.permissions[item.key]}
                              onCheckedChange={(checked) =>
                                setNewUser({ ...newUser, permissions: { ...newUser.permissions, [item.key]: checked } })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => createUser.mutate(newUser)}
                  disabled={!newUser.username || !newUser.full_name || !newUser.password || createUser.isPending}
                >
                  {createUser.isPending ? "Criando..." : "Adicionar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex justify-end">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Pesquisar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>ID</TableHead>
              <TableHead className="text-right">Funções</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Nenhum usuário encontrado</TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u, index) => (
                <Fragment key={u.id}>
                  <TableRow className={expandedUserId === u.id ? "border-b-0" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4 rounded border-muted-foreground" />
                        <button onClick={() => toggleExpand(u.id)} className="p-0.5 hover:bg-muted rounded transition-transform">
                          {expandedUserId === u.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(u.full_name)}</AvatarFallback>
                          </Avatar>
                          <Circle className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${u.is_online ? 'text-green-500 fill-green-500' : 'text-muted-foreground fill-muted-foreground'}`} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-primary">{u.full_name || "Sem nome"}</span>
                          <span className={`text-xs ${u.is_online ? 'text-green-600' : 'text-muted-foreground'}`}>{u.is_online ? 'Online' : 'Offline'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-primary">{u.username || "-"}</TableCell>
                    <TableCell>{u.role === "admin" ? "Administrador" : "Agente"}</TableCell>
                    <TableCell>
                      {u.created_at
                        ? new Date(u.created_at).toLocaleString("pt-BR", { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-primary">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenSchedule(u)} title="Horários">
                          <Calendar className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingUser(u); setIsEditDialogOpen(true); }} title="Editar">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => logoutUser.mutate(u.id)} title="Deslogar" disabled={!u.is_online}>
                          <LogOut className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteUserId(u.id)} title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Permissions Panel */}
                  {expandedUserId === u.id && (
                    <TableRow key={`${u.id}-expanded`}>
                      <TableCell colSpan={7} className="bg-muted/30 p-0">
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
                          {/* Permissions Column */}
                          <div className="lg:col-span-2 space-y-6">
                            <h3 className="font-semibold text-foreground">Permissões e opções</h3>
                            {permissionGroups.map((group) => (
                              <div key={group.title}>
                                <h4 className="text-sm font-medium text-muted-foreground mb-3">{group.title}</h4>
                                <div className="space-y-2">
                                  {group.items.map((item) => (
                                    <div key={item.key} className="flex items-center gap-3">
                                      <Switch
                                        checked={getPerms(u.id)[item.key]}
                                        onCheckedChange={() => togglePermission(u.id, item.key)}
                                      />
                                      <span className="text-sm text-foreground">{item.label}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Departments Column */}
                          <div className="space-y-4">
                            <h3 className="font-semibold text-foreground">Departamentos</h3>
                            <p className="text-sm text-muted-foreground">Selecione os departamentos que este usuário pertence.</p>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {departments && departments.length > 0 ? (
                                departments.map((dept) => (
                                  <div key={dept.id} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`dept-${u.id}-${dept.id}`}
                                      checked={(userDepartments[u.id] || []).includes(dept.id)}
                                      onCheckedChange={() => {
                                        const isAssigned = (userDepartments[u.id] || []).includes(dept.id);
                                        toggleUserDepartment(u.id, dept.id);
                                        updateUserDepartment.mutate({ userId: u.id, departmentId: dept.id, add: !isAssigned });
                                      }}
                                    />
                                    <label htmlFor={`dept-${u.id}-${dept.id}`} className="text-sm text-foreground cursor-pointer flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color || '#3B82F6' }} />
                                      {dept.name}
                                    </label>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground italic">Nenhum departamento cadastrado</p>
                              )}
                            </div>
                          </div>

                          {/* Connections Column */}
                          <div className="space-y-4">
                            <h3 className="font-semibold text-foreground">Conexões</h3>
                            <p className="text-sm text-muted-foreground">Selecione as conexões que este usuário pode receber contatos.</p>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {connections && connections.length > 0 ? (
                                connections.map((conn) => (
                                  <div key={conn.id} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`conn-${u.id}-${conn.id}`}
                                      checked={(userConnections[u.id] || []).includes(conn.id)}
                                      onCheckedChange={() => toggleUserConnection(u.id, conn.id)}
                                    />
                                    <label htmlFor={`conn-${u.id}-${conn.id}`} className="text-sm text-foreground cursor-pointer flex items-center gap-2">
                                      <span className={`w-2 h-2 rounded-full ${conn.status === 'connected' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                                      {conn.instance_name}
                                    </label>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground italic">Nenhuma conexão cadastrada</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editingUser.full_name || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Usuário</Label>
                <Input value={editingUser.username || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={editingUser.role || "agent"}
                  onValueChange={(value: "admin" | "agent") => {
                    updateRole.mutate({ userId: editingUser.id, role: value });
                    setIsEditDialogOpen(false);
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Horário de Trabalho</DialogTitle>
            <p className="text-sm text-muted-foreground">{editingUser?.full_name}</p>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input type="time" value={scheduleForm.start} onChange={(e) => setScheduleForm({ ...scheduleForm, start: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input type="time" value={scheduleForm.end} onChange={(e) => setScheduleForm({ ...scheduleForm, end: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dias da Semana</Label>
              <div className="flex gap-2">
                {dayNames.map((day, index) => (
                  <Button key={index} variant={scheduleForm.days.includes(index) ? "default" : "outline"} size="sm" onClick={() => toggleDay(index)} className="flex-1">
                    {day}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => handleSaveSchedule()}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteUserId && deleteUser.mutate(deleteUserId)}>
              {deleteUser.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
