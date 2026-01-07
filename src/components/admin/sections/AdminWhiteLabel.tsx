import { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Pencil, 
  Trash2, 
  Eye, 
  Settings,
  Database,
  Cloud,
  Server,
  Check,
  X,
  ExternalLink,
  Loader2,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface WhiteLabelPartner {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  supabase_url: string | null;
  supabase_anon_key: string | null;
  supabase_service_role_key: string | null;
  google_client_id: string | null;
  google_client_secret: string | null;
  google_drive_connected: boolean;
  uazapi_base_url: string | null;
  uazapi_admin_token: string | null;
  uazapi_environment: string;
  partner_password: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const AdminWhiteLabel = () => {
  const [partners, setPartners] = useState<WhiteLabelPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<WhiteLabelPartner | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logo_url: '',
    partner_password: '',
    primary_color: '#3B82F6',
    secondary_color: '#1E40AF',
    accent_color: '#10B981',
    background_color: '#F8FAFC',
  });

  const [configData, setConfigData] = useState({
    supabase_url: '',
    supabase_anon_key: '',
    supabase_service_role_key: '',
    google_client_id: '',
    google_client_secret: '',
    uazapi_base_url: '',
    uazapi_admin_token: '',
    uazapi_environment: 'TESTE',
  });

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('white_label_partners')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPartners(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar parceiros:', error);
      toast.error('Erro ao carregar parceiros');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePartner = () => {
    setSelectedPartner(null);
    setFormData({
      name: '',
      slug: '',
      logo_url: '',
      partner_password: '',
      primary_color: '#3B82F6',
      secondary_color: '#1E40AF',
      accent_color: '#10B981',
      background_color: '#F8FAFC',
    });
    setDialogOpen(true);
  };

  const handleEditPartner = (partner: WhiteLabelPartner) => {
    setSelectedPartner(partner);
    setFormData({
      name: partner.name,
      slug: partner.slug,
      logo_url: partner.logo_url || '',
      partner_password: partner.partner_password || '',
      primary_color: partner.primary_color,
      secondary_color: partner.secondary_color,
      accent_color: partner.accent_color,
      background_color: partner.background_color,
    });
    setDialogOpen(true);
  };

  const handleConfigPartner = (partner: WhiteLabelPartner) => {
    setSelectedPartner(partner);
    setConfigData({
      supabase_url: partner.supabase_url || '',
      supabase_anon_key: partner.supabase_anon_key || '',
      supabase_service_role_key: partner.supabase_service_role_key || '',
      google_client_id: partner.google_client_id || '',
      google_client_secret: partner.google_client_secret || '',
      uazapi_base_url: partner.uazapi_base_url || '',
      uazapi_admin_token: partner.uazapi_admin_token || '',
      uazapi_environment: partner.uazapi_environment || 'TESTE',
    });
    setConfigDialogOpen(true);
  };

  const handleSavePartner = async () => {
    if (!formData.name || !formData.slug) {
      toast.error('Preencha nome e identificador');
      return;
    }

    setSaving(true);
    try {
      if (selectedPartner) {
        const { error } = await supabase
          .from('white_label_partners')
          .update({
            name: formData.name,
            slug: formData.slug.toLowerCase().replace(/\s/g, '-'),
            logo_url: formData.logo_url || null,
            partner_password: formData.partner_password || null,
            primary_color: formData.primary_color,
            secondary_color: formData.secondary_color,
            accent_color: formData.accent_color,
            background_color: formData.background_color,
          })
          .eq('id', selectedPartner.id);

        if (error) throw error;
        toast.success('Parceiro atualizado!');
      } else {
        const { error } = await supabase
          .from('white_label_partners')
          .insert({
            name: formData.name,
            slug: formData.slug.toLowerCase().replace(/\s/g, '-'),
            logo_url: formData.logo_url || null,
            partner_password: formData.partner_password || null,
            primary_color: formData.primary_color,
            secondary_color: formData.secondary_color,
            accent_color: formData.accent_color,
            background_color: formData.background_color,
          });

        if (error) throw error;
        toast.success('Parceiro criado!');
      }

      setDialogOpen(false);
      fetchPartners();
    } catch (error: any) {
      console.error('Erro ao salvar parceiro:', error);
      toast.error(error.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedPartner) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('white_label_partners')
        .update({
          supabase_url: configData.supabase_url || null,
          supabase_anon_key: configData.supabase_anon_key || null,
          supabase_service_role_key: configData.supabase_service_role_key || null,
          google_client_id: configData.google_client_id || null,
          google_client_secret: configData.google_client_secret || null,
          uazapi_base_url: configData.uazapi_base_url || null,
          uazapi_admin_token: configData.uazapi_admin_token || null,
          uazapi_environment: configData.uazapi_environment,
        })
        .eq('id', selectedPartner.id);

      if (error) throw error;
      toast.success('Configurações salvas!');
      setConfigDialogOpen(false);
      fetchPartners();
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);
      toast.error(error.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (partner: WhiteLabelPartner) => {
    try {
      const { error } = await supabase
        .from('white_label_partners')
        .update({ is_active: !partner.is_active })
        .eq('id', partner.id);

      if (error) throw error;
      toast.success(partner.is_active ? 'Parceiro desativado' : 'Parceiro ativado');
      fetchPartners();
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleDeletePartner = async (partner: WhiteLabelPartner) => {
    if (!confirm(`Deseja realmente excluir "${partner.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('white_label_partners')
        .delete()
        .eq('id', partner.id);

      if (error) throw error;
      toast.success('Parceiro excluído!');
      fetchPartners();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir parceiro');
    }
  };

  const copyLoginUrl = (slug: string) => {
    const url = `${window.location.origin}/entrar-white-label?parceiro=${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('URL copiada!');
  };

  const getConfigStatus = (partner: WhiteLabelPartner) => {
    const hasSupabase = partner.supabase_url && partner.supabase_anon_key;
    const hasUazapi = partner.uazapi_base_url && partner.uazapi_admin_token;
    return { hasSupabase, hasUazapi };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">White Label</h2>
          <p className="text-muted-foreground">Gerencie parceiros White Label</p>
        </div>
        <Button onClick={handleCreatePartner}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Parceiro
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{partners.length}</p>
                <p className="text-sm text-muted-foreground">Total de Parceiros</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{partners.filter(p => p.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Database className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{partners.filter(p => p.supabase_url).length}</p>
                <p className="text-sm text-muted-foreground">Com Supabase</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-500/10">
                <Server className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{partners.filter(p => p.uazapi_base_url).length}</p>
                <p className="text-sm text-muted-foreground">Com UAZAPI</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Parceiros Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum parceiro cadastrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Integrações</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((partner) => {
                  const status = getConfigStatus(partner);
                  return (
                    <TableRow key={partner.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {partner.logo_url ? (
                            <img 
                              src={partner.logo_url} 
                              alt={partner.name}
                              className="h-10 w-10 rounded-lg object-contain"
                            />
                          ) : (
                            <div 
                              className="h-10 w-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${partner.primary_color}20` }}
                            >
                              <Building2 
                                className="h-5 w-5"
                                style={{ color: partner.primary_color }}
                              />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{partner.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Criado em {new Date(partner.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {partner.slug}
                          </code>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => copyLoginUrl(partner.slug)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={status.hasSupabase ? "default" : "secondary"}>
                            <Database className="h-3 w-3 mr-1" />
                            Supabase
                          </Badge>
                          <Badge variant={status.hasUazapi ? "default" : "secondary"}>
                            <Server className="h-3 w-3 mr-1" />
                            UAZAPI
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={partner.is_active ? "default" : "secondary"}>
                          {partner.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleConfigPartner(partner)}
                            title="Configurações"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditPartner(partner)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(partner)}
                            title={partner.is_active ? 'Desativar' : 'Ativar'}
                          >
                            {partner.is_active ? (
                              <X className="h-4 w-4 text-destructive" />
                            ) : (
                              <Check className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletePartner(partner)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Criar/Editar Parceiro */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedPartner ? 'Editar Parceiro' : 'Novo Parceiro'}
            </DialogTitle>
            <DialogDescription>
              Configure os dados básicos e aparência do parceiro
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome do Parceiro</Label>
                <Input
                  placeholder="Nome da Empresa"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Identificador (slug)</Label>
                <Input
                  placeholder="minha-empresa"
                  value={formData.slug}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    slug: e.target.value.toLowerCase().replace(/\s/g, '-') 
                  })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Será usado na URL: /entrar-white-label?parceiro={formData.slug || 'minha-empresa'}
                </p>
              </div>
              <div className="col-span-2">
                <Label>Senha de Proteção (Configurações)</Label>
                <Input
                  type="password"
                  placeholder="Senha para acessar configurações"
                  value={formData.partner_password}
                  onChange={(e) => setFormData({ ...formData, partner_password: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  O parceiro usará esta senha para acessar as configurações
                </p>
              </div>
              <div className="col-span-2">
                <Label>URL do Logo</Label>
                <Input
                  placeholder="https://exemplo.com/logo.png"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="mb-3 block">Cores</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Cor Primária</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="h-8 w-8 rounded cursor-pointer"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Cor Secundária</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      className="h-8 w-8 rounded cursor-pointer"
                    />
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Cor de Destaque</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={formData.accent_color}
                      onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                      className="h-8 w-8 rounded cursor-pointer"
                    />
                    <Input
                      value={formData.accent_color}
                      onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Cor de Fundo</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={formData.background_color}
                      onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                      className="h-8 w-8 rounded cursor-pointer"
                    />
                    <Input
                      value={formData.background_color}
                      onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="border-t pt-4">
              <Label className="mb-3 block">Preview</Label>
              <div 
                className="rounded-lg p-4 flex items-center gap-3"
                style={{ backgroundColor: formData.background_color }}
              >
                {formData.logo_url ? (
                  <img 
                    src={formData.logo_url} 
                    alt="Logo" 
                    className="h-10 w-10 object-contain"
                  />
                ) : (
                  <div 
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${formData.primary_color}20` }}
                  >
                    <Building2 
                      className="h-5 w-5"
                      style={{ color: formData.primary_color }}
                    />
                  </div>
                )}
                <div>
                  <p 
                    className="font-medium"
                    style={{ color: formData.primary_color }}
                  >
                    {formData.name || 'Nome do Parceiro'}
                  </p>
                  <p 
                    className="text-xs"
                    style={{ color: formData.secondary_color }}
                  >
                    {formData.slug || 'identificador'}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  className="ml-auto"
                  style={{ 
                    backgroundColor: formData.primary_color,
                    color: '#fff'
                  }}
                >
                  Entrar
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePartner} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {selectedPartner ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Configurações do Parceiro */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurações: {selectedPartner?.name}</DialogTitle>
            <DialogDescription>
              Configure as integrações externas do parceiro
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="supabase" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="supabase">
                <Database className="h-4 w-4 mr-2" />
                Supabase
              </TabsTrigger>
              <TabsTrigger value="drive">
                <Cloud className="h-4 w-4 mr-2" />
                Google Drive
              </TabsTrigger>
              <TabsTrigger value="uazapi">
                <Server className="h-4 w-4 mr-2" />
                UAZAPI
              </TabsTrigger>
            </TabsList>

            <TabsContent value="supabase" className="space-y-4 py-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Importante:</strong> Os dados dos clientes deste parceiro ficarão armazenados 
                  no Supabase configurado abaixo. Isso garante isolamento total de dados.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>URL do Supabase</Label>
                  <Input
                    placeholder="https://xxxxx.supabase.co"
                    value={configData.supabase_url}
                    onChange={(e) => setConfigData({ ...configData, supabase_url: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Anon Key (Pública)</Label>
                  <Input
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={configData.supabase_anon_key}
                    onChange={(e) => setConfigData({ ...configData, supabase_anon_key: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Service Role Key (Privada)</Label>
                  <Input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={configData.supabase_service_role_key}
                    onChange={(e) => setConfigData({ ...configData, supabase_service_role_key: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Usada apenas para operações administrativas
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="drive" className="space-y-4 py-4">
              <div className="space-y-4">
                <div>
                  <Label>Google Client ID</Label>
                  <Input
                    placeholder="xxxxx.apps.googleusercontent.com"
                    value={configData.google_client_id}
                    onChange={(e) => setConfigData({ ...configData, google_client_id: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Google Client Secret</Label>
                  <Input
                    type="password"
                    placeholder="GOCSPX-..."
                    value={configData.google_client_secret}
                    onChange={(e) => setConfigData({ ...configData, google_client_secret: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="uazapi" className="space-y-4 py-4">
              <div className="space-y-4">
                <div>
                  <Label>URL Base da UAZAPI</Label>
                  <Input
                    placeholder="https://api.uazapi.com"
                    value={configData.uazapi_base_url}
                    onChange={(e) => setConfigData({ ...configData, uazapi_base_url: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Token Admin</Label>
                  <Input
                    type="password"
                    placeholder="Token de acesso admin"
                    value={configData.uazapi_admin_token}
                    onChange={(e) => setConfigData({ ...configData, uazapi_admin_token: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Ambiente</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="uazapi_env"
                        value="TESTE"
                        checked={configData.uazapi_environment === 'TESTE'}
                        onChange={(e) => setConfigData({ ...configData, uazapi_environment: e.target.value })}
                        className="accent-primary"
                      />
                      <span>Teste</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="uazapi_env"
                        value="PRODUCAO"
                        checked={configData.uazapi_environment === 'PRODUCAO'}
                        onChange={(e) => setConfigData({ ...configData, uazapi_environment: e.target.value })}
                        className="accent-primary"
                      />
                      <span>Produção</span>
                    </label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConfig} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar Configurações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWhiteLabel;