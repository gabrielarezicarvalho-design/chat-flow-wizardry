import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Loader2, Database, Cloud, Server, Palette, Save, 
  LogOut, Check, X, Eye, EyeOff, Building2, Users, 
  Plus, Settings, MessageSquare, BarChart3, Home,
  ChevronRight, Trash2, Edit, Search, AlertTriangle, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

interface PartnerConfig {
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
  uazapi_base_url: string | null;
  uazapi_admin_token: string | null;
  uazapi_environment: string;
}

interface Company {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  max_users: number;
  max_connections: number;
}

const WhiteLabelConfig = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [partner, setPartner] = useState<PartnerConfig | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState('appearance');

  // Companies state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    email: '',
    phone: '',
    max_users: 5,
    max_connections: 2,
  });
  const [searchCompany, setSearchCompany] = useState('');

  // Form states
  const [appearanceData, setAppearanceData] = useState({
    logo_url: '',
    primary_color: '#3B82F6',
    secondary_color: '#1E40AF',
    accent_color: '#10B981',
    background_color: '#0F172A',
  });

  const [supabaseData, setSupabaseData] = useState({
    supabase_url: '',
    supabase_anon_key: '',
    supabase_service_role_key: '',
  });

  const [driveData, setDriveData] = useState({
    google_client_id: '',
    google_client_secret: '',
  });

  const [uazapiData, setUazapiData] = useState({
    uazapi_base_url: '',
    uazapi_admin_token: '',
    uazapi_environment: 'TESTE',
  });

  useEffect(() => {
    const storedPartner = localStorage.getItem('white_label_partner');
    const configAccess = sessionStorage.getItem('white_label_config_access');
    
    if (!storedPartner) {
      navigate('/entrar-white-label');
      return;
    }
    
    if (!configAccess) {
      navigate('/entrar-white-label');
      return;
    }

    const partnerInfo = JSON.parse(storedPartner);
    fetchPartnerConfig(partnerInfo.id);
  }, [navigate]);

  const fetchPartnerConfig = async (partnerId: string) => {
    try {
      const { data, error } = await supabase
        .from('white_label_partners')
        .select('*')
        .eq('id', partnerId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setPartner(data as PartnerConfig);
        setAppearanceData({
          logo_url: data.logo_url || '',
          primary_color: data.primary_color || '#3B82F6',
          secondary_color: data.secondary_color || '#1E40AF',
          accent_color: data.accent_color || '#10B981',
          background_color: data.background_color || '#0F172A',
        });
        setSupabaseData({
          supabase_url: data.supabase_url || '',
          supabase_anon_key: data.supabase_anon_key || '',
          supabase_service_role_key: data.supabase_service_role_key || '',
        });
        setDriveData({
          google_client_id: data.google_client_id || '',
          google_client_secret: data.google_client_secret || '',
        });
        setUazapiData({
          uazapi_base_url: data.uazapi_base_url || '',
          uazapi_admin_token: data.uazapi_admin_token || '',
          uazapi_environment: data.uazapi_environment || 'TESTE',
        });
      }
    } catch (error: any) {
      console.error('Erro ao buscar configurações:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  // Create partner's Supabase client
  const partnerSupabase = useMemo(() => {
    if (supabaseData.supabase_url && supabaseData.supabase_anon_key) {
      return createClient(supabaseData.supabase_url, supabaseData.supabase_anon_key);
    }
    return null;
  }, [supabaseData.supabase_url, supabaseData.supabase_anon_key]);

  const fetchCompanies = async () => {
    if (!partner || !partnerSupabase) return;
    setLoadingCompanies(true);
    try {
      const { data, error } = await partnerSupabase
        .from('companies')
        .select('id, name, email, phone, is_active, created_at, max_users, max_connections')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar empresas:', error);
      // Don't show error toast if table doesn't exist
      if (!error.message?.includes('does not exist')) {
        toast.error('Erro ao carregar empresas');
      }
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'companies' && partner && partnerSupabase) {
      fetchCompanies();
    }
  }, [activeTab, partner, partnerSupabase]);

  const handleSaveAppearance = async () => {
    if (!partner) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('white_label_partners')
        .update({
          logo_url: appearanceData.logo_url || null,
          primary_color: appearanceData.primary_color,
          secondary_color: appearanceData.secondary_color,
          accent_color: appearanceData.accent_color,
          background_color: appearanceData.background_color,
        })
        .eq('id', partner.id);

      if (error) throw error;
      
      const storedPartner = JSON.parse(localStorage.getItem('white_label_partner') || '{}');
      localStorage.setItem('white_label_partner', JSON.stringify({
        ...storedPartner,
        ...appearanceData,
      }));
      
      toast.success('Aparência atualizada!');
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar aparência');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSupabase = async () => {
    if (!partner) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('white_label_partners')
        .update({
          supabase_url: supabaseData.supabase_url || null,
          supabase_anon_key: supabaseData.supabase_anon_key || null,
          supabase_service_role_key: supabaseData.supabase_service_role_key || null,
        })
        .eq('id', partner.id);

      if (error) throw error;
      
      const storedPartner = JSON.parse(localStorage.getItem('white_label_partner') || '{}');
      localStorage.setItem('white_label_partner', JSON.stringify({
        ...storedPartner,
        supabase_url: supabaseData.supabase_url,
        supabase_anon_key: supabaseData.supabase_anon_key,
      }));
      
      toast.success('Supabase configurado!');
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar Supabase');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDrive = async () => {
    if (!partner) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('white_label_partners')
        .update({
          google_client_id: driveData.google_client_id || null,
          google_client_secret: driveData.google_client_secret || null,
        })
        .eq('id', partner.id);

      if (error) throw error;
      toast.success('Google Drive configurado!');
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar Google Drive');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUazapi = async () => {
    if (!partner) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('white_label_partners')
        .update({
          uazapi_base_url: uazapiData.uazapi_base_url || null,
          uazapi_admin_token: uazapiData.uazapi_admin_token || null,
          uazapi_environment: uazapiData.uazapi_environment,
        })
        .eq('id', partner.id);

      if (error) throw error;
      toast.success('UAZAPI configurado!');
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar UAZAPI');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!companyForm.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!partnerSupabase) {
      toast.error('Configure o Supabase primeiro');
      return;
    }

    setSaving(true);
    try {
      if (editingCompany) {
        const { error } = await partnerSupabase
          .from('companies')
          .update({
            name: companyForm.name,
            email: companyForm.email || null,
            phone: companyForm.phone || null,
            max_users: companyForm.max_users,
            max_connections: companyForm.max_connections,
          })
          .eq('id', editingCompany.id);

        if (error) throw error;
        toast.success('Empresa atualizada!');
      } else {
        const { error } = await partnerSupabase
          .from('companies')
          .insert({
            name: companyForm.name,
            email: companyForm.email || null,
            phone: companyForm.phone || null,
            max_users: companyForm.max_users,
            max_connections: companyForm.max_connections,
          });

        if (error) throw error;
        toast.success('Empresa criada!');
      }
      
      setCompanyDialogOpen(false);
      setEditingCompany(null);
      setCompanyForm({ name: '', email: '', phone: '', max_users: 5, max_connections: 2 });
      fetchCompanies();
    } catch (error: any) {
      console.error('Erro ao salvar empresa:', error);
      toast.error('Erro ao salvar empresa');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompany = async (company: Company) => {
    if (!confirm(`Deseja realmente excluir a empresa "${company.name}"?`)) return;
    if (!partnerSupabase) return;
    
    try {
      const { error } = await partnerSupabase
        .from('companies')
        .delete()
        .eq('id', company.id);

      if (error) throw error;
      toast.success('Empresa excluída!');
      fetchCompanies();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir empresa');
    }
  };

  const handleToggleCompanyStatus = async (company: Company) => {
    if (!partnerSupabase) return;
    
    try {
      const { error } = await partnerSupabase
        .from('companies')
        .update({ is_active: !company.is_active })
        .eq('id', company.id);

      if (error) throw error;
      toast.success(company.is_active ? 'Empresa desativada!' : 'Empresa ativada!');
      fetchCompanies();
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('white_label_config_access');
    navigate('/entrar-white-label');
  };

  const toggleShowPassword = (field: string) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const getConfigStatus = () => {
    const hasSupabase = supabaseData.supabase_url && supabaseData.supabase_anon_key;
    const hasDrive = driveData.google_client_id && driveData.google_client_secret;
    const hasUazapi = uazapiData.uazapi_base_url && uazapiData.uazapi_admin_token;
    return { hasSupabase, hasDrive, hasUazapi };
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchCompany.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchCompany.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!partner) {
    return null;
  }

  const status = getConfigStatus();

  // System Preview Component
  const SystemPreview = () => (
    <div 
      className="rounded-xl overflow-hidden border-2 border-border shadow-2xl"
      style={{ backgroundColor: appearanceData.background_color }}
    >
      {/* Preview Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ 
          backgroundColor: `${appearanceData.primary_color}15`,
          borderColor: `${appearanceData.primary_color}30`
        }}
      >
        <div className="flex items-center gap-3">
          {appearanceData.logo_url ? (
            <img src={appearanceData.logo_url} alt="Logo" className="h-8 w-8 object-contain rounded" />
          ) : (
            <div 
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: appearanceData.primary_color }}
            >
              <Building2 className="h-4 w-4 text-white" />
            </div>
          )}
          <span className="font-bold text-white text-sm">{partner.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-xs text-gray-400">Online</span>
        </div>
      </div>
      
      {/* Preview Body */}
      <div className="flex h-64">
        {/* Sidebar */}
        <div 
          className="w-14 border-r flex flex-col items-center py-4 gap-3"
          style={{ 
            backgroundColor: `${appearanceData.secondary_color}20`,
            borderColor: `${appearanceData.primary_color}20`
          }}
        >
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: appearanceData.primary_color }}
          >
            <Home className="h-4 w-4 text-white" />
          </div>
          <div className="p-2 rounded-lg hover:bg-white/5 cursor-pointer">
            <MessageSquare className="h-4 w-4 text-gray-400" />
          </div>
          <div className="p-2 rounded-lg hover:bg-white/5 cursor-pointer">
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <div className="p-2 rounded-lg hover:bg-white/5 cursor-pointer">
            <BarChart3 className="h-4 w-4 text-gray-400" />
          </div>
          <div className="p-2 rounded-lg hover:bg-white/5 cursor-pointer">
            <Settings className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-4">
          <div className="mb-4">
            <h3 className="text-white font-semibold text-sm mb-1">Dashboard</h3>
            <p className="text-gray-400 text-xs">Bem-vindo ao painel de controle</p>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2">
            <div 
              className="rounded-lg p-3 border"
              style={{ 
                backgroundColor: `${appearanceData.primary_color}10`,
                borderColor: `${appearanceData.primary_color}30`
              }}
            >
              <p className="text-xs text-gray-400">Conversas</p>
              <p 
                className="text-lg font-bold"
                style={{ color: appearanceData.primary_color }}
              >
                128
              </p>
            </div>
            <div 
              className="rounded-lg p-3 border"
              style={{ 
                backgroundColor: `${appearanceData.accent_color}10`,
                borderColor: `${appearanceData.accent_color}30`
              }}
            >
              <p className="text-xs text-gray-400">Leads</p>
              <p 
                className="text-lg font-bold"
                style={{ color: appearanceData.accent_color }}
              >
                56
              </p>
            </div>
            <div 
              className="rounded-lg p-3 border"
              style={{ 
                backgroundColor: `${appearanceData.secondary_color}10`,
                borderColor: `${appearanceData.secondary_color}30`
              }}
            >
              <p className="text-xs text-gray-400">Agentes</p>
              <p 
                className="text-lg font-bold"
                style={{ color: appearanceData.secondary_color }}
              >
                4
              </p>
            </div>
          </div>
          
          {/* Action Button */}
          <button 
            className="mt-4 w-full py-2 rounded-lg text-white text-xs font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: appearanceData.primary_color }}
          >
            Nova Conversa
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-slate-900/80 backdrop-blur-xl border-r border-slate-700/50 z-50">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            {appearanceData.logo_url ? (
              <img src={appearanceData.logo_url} alt="Logo" className="h-10 w-10 object-contain rounded-xl" />
            ) : (
              <div 
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: appearanceData.primary_color }}
              >
                <Building2 className="h-5 w-5 text-white" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-white">{partner.name}</h1>
              <p className="text-xs text-slate-400">Painel White Label</p>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'appearance', icon: Palette, label: 'Aparência' },
              { id: 'companies', icon: Building2, label: 'Empresas' },
              { id: 'supabase', icon: Database, label: 'Supabase' },
              { id: 'drive', icon: Cloud, label: 'Google Drive' },
              { id: 'uazapi', icon: Server, label: 'UAZAPI' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === item.id 
                    ? 'bg-primary text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
                {item.id !== 'appearance' && item.id !== 'companies' && (
                  <span className="ml-auto">
                    {item.id === 'supabase' && status.hasSupabase && (
                      <Check className="h-4 w-4 text-green-400" />
                    )}
                    {item.id === 'drive' && status.hasDrive && (
                      <Check className="h-4 w-4 text-green-400" />
                    )}
                    {item.id === 'uazapi' && status.hasUazapi && (
                      <Check className="h-4 w-4 text-green-400" />
                    )}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-700/50">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sair
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Personalização</h2>
                <p className="text-slate-400">Customize a aparência do seu sistema</p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                {/* Settings */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Cores e Logo</CardTitle>
                    <CardDescription>Defina as cores e identidade visual</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label className="text-slate-300">URL do Logo</Label>
                      <Input
                        placeholder="https://exemplo.com/logo.png"
                        value={appearanceData.logo_url}
                        onChange={(e) => setAppearanceData({ ...appearanceData, logo_url: e.target.value })}
                        className="bg-slate-900 border-slate-600 text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-300">Cor Primária</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={appearanceData.primary_color}
                            onChange={(e) => setAppearanceData({ ...appearanceData, primary_color: e.target.value })}
                            className="h-10 w-10 rounded cursor-pointer border-0"
                          />
                          <Input
                            value={appearanceData.primary_color}
                            onChange={(e) => setAppearanceData({ ...appearanceData, primary_color: e.target.value })}
                            className="bg-slate-900 border-slate-600 text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-300">Cor Secundária</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={appearanceData.secondary_color}
                            onChange={(e) => setAppearanceData({ ...appearanceData, secondary_color: e.target.value })}
                            className="h-10 w-10 rounded cursor-pointer border-0"
                          />
                          <Input
                            value={appearanceData.secondary_color}
                            onChange={(e) => setAppearanceData({ ...appearanceData, secondary_color: e.target.value })}
                            className="bg-slate-900 border-slate-600 text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-300">Cor de Destaque</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={appearanceData.accent_color}
                            onChange={(e) => setAppearanceData({ ...appearanceData, accent_color: e.target.value })}
                            className="h-10 w-10 rounded cursor-pointer border-0"
                          />
                          <Input
                            value={appearanceData.accent_color}
                            onChange={(e) => setAppearanceData({ ...appearanceData, accent_color: e.target.value })}
                            className="bg-slate-900 border-slate-600 text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-300">Cor de Fundo</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={appearanceData.background_color}
                            onChange={(e) => setAppearanceData({ ...appearanceData, background_color: e.target.value })}
                            className="h-10 w-10 rounded cursor-pointer border-0"
                          />
                          <Input
                            value={appearanceData.background_color}
                            onChange={(e) => setAppearanceData({ ...appearanceData, background_color: e.target.value })}
                            className="bg-slate-900 border-slate-600 text-white"
                          />
                        </div>
                      </div>
                    </div>

                    <Button onClick={handleSaveAppearance} disabled={saving} className="w-full">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Salvar Aparência
                    </Button>
                  </CardContent>
                </Card>

                {/* Preview */}
                <div>
                  <Label className="text-slate-300 mb-4 block">Preview do Sistema</Label>
                  <SystemPreview />
                </div>
              </div>
            </div>
          )}

          {/* Companies Tab */}
          {activeTab === 'companies' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Empresas</h2>
                  <p className="text-slate-400">Gerencie as empresas do seu sistema</p>
                </div>
                {status.hasSupabase && (
                  <Button 
                    onClick={() => {
                      setEditingCompany(null);
                      setCompanyForm({ name: '', email: '', phone: '', max_users: 5, max_connections: 2 });
                      setCompanyDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Empresa
                  </Button>
                )}
              </div>

              {!status.hasSupabase ? (
                <Card className="bg-amber-500/10 border-amber-500/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-amber-500/20">
                        <Lock className="h-6 w-6 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-amber-300">Configuração necessária</h3>
                        <p className="text-amber-200/80 mt-1">
                          Você precisa configurar o Supabase antes de gerenciar empresas. 
                          Os dados das empresas serão salvos no seu banco de dados.
                        </p>
                        <Button 
                          className="mt-4"
                          onClick={() => setActiveTab('supabase')}
                        >
                          <Database className="h-4 w-4 mr-2" />
                          Configurar Supabase
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Buscar empresa..."
                          value={searchCompany}
                          onChange={(e) => setSearchCompany(e.target.value)}
                          className="pl-10 bg-slate-900 border-slate-600 text-white"
                        />
                      </div>
                    </div>

                    {loadingCompanies ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                  ) : filteredCompanies.length === 0 ? (
                    <div className="text-center py-12">
                      <Building2 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">Nenhuma empresa encontrada</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="text-slate-400">Nome</TableHead>
                          <TableHead className="text-slate-400">Email</TableHead>
                          <TableHead className="text-slate-400">Status</TableHead>
                          <TableHead className="text-slate-400">Limites</TableHead>
                          <TableHead className="text-slate-400 text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCompanies.map((company) => (
                          <TableRow key={company.id} className="border-slate-700">
                            <TableCell className="text-white font-medium">{company.name}</TableCell>
                            <TableCell className="text-slate-400">{company.email || '-'}</TableCell>
                            <TableCell>
                              <Badge 
                                className={company.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                              >
                                {company.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-400">
                              {company.max_users} usuários / {company.max_connections} conexões
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleToggleCompanyStatus(company)}
                                >
                                  {company.is_active ? (
                                    <X className="h-4 w-4 text-slate-400" />
                                  ) : (
                                    <Check className="h-4 w-4 text-slate-400" />
                                  )}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => {
                                    setEditingCompany(company);
                                    setCompanyForm({
                                      name: company.name,
                                      email: company.email || '',
                                      phone: company.phone || '',
                                      max_users: company.max_users,
                                      max_connections: company.max_connections,
                                    });
                                    setCompanyDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4 text-slate-400" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteCompany(company)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-400" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
              )}
            </div>
          )}

          {/* Supabase Tab */}
          {activeTab === 'supabase' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Configuração Supabase</h2>
                <p className="text-slate-400">Configure a conexão com seu banco de dados</p>
              </div>

              <Card className="bg-slate-800/50 border-slate-700 max-w-2xl">
                <CardContent className="pt-6 space-y-6">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-sm text-blue-300">
                      <strong>Importante:</strong> Os dados dos seus clientes ficarão armazenados 
                      no seu Supabase. Isso garante isolamento total dos dados.
                    </p>
                  </div>

                  <div>
                    <Label className="text-slate-300">URL do Supabase</Label>
                    <Input
                      placeholder="https://xxxxx.supabase.co"
                      value={supabaseData.supabase_url}
                      onChange={(e) => setSupabaseData({ ...supabaseData, supabase_url: e.target.value })}
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Anon Key (Pública)</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords.anon ? 'text' : 'password'}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        value={supabaseData.supabase_anon_key}
                        onChange={(e) => setSupabaseData({ ...supabaseData, supabase_anon_key: e.target.value })}
                        className="bg-slate-900 border-slate-600 text-white pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowPassword('anon')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showPasswords.anon ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-300">Service Role Key (Privada)</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords.service ? 'text' : 'password'}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        value={supabaseData.supabase_service_role_key}
                        onChange={(e) => setSupabaseData({ ...supabaseData, supabase_service_role_key: e.target.value })}
                        className="bg-slate-900 border-slate-600 text-white pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowPassword('service')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showPasswords.service ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Usada apenas para operações administrativas
                    </p>
                  </div>

                  <Button onClick={handleSaveSupabase} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar Supabase
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Drive Tab */}
          {activeTab === 'drive' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Google Drive</h2>
                <p className="text-slate-400">Configure a integração com Google Drive para backups</p>
              </div>

              <Card className="bg-slate-800/50 border-slate-700 max-w-2xl">
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <Label className="text-slate-300">Google Client ID</Label>
                    <Input
                      placeholder="xxxxx.apps.googleusercontent.com"
                      value={driveData.google_client_id}
                      onChange={(e) => setDriveData({ ...driveData, google_client_id: e.target.value })}
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Google Client Secret</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords.drive ? 'text' : 'password'}
                        placeholder="GOCSPX-..."
                        value={driveData.google_client_secret}
                        onChange={(e) => setDriveData({ ...driveData, google_client_secret: e.target.value })}
                        className="bg-slate-900 border-slate-600 text-white pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowPassword('drive')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showPasswords.drive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button onClick={handleSaveDrive} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar Google Drive
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* UAZAPI Tab */}
          {activeTab === 'uazapi' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">UAZAPI</h2>
                <p className="text-slate-400">Configure a integração com WhatsApp via UAZAPI</p>
              </div>

              <Card className="bg-slate-800/50 border-slate-700 max-w-2xl">
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <Label className="text-slate-300">URL Base da UAZAPI</Label>
                    <Input
                      placeholder="https://api.uazapi.com"
                      value={uazapiData.uazapi_base_url}
                      onChange={(e) => setUazapiData({ ...uazapiData, uazapi_base_url: e.target.value })}
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Token Admin</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords.uazapi ? 'text' : 'password'}
                        placeholder="Token de acesso admin"
                        value={uazapiData.uazapi_admin_token}
                        onChange={(e) => setUazapiData({ ...uazapiData, uazapi_admin_token: e.target.value })}
                        className="bg-slate-900 border-slate-600 text-white pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowPassword('uazapi')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showPasswords.uazapi ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-300">Ambiente</Label>
                    <div className="flex items-center gap-6 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="uazapi_env"
                          value="TESTE"
                          checked={uazapiData.uazapi_environment === 'TESTE'}
                          onChange={(e) => setUazapiData({ ...uazapiData, uazapi_environment: e.target.value })}
                          className="accent-primary"
                        />
                        <span className="text-slate-300">Teste</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="uazapi_env"
                          value="PRODUCAO"
                          checked={uazapiData.uazapi_environment === 'PRODUCAO'}
                          onChange={(e) => setUazapiData({ ...uazapiData, uazapi_environment: e.target.value })}
                          className="accent-primary"
                        />
                        <span className="text-slate-300">Produção</span>
                      </label>
                    </div>
                  </div>

                  <Button onClick={handleSaveUazapi} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar UAZAPI
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </div>

      {/* Company Dialog */}
      <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingCompany ? 'Atualize os dados da empresa' : 'Preencha os dados para criar uma nova empresa'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-slate-300">Nome *</Label>
              <Input
                placeholder="Nome da empresa"
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Email</Label>
              <Input
                type="email"
                placeholder="email@empresa.com"
                value={companyForm.email}
                onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Telefone</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={companyForm.phone}
                onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Máx. Usuários</Label>
                <Input
                  type="number"
                  min="1"
                  value={companyForm.max_users}
                  onChange={(e) => setCompanyForm({ ...companyForm, max_users: parseInt(e.target.value) || 5 })}
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Máx. Conexões</Label>
                <Input
                  type="number"
                  min="1"
                  value={companyForm.max_connections}
                  onChange={(e) => setCompanyForm({ ...companyForm, max_connections: parseInt(e.target.value) || 2 })}
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCompanyDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCompany} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingCompany ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhiteLabelConfig;
