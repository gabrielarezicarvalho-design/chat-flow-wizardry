import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, Plus, Trash2, Loader2, Palette, Settings, Pencil, Upload, X, Eye, EyeOff, Key, Download, Package
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
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

interface PartnerForm {
  name: string;
  slug: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  logo_url: string;
  partner_password: string;
  supabase_url: string;
  supabase_anon_key: string;
  is_active: boolean;
  company_id: string;
}

const defaultForm: PartnerForm = {
  name: '', slug: '', primary_color: '#10b981', secondary_color: '#059669',
  accent_color: '#6366f1', background_color: '#0f172a',
  logo_url: '', partner_password: '', supabase_url: '', supabase_anon_key: '',
  is_active: true, company_id: '',
};

const AdminWhiteLabel = () => {
  const [partners, setPartners] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PartnerForm>({ ...defaultForm });
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [partnersRes, companiesRes] = await Promise.all([
        supabase.from('white_label_partners' as any).select('*').order('created_at', { ascending: false }),
        supabase.from('companies').select('id, name').order('name'),
      ]);
      setPartners((partnersRes.data as any[]) || []);
      setCompanies(companiesRes.data || []);
    } catch (error: any) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultForm });
    setLogoPreview(null);
    setShowPassword(false);
    setDialogOpen(true);
  };

  const openEdit = (partner: any) => {
    setEditingId(partner.id);
    setForm({
      name: partner.name || '',
      slug: partner.slug || '',
      primary_color: partner.primary_color || '#10b981',
      secondary_color: partner.secondary_color || '#059669',
      accent_color: partner.accent_color || '#6366f1',
      background_color: partner.background_color || '#0f172a',
      logo_url: partner.logo_url || '',
      partner_password: partner.partner_password || '',
      supabase_url: partner.supabase_url || '',
      supabase_anon_key: partner.supabase_anon_key || '',
      is_active: partner.is_active ?? true,
      company_id: partner.company_id || '',
    });
    setLogoPreview(partner.logo_url || null);
    setShowPassword(false);
    setDialogOpen(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Máximo 5MB'); return; }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('company-logos').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('company-logos').getPublicUrl(fileName);
      setForm(f => ({ ...f, logo_url: urlData.publicUrl }));
      setLogoPreview(urlData.publicUrl);
      toast.success('Logo enviado');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
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
    if (!form.slug.trim()) { toast.error('Slug é obrigatório'); return; }
    if (!editingId && !form.partner_password.trim()) { toast.error('Senha é obrigatória'); return; }
    
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        slug: form.slug.toLowerCase().replace(/\s+/g, '-'),
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        accent_color: form.accent_color,
        background_color: form.background_color,
        logo_url: form.logo_url || null,
        supabase_url: form.supabase_url || null,
        supabase_anon_key: form.supabase_anon_key || null,
        is_active: form.is_active,
        company_id: form.company_id || null,
      };

      // Only include password if provided (for edit, empty means keep current)
      if (form.partner_password.trim()) {
        payload.partner_password = form.partner_password;
      }

      if (editingId) {
        const { error } = await (supabase.from('white_label_partners' as any).update(payload).eq('id', editingId) as any);
        if (error) throw error;
        toast.success('Parceiro atualizado');
      } else {
        payload.partner_password = form.partner_password;
        const { error } = await (supabase.from('white_label_partners' as any).insert(payload) as any);
        if (error) throw error;
        toast.success('Parceiro criado');
      }

      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(id);
    try {
      const { error } = await (supabase.from('white_label_partners' as any).delete().eq('id', id) as any);
      if (error) throw error;
      toast.success('Parceiro excluído');
      fetchData();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const generateDeployPackage = async (partner: any) => {
    const toastId = toast.loading('Gerando pacote de deploy...');
    try {
      const zip = new JSZip();

      // 1. config.json
      zip.file('config.json', JSON.stringify({
        name: partner.name,
        slug: partner.slug,
        branding: {
          primary_color: partner.primary_color,
          secondary_color: partner.secondary_color,
          accent_color: partner.accent_color,
          background_color: partner.background_color,
          logo_url: partner.logo_url || null,
        },
        supabase: {
          url: partner.supabase_url || 'CONFIGURAR_URL_SUPABASE',
          anon_key: partner.supabase_anon_key || 'CONFIGURAR_ANON_KEY',
        },
      }, null, 2));

      // 2. .env
      zip.file('.env', `# Configuração ${partner.name}
VITE_SUPABASE_URL=${partner.supabase_url || 'CONFIGURAR_URL_SUPABASE'}
VITE_SUPABASE_PUBLISHABLE_KEY=${partner.supabase_anon_key || 'CONFIGURAR_ANON_KEY'}
VITE_APP_NAME=${partner.name}
VITE_PRIMARY_COLOR=${partner.primary_color}
VITE_SECONDARY_COLOR=${partner.secondary_color}
VITE_ACCENT_COLOR=${partner.accent_color}
VITE_BACKGROUND_COLOR=${partner.background_color}
VITE_LOGO_URL=${partner.logo_url || ''}
`);

      // 3. docker-compose.yml
      zip.file('docker-compose.yml', `version: '3.8'

services:
  app:
    build: .
    ports:
      - "80:80"
      - "443:443"
    env_file:
      - .env
    restart: unless-stopped
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
`);

      // 4. Dockerfile
      zip.file('Dockerfile', `FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`);

      // 5. nginx.conf
      zip.file('nginx.conf', `server {
    listen 80;
    server_name ${partner.custom_domain || 'localhost'};
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}
`);

      // 6. Customized index.css override
      zip.file('src/brand-override.css', `/* Cores da marca ${partner.name} */
:root {
  --brand-primary: ${partner.primary_color};
  --brand-secondary: ${partner.secondary_color};
  --brand-accent: ${partner.accent_color};
  --brand-background: ${partner.background_color};
}
`);

      // 7. README.md
      zip.file('README.md', `# ${partner.name} - Pacote de Deploy

## Informações do Parceiro
- **Nome:** ${partner.name}
- **Slug:** ${partner.slug}
- **Domínio:** ${partner.custom_domain || 'Não configurado'}

## 🚀 Passo a passo para deploy na VPS

### Pré-requisitos
- VPS com Ubuntu 20.04+ (ou similar)
- Docker e Docker Compose instalados
- Domínio apontando para o IP da VPS

### 1. Preparar a VPS
\`\`\`bash
# Instalar Docker (se não tiver)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt install docker-compose -y
\`\`\`

### 2. Enviar os arquivos
\`\`\`bash
# Clonar/copiar o código fonte do sistema para a VPS
# Copiar este pacote de configuração para a raiz do projeto
cp .env /caminho/do/projeto/.env
cp docker-compose.yml /caminho/do/projeto/docker-compose.yml
cp Dockerfile /caminho/do/projeto/Dockerfile
cp nginx.conf /caminho/do/projeto/nginx.conf
\`\`\`

### 3. Configurar o .env
Edite o arquivo \`.env\` e configure:
- \`VITE_SUPABASE_URL\` - URL do seu banco de dados
- \`VITE_SUPABASE_PUBLISHABLE_KEY\` - Chave pública do Supabase

### 4. Build e Deploy
\`\`\`bash
cd /caminho/do/projeto

# Build e iniciar
docker-compose up -d --build

# Verificar se está rodando
docker-compose ps
docker-compose logs -f
\`\`\`

### 5. Configurar SSL (HTTPS)
\`\`\`bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Gerar certificado SSL
sudo certbot --nginx -d ${partner.custom_domain || 'seu-dominio.com'}
\`\`\`

### 6. Configurar DNS
No seu provedor de domínio, adicione:

| Tipo | Nome | Valor |
|------|------|-------|
| A    | @    | IP_DA_SUA_VPS |
| A    | www  | IP_DA_SUA_VPS |

### 🎨 Personalização
As cores e logo já estão configuradas:
- Cor Primária: \`${partner.primary_color}\`
- Cor Secundária: \`${partner.secondary_color}\`
- Cor de Destaque: \`${partner.accent_color}\`
- Cor de Fundo: \`${partner.background_color}\`
${partner.logo_url ? `- Logo: ${partner.logo_url}` : '- Logo: Não configurada'}

### 🔧 Comandos úteis
\`\`\`bash
# Reiniciar
docker-compose restart

# Parar
docker-compose down

# Ver logs
docker-compose logs -f

# Rebuild após alterações
docker-compose up -d --build
\`\`\`

### ❓ Suporte
Entre em contato com o administrador do sistema para suporte.
`);

      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `deploy-${partner.slug}-${new Date().toISOString().split('T')[0]}.zip`);
      toast.success('Pacote gerado com sucesso!', { id: toastId });
    } catch (err: any) {
      console.error('Erro ao gerar pacote:', err);
      toast.error('Erro ao gerar pacote: ' + err.message, { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">White Label</h2>
          <p className="text-muted-foreground">Parceiros e personalizações</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Novo Parceiro
        </Button>
      </div>

      {/* Dialog Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Parceiro' : 'Novo Parceiro White Label'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Logo Upload */}
            <div>
              <Label>Logo</Label>
              <div className="flex items-center gap-4 mt-1">
                {logoPreview ? (
                  <div className="relative">
                    <img src={logoPreview} alt="Logo" className="h-16 w-16 rounded-lg object-contain border bg-muted" />
                    <button onClick={removeLogo} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div onClick={() => fileInputRef.current?.click()} className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
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
                <Label>Slug (login) *</Label>
                <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} placeholder="empresa-x" />
              </div>
            </div>

            {/* Password */}
            <div>
              <Label className="flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5" />
                Senha de Acesso {!editingId && '*'}
              </Label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={form.partner_password}
                  onChange={e => setForm(f => ({ ...f, partner_password: e.target.value }))}
                  placeholder={editingId ? 'Deixe vazio para manter a atual' : 'Senha do parceiro'}
                />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Usada para login em /entrar-white-label</p>
            </div>

            {/* Company link */}
            <div>
              <Label>Empresa vinculada</Label>
              <select
                value={form.company_id}
                onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Nenhuma</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Colors */}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cor de Destaque</Label>
                <div className="flex gap-2">
                  <input type="color" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Cor de Fundo</Label>
                <div className="flex gap-2">
                  <input type="color" value={form.background_color} onChange={e => setForm(f => ({ ...f, background_color: e.target.value }))} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={form.background_color} onChange={e => setForm(f => ({ ...f, background_color: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Ativo</Label>
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
                <p className="text-2xl font-bold">{partners.length}</p>
                <p className="text-sm text-muted-foreground">Total de Parceiros</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10"><Palette className="h-6 w-6 text-green-500" /></div>
              <div>
                <p className="text-2xl font-bold">{partners.filter((p: any) => p.logo_url).length}</p>
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
                <p className="text-2xl font-bold">{partners.filter((p: any) => p.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Partners List */}
      <Card>
        <CardHeader>
          <CardTitle>Parceiros White Label</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum parceiro cadastrado. Crie o primeiro para habilitar o login em /entrar-white-label
            </div>
          ) : (
            <div className="space-y-4">
              {partners.map((partner: any) => (
                <div key={partner.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-4">
                    {partner.logo_url ? (
                      <img src={partner.logo_url} alt={partner.name} className="h-10 w-10 rounded-lg object-contain" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${partner.primary_color}20` }}>
                        <Building2 className="h-5 w-5" style={{ color: partner.primary_color }} />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{partner.name}</p>
                      <p className="text-xs text-muted-foreground">Login: {partner.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[partner.primary_color, partner.secondary_color, partner.accent_color].map((color, i) => (
                        <div key={i} className="h-4 w-4 rounded-full border" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                    <Badge variant={partner.is_active ? "default" : "secondary"}>
                      {partner.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => generateDeployPackage(partner)} title="Gerar pacote de deploy">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(partner)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(partner.id, partner.name)} disabled={deleting === partner.id}>
                      {deleting === partner.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
