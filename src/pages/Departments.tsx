import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDepartments } from "@/hooks/useDepartments";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { Users, Plus, Loader2, Clock, UserPlus } from "lucide-react";

const daysOfWeek = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

interface BusinessHours {
  enabled: boolean;
  days: number[];
  start: string;
  end: string;
  timezone: string;
}

const defaultBusinessHours: BusinessHours = {
  enabled: false,
  days: [1, 2, 3, 4, 5],
  start: '08:00',
  end: '18:00',
  timezone: 'America/Sao_Paulo'
};

const Departments = () => {
  const { departments, isLoading, createDepartment, updateDepartment, deleteDepartment, addMember, removeMember } = useDepartments();
  const { companyId } = useCompanyId();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<any>(null);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [managingDepartment, setManagingDepartment] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    business_hours: defaultBusinessHours
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      business_hours: defaultBusinessHours
    });
    setEditingDepartment(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingDepartment) {
      await updateDepartment.mutateAsync({
        id: editingDepartment.id,
        updates: formData
      });
    } else {
      if (!planLimits.check("departments")) return;
      await createDepartment.mutateAsync(formData);
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleEdit = (department: any) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      description: department.description || '',
      color: department.color || '#3B82F6',
      business_hours: department.business_hours || defaultBusinessHours
    });
    setDialogOpen(true);
  };

  const toggleDay = (day: number) => {
    const currentDays = formData.business_hours.days;
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();
    setFormData({
      ...formData,
      business_hours: { ...formData.business_hours, days: newDays }
    });
  };

  const formatBusinessHours = (bh: BusinessHours | null) => {
    if (!bh?.enabled) return 'Sem horário definido';
    const daysStr = bh.days
      .map(d => daysOfWeek.find(dw => dw.value === d)?.label)
      .filter(Boolean)
      .join(', ');
    return `${daysStr} • ${bh.start} - ${bh.end}`;
  };

  // Fetch users of the same company for the members dialog
  const { data: companyUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['company-users', companyId],
    queryFn: async () => {
      let q = supabase.from('profiles').select('id, full_name, username');
      if (companyId) q = q.eq('company_id', companyId);
      const { data, error } = await q.order('full_name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: membersDialogOpen,
  });

  const openMembersDialog = (department: any) => {
    setManagingDepartment(department);
    setMembersDialogOpen(true);
  };

  const isMember = (userId: string) => {
    return managingDepartment?.department_members?.some((m: any) => m.user_id === userId);
  };

  const toggleMember = async (userId: string, checked: boolean) => {
    if (!managingDepartment) return;
    if (checked) {
      await addMember.mutateAsync({ departmentId: managingDepartment.id, userId });
    } else {
      await removeMember.mutateAsync({ departmentId: managingDepartment.id, userId });
    }
    // refresh local managingDepartment from refetched list
    setManagingDepartment((prev: any) => {
      if (!prev) return prev;
      const members = checked
        ? [...(prev.department_members || []), { id: crypto.randomUUID(), user_id: userId }]
        : (prev.department_members || []).filter((m: any) => m.user_id !== userId);
      return { ...prev, department_members: members };
    });
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Departamentos</h1>
          <p className="text-muted-foreground mt-1">Organize suas equipes e configure horários comerciais</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Departamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingDepartment ? 'Editar Departamento' : 'Novo Departamento'}</DialogTitle>
              <DialogDescription>Configure o departamento e seu horário comercial</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label>Nome do Departamento *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Suporte, Vendas, Financeiro"
                    required
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva as responsabilidades deste departamento"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Cor</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#3B82F6"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Business Hours */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Horário Comercial</Label>
                    <p className="text-sm text-muted-foreground">
                      Define quando os Smart Forms são enviados
                    </p>
                  </div>
                  <Switch
                    checked={formData.business_hours.enabled}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      business_hours: { ...formData.business_hours, enabled: checked }
                    })}
                  />
                </div>

                {formData.business_hours.enabled && (
                  <div className="space-y-4 animate-in fade-in-50">
                    {/* Days of week */}
                    <div>
                      <Label className="text-sm">Dias da Semana</Label>
                      <div className="flex gap-1 mt-2">
                        {daysOfWeek.map((day) => (
                          <Button
                            key={day.value}
                            type="button"
                            variant={formData.business_hours.days.includes(day.value) ? "default" : "outline"}
                            size="sm"
                            className="w-10 h-10 p-0"
                            onClick={() => toggleDay(day.value)}
                          >
                            {day.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Time range */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Início</Label>
                        <Input
                          type="time"
                          value={formData.business_hours.start}
                          onChange={(e) => setFormData({
                            ...formData,
                            business_hours: { ...formData.business_hours, start: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Fim</Label>
                        <Input
                          type="time"
                          value={formData.business_hours.end}
                          onChange={(e) => setFormData({
                            ...formData,
                            business_hours: { ...formData.business_hours, end: e.target.value }
                          })}
                        />
                      </div>
                    </div>

                    {/* Timezone */}
                    <div>
                      <Label className="text-sm">Fuso Horário</Label>
                      <Select
                        value={formData.business_hours.timezone}
                        onValueChange={(v) => setFormData({
                          ...formData,
                          business_hours: { ...formData.business_hours, timezone: v }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                          <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                          <SelectItem value="America/Belem">Belém (GMT-3)</SelectItem>
                          <SelectItem value="America/Fortaleza">Fortaleza (GMT-3)</SelectItem>
                          <SelectItem value="America/Recife">Recife (GMT-3)</SelectItem>
                          <SelectItem value="America/Cuiaba">Cuiabá (GMT-4)</SelectItem>
                          <SelectItem value="America/Porto_Velho">Porto Velho (GMT-4)</SelectItem>
                          <SelectItem value="America/Rio_Branco">Rio Branco (GMT-5)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full">
                {editingDepartment ? 'Atualizar' : 'Criar'} Departamento
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((department: any) => (
            <Card key={department.id} className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${department.color}20` }}
                  >
                    <Users className="w-6 h-6" style={{ color: department.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{department.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {department.department_members?.length || 0} agentes
                    </p>
                  </div>
                </div>
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: department.color }}
                />
              </div>

              {department.description && (
                <p className="text-sm text-muted-foreground">{department.description}</p>
              )}

              {/* Business Hours Badge */}
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className={department.business_hours?.enabled ? 'text-foreground' : 'text-muted-foreground'}>
                  {formatBusinessHours(department.business_hours)}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openMembersDialog(department)}
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Agentes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(department)}
                >
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm('Deseja realmente excluir este departamento?')) {
                      deleteDepartment.mutate(department.id);
                    }
                  }}
                >
                  Excluir
                </Button>
              </div>
            </Card>
          ))}

          {departments.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum departamento</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Crie seu primeiro departamento para organizar sua equipe
              </p>
            </div>
          )}
        </div>
      )}

      {/* Manage Members Dialog */}
      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agentes do departamento</DialogTitle>
            <DialogDescription>
              {managingDepartment?.name} — selecione quem faz parte
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {loadingUsers ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : companyUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum usuário encontrado
              </p>
            ) : (
              companyUsers.map((u: any) => (
                <label
                  key={u.id}
                  className="group flex items-center gap-3 p-3 rounded-lg border hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={isMember(u.id)}
                    onCheckedChange={(checked) => toggleMember(u.id, !!checked)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary-foreground">{u.full_name || u.username || 'Sem nome'}</p>
                    {u.username && (
                      <p className="text-xs text-muted-foreground truncate group-hover:text-primary-foreground/80">@{u.username}</p>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};


export default Departments;
