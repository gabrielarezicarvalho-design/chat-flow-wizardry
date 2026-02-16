import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, Plus, Trash2, Loader2, Palette, Settings, Pencil, Upload, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface CompanyForm {
  name: string;
  slug: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string;
  custom_domain: string;
  plan: string;
  max_users: number;
  max_connections: number;
  is_active: boolean;
}

const defaultForm: CompanyForm = {
  name: '', slug: '', primary_color: '#10b981', secondary_color: '#059669',
  logo_url: '', custom_domain: '', plan: 'basic', max_users: 10, max_connections: 3, is_active: true,
};

const AdminWhiteLabel = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyForm>({ ...defaultForm });
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultForm });
    setLogoPreview(null);
    setDialogOpen(true);
  };

  const openEdit = (company: any) => {
    setEditingId(company.id);
    setForm({
      name: company.name || '',
      slug: company.slug || '',
      primary_color: company.primary_color || '#10b981',
      secondary_color: company.secondary_color || '#059669',
      logo_url: company.logo_url || '',
      custom_domain: company.custom_domain || '',
      plan: company.plan || 'basic',
      max_users: company.max_users ?? 10,
      max_connections: company.max_connections ?? 3,
      is_active: company.is_active ?? true,
    });
    setLogoPreview(company.logo_url || null);
    setDialogOpen(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      setForm(f => ({ ...f, logo_url: urlData.publicUrl }));
      setLogoPreview(urlData.publicUrl);
      toast.success('Logo enviado com sucesso');
    } catch (err: any) {
      toast.error('Erro ao enviar logo: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => {
    setForm(f => ({ ...f, logo_url: '' }));
    setLogoPreview(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        logo_url: form.logo_url || null,
        custom_domain: form.custom_domain || null,
        plan: form.plan,
        max_users: form.max_users,
        max_connections: form.max_connections,
        is_active: form.is_active,
      };

      if (editingId) {
        const { error } = await supabase.from('companies').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Empresa atualizada com sucesso');
      } else {
        const { error } = await supabase.from('companies').insert(payload);
        if (error) throw error;
        toast.success('Empresa criada com sucesso');
      }

      setDialogOpen(false);
      fetchCompanies();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir a empresa "${name}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;
      toast.success('Empresa excluída');
      fetchCompanies();
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">White Label</h2>
          <p className="text-muted-foreground">Personalizações por empresa</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nova Empresa
        </Button>
      </div>

      {/* Dialog Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Empresa' : 'Criar Empresa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Logo Upload */}
            <div>
              <Label>Logo</Label>
              <div className="flex items-center gap-4 mt-1">
                {logoPreview ? (
                  <div className="relative">
                    <img src={logoPreview} alt="Logo" className="h-16 w-16 rounded-lg object-contain border bg-muted" />
                    <button
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                  >
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                  </div>
                )}
                <div className="flex-1">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? 'Enviando...' : 'Enviar Logo'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG até 5MB</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Empresa X" />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="empresa-x" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cor Primária</Label>
                <div className="flex gap-2">
                  <input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Cor Secundária</Label>
                <div className="flex gap-2">
                  <input type="color" value={form.secondary_color} onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={form.secondary_color} onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))} />
                </div>
              </div>
            </div>
            <div>
              <Label>Domínio Customizado</Label>
              <Input value={form.custom_domain} onChange={e => setForm(f => ({ ...f, custom_domain: e.target.value }))} placeholder="app.empresa.com" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Plano</Label>
                <Input value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))} />
              </div>
              <div>
                <Label>Máx. Usuários</Label>
                <Input type="number" value={form.max_users} onChange={e => setForm(f => ({ ...f, max_users: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Máx. Conexões</Label>
                <Input type="number" value={form.max_connections} onChange={e => setForm(f => ({ ...f, max_connections: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10"><Building2 className="h-6 w-6 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{companies.length}</p>
                <p className="text-sm text-muted-foreground">Total de Empresas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10"><Palette className="h-6 w-6 text-green-500" /></div>
              <div>
                <p className="text-2xl font-bold">{companies.filter(c => c.logo_url).length}</p>
                <p className="text-sm text-muted-foreground">Com Logo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10"><Settings className="h-6 w-6 text-blue-500" /></div>
              <div>
                <p className="text-2xl font-bold">{companies.filter(c => c.custom_domain).length}</p>
                <p className="text-sm text-muted-foreground">Com Domínio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Companies List */}
      <Card>
        <CardHeader>
          <CardTitle>Empresas com Personalização</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma empresa cadastrada</div>
          ) : (
            <div className="space-y-4">
              {companies.map((company) => (
                <div key={company.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-4">
                    {company.logo_url ? (
                      <img src={company.logo_url} alt={company.name} className="h-10 w-10 rounded-lg object-contain" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${company.primary_color}20` }}>
                        <Building2 className="h-5 w-5" style={{ color: company.primary_color }} />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{company.name}</p>
                      <p className="text-xs text-muted-foreground">{company.slug || 'Sem identificador'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: company.primary_color }} title="Cor primária" />
                    <Badge variant={company.is_active ? "default" : "secondary"}>
                      {company.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(company)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(company.id, company.name)}
                      disabled={deleting === company.id}
                    >
                      {deleting === company.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWhiteLabel;
