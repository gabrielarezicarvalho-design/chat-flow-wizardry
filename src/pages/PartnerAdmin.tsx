import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import {
  Loader2, Building2, Users, Wifi, BarChart3, Plus, Search,
  Edit, Trash2, Check, X, Settings, LogOut, MessageSquare,
  Phone, Shield, UserPlus, RefreshCw, Activity, TrendingUp,
  Hash, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PartnerConfig {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  supabase_url: string | null;
  supabase_anon_key: string | null;
  supabase_service_role_key: string | null;
  uazapi_base_url: string | null;
  uazapi_admin_token: string | null;
}

interface Company {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  max_users: number;
  max_connections: number;
  plan: string | null;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  phone: string | null;
  company_id: string | null;
  is_company_admin: boolean | null;
  is_online: boolean | null;
  created_at: string | null;
}

interface Connection {
  id: string;
  name: string | null;
  phone_number: string | null;
  platform: string | null;
  status: string | null;
  is_active: boolean | null;
  company_id: string | null;
  created_at: string | null;
}

interface DashboardStats {
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
  onlineUsers: number;
  totalConnections: number;
  activeConnections: number;
  totalConversations: number;
}

const PartnerAdmin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerConfig | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Data states
  const [stats, setStats] = useState<DashboardStats>({ totalCompanies: 0, activeCompanies: 0, totalUsers: 0, onlineUsers: 0, totalConnections: 0, activeConnections: 0, totalConversations: 0 });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Company dialog
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({ name: '', max_users: 5, max_connections: 2, plan: 'basic' });

  // User dialog
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userForm, setUserForm] = useState({ full_name: '', username: '', phone: '', company_id: '', is_company_admin: false });

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const storedPartner = localStorage.getItem('white_label_partner');
    const configAccess = sessionStorage.getItem('white_label_config_access');
    if (!storedPartner || !configAccess) { navigate('/entrar-white-label'); return; }
    const partnerInfo = JSON.parse(storedPartner);
    fetchPartner(partnerInfo.id);
  }, [navigate]);

  const fetchPartner = async (partnerId: string) => {
    try {
      const { data, error } = await (supabase
        .from('white_label_partners' as any)
        .select('*')
        .eq('id', partnerId)
        .maybeSingle() as any);
      if (error) throw error;
      if (data) setPartner(data as any);
    } catch (err) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const partnerDb = useMemo(() => {
    if (partner?.supabase_url && partner?.supabase_anon_key) {
      return createClient(partner.supabase_url, partner.supabase_anon_key);
    }
    return null;
  }, [partner?.supabase_url, partner?.supabase_anon_key]);

  const serviceDb = useMemo(() => {
    if (partner?.supabase_url && partner?.supabase_service_role_key) {
      return createClient(partner.supabase_url, partner.supabase_service_role_key);
    }
    return null;
  }, [partner?.supabase_url, partner?.supabase_service_role_key]);

  // Fetch all data
  const fetchAllData = async () => {
    if (!serviceDb) return;
    setLoadingData(true);
    try {
      const [companiesRes, usersRes, connectionsRes, conversationsRes] = await Promise.all([
        serviceDb.from('companies').select('*').order('created_at', { ascending: false }),
        serviceDb.from('profiles').select('*').order('created_at', { ascending: false }),
        serviceDb.from('connections').select('*').order('created_at', { ascending: false }),
        serviceDb.from('conversations').select('id', { count: 'exact', head: true }),
      ]);

      const comps = companiesRes.data || [];
      const usrs = usersRes.data || [];
      const conns = connectionsRes.data || [];

      setCompanies(comps);
      setUsers(usrs);
      setConnections(conns);
      setStats({
        totalCompanies: comps.length,
        activeCompanies: comps.filter((c: any) => c.is_active).length,
        totalUsers: usrs.length,
        onlineUsers: usrs.filter((u: any) => u.is_online).length,
        totalConnections: conns.length,
        activeConnections: conns.filter((c: any) => c.is_active).length,
        totalConversations: conversationsRes.count || 0,
      });
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      toast.error('Erro ao carregar dados do sistema');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (partner && serviceDb) fetchAllData();
  }, [partner, serviceDb]);

  // Company CRUD
  const handleSaveCompany = async () => {
    if (!companyForm.name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!serviceDb) { toast.error('Configure o Supabase primeiro'); return; }
    try {
      if (editingCompany) {
        const { error } = await serviceDb.from('companies').update({
          name: companyForm.name, max_users: companyForm.max_users,
          max_connections: companyForm.max_connections, plan: companyForm.plan,
        }).eq('id', editingCompany.id);
        if (error) throw error;
        toast.success('Empresa atualizada!');
      } else {
        const { error } = await serviceDb.from('companies').insert({
          name: companyForm.name, max_users: companyForm.max_users,
          max_connections: companyForm.max_connections, plan: companyForm.plan,
        });
        if (error) throw error;
        toast.success('Empresa criada!');
      }
      setCompanyDialogOpen(false);
      setEditingCompany(null);
      fetchAllData();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  };

  const handleDeleteCompany = async (company: Company) => {
    if (!confirm(`Excluir "${company.name}"? Todos os dados serão perdidos.`)) return;
    if (!serviceDb) return;
    try {
      const { error } = await serviceDb.from('companies').delete().eq('id', company.id);
      if (error) throw error;
      toast.success('Empresa excluída!');
      fetchAllData();
    } catch (err: any) {
      toast.error('Erro ao excluir empresa');
    }
  };

  const handleToggleCompany = async (company: Company) => {
    if (!serviceDb) return;
    try {
      await serviceDb.from('companies').update({ is_active: !company.is_active }).eq('id', company.id);
      toast.success(company.is_active ? 'Empresa desativada' : 'Empresa ativada');
      fetchAllData();
    } catch { toast.error('Erro ao alterar status'); }
  };

  // Connection toggle
  const handleToggleConnection = async (conn: Connection) => {
    if (!serviceDb) return;
    try {
      await serviceDb.from('connections').update({ is_active: !conn.is_active }).eq('id', conn.id);
      toast.success(conn.is_active ? 'Conexão desativada' : 'Conexão ativada');
      fetchAllData();
    } catch { toast.error('Erro ao alterar conexão'); }
  };

  const handleDeleteConnection = async (conn: Connection) => {
    if (!confirm(`Excluir conexão "${conn.name || conn.phone_number}"?`)) return;
    if (!serviceDb) return;
    try {
      await serviceDb.from('connections').delete().eq('id', conn.id);
      toast.success('Conexão excluída!');
      fetchAllData();
    } catch { toast.error('Erro ao excluir conexão'); }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('white_label_config_access');
    navigate('/entrar-white-label');
  };

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return '-';
    return companies.find(c => c.id === companyId)?.name || 'Desconhecida';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!partner) return null;

  const noSupabase = !partner.supabase_url || !partner.supabase_service_role_key;

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'companies', label: 'Empresas', icon: Building2 },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'connections', label: 'Conexões', icon: Wifi },
    { id: 'conversations', label: 'Conversas', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0F172A' }}>
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-700 flex flex-col" style={{ backgroundColor: '#0F172A' }}>
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            {partner.logo_url && <img src={partner.logo_url} alt="Logo" className="h-8 w-8 rounded" />}
            <div>
              <h2 className="text-sm font-bold text-white truncate">{partner.name}</h2>
              <p className="text-xs text-slate-400">Admin do Parceiro</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeTab === item.id
                  ? 'bg-primary text-white font-medium'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-2 border-t border-slate-700 space-y-1">
          <button
            onClick={() => navigate('/white-label-config')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Settings className="h-4 w-4" />
            Configurações
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {noSupabase ? (
            <Card className="bg-amber-500/10 border-amber-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-amber-500/20"><Shield className="h-6 w-6 text-amber-400" /></div>
                  <div>
                    <h3 className="text-lg font-semibold text-amber-300">Supabase não configurado</h3>
                    <p className="text-amber-200/80 mt-1">Configure as credenciais do Supabase nas configurações para gerenciar seu sistema.</p>
                    <Button className="mt-4" onClick={() => navigate('/white-label-config')}>
                      <Settings className="h-4 w-4 mr-2" /> Ir para Configurações
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Dashboard */}
              {activeTab === 'dashboard' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                      <p className="text-slate-400">Visão geral do seu sistema</p>
                    </div>
                    <Button variant="outline" onClick={fetchAllData} disabled={loadingData} className="border-slate-600 text-slate-300">
                      <RefreshCw className={`h-4 w-4 mr-2 ${loadingData ? 'animate-spin' : ''}`} />
                      Atualizar
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Empresas', value: stats.totalCompanies, sub: `${stats.activeCompanies} ativas`, icon: Building2, color: 'text-blue-400' },
                      { label: 'Usuários', value: stats.totalUsers, sub: `${stats.onlineUsers} online`, icon: Users, color: 'text-emerald-400' },
                      { label: 'Conexões WhatsApp', value: stats.totalConnections, sub: `${stats.activeConnections} ativas`, icon: Phone, color: 'text-green-400' },
                      { label: 'Conversas', value: stats.totalConversations, sub: 'total', icon: MessageSquare, color: 'text-purple-400' },
                    ].map((item, i) => (
                      <Card key={i} className="bg-slate-800/50 border-slate-700">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-400">{item.label}</p>
                              <p className="text-3xl font-bold text-white mt-1">{loadingData ? '...' : item.value}</p>
                              <p className="text-xs text-slate-500 mt-1">{item.sub}</p>
                            </div>
                            <div className={`p-3 rounded-lg bg-slate-700/50 ${item.color}`}>
                              <item.icon className="h-6 w-6" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Recent companies */}
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Empresas Recentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {companies.length === 0 ? (
                        <p className="text-slate-400 text-sm text-center py-8">Nenhuma empresa cadastrada</p>
                      ) : (
                        <div className="space-y-3">
                          {companies.slice(0, 5).map((company) => (
                            <div key={company.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50">
                              <div className="flex items-center gap-3">
                                <Building2 className="h-5 w-5 text-slate-400" />
                                <div>
                                  <p className="text-sm font-medium text-white">{company.name}</p>
                                  <p className="text-xs text-slate-500">{company.max_users} usuários • {company.max_connections} conexões</p>
                                </div>
                              </div>
                              <Badge className={company.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                                {company.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Companies */}
              {activeTab === 'companies' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-white">Empresas</h1>
                      <p className="text-slate-400">Gerencie as empresas do seu sistema</p>
                    </div>
                    <Button onClick={() => { setEditingCompany(null); setCompanyForm({ name: '', max_users: 5, max_connections: 2, plan: 'basic' }); setCompanyDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" /> Nova Empresa
                    </Button>
                  </div>

                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="Buscar empresa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-slate-900 border-slate-600 text-white" />
                  </div>

                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="pt-6">
                      {loadingData ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-700">
                              <TableHead className="text-slate-400">Nome</TableHead>
                              <TableHead className="text-slate-400">Plano</TableHead>
                              <TableHead className="text-slate-400">Limites</TableHead>
                              <TableHead className="text-slate-400">Status</TableHead>
                              <TableHead className="text-slate-400 text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {companies
                              .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
                              .map((company) => (
                                <TableRow key={company.id} className="border-slate-700">
                                  <TableCell className="text-white font-medium">{company.name}</TableCell>
                                  <TableCell><Badge variant="outline" className="text-slate-300 border-slate-600">{company.plan || 'basic'}</Badge></TableCell>
                                  <TableCell className="text-slate-400 text-sm">{company.max_users} users • {company.max_connections} conn</TableCell>
                                  <TableCell>
                                    <Badge className={company.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                                      {company.is_active ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button variant="ghost" size="icon" onClick={() => handleToggleCompany(company)}>
                                        {company.is_active ? <X className="h-4 w-4 text-slate-400" /> : <Check className="h-4 w-4 text-slate-400" />}
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => {
                                        setEditingCompany(company);
                                        setCompanyForm({ name: company.name, max_users: company.max_users, max_connections: company.max_connections, plan: company.plan || 'basic' });
                                        setCompanyDialogOpen(true);
                                      }}>
                                        <Edit className="h-4 w-4 text-slate-400" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCompany(company)}>
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
                </motion.div>
              )}

              {/* Users */}
              {activeTab === 'users' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-white">Usuários</h1>
                      <p className="text-slate-400">Todos os usuários do sistema</p>
                    </div>
                    <Button variant="outline" onClick={fetchAllData} disabled={loadingData} className="border-slate-600 text-slate-300">
                      <RefreshCw className={`h-4 w-4 mr-2 ${loadingData ? 'animate-spin' : ''}`} />
                      Atualizar
                    </Button>
                  </div>

                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="Buscar usuário..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-slate-900 border-slate-600 text-white" />
                  </div>

                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="pt-6">
                      {loadingData ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-700">
                              <TableHead className="text-slate-400">Nome</TableHead>
                              <TableHead className="text-slate-400">Username</TableHead>
                              <TableHead className="text-slate-400">Empresa</TableHead>
                              <TableHead className="text-slate-400">Admin</TableHead>
                              <TableHead className="text-slate-400">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {users
                              .filter(u => 
                                (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (u.username || '').toLowerCase().includes(searchTerm.toLowerCase())
                              )
                              .map((user) => (
                                <TableRow key={user.id} className="border-slate-700">
                                  <TableCell className="text-white font-medium">{user.full_name || '-'}</TableCell>
                                  <TableCell className="text-slate-400">{user.username || '-'}</TableCell>
                                  <TableCell className="text-slate-400 text-sm">{getCompanyName(user.company_id)}</TableCell>
                                  <TableCell>
                                    {user.is_company_admin && <Badge className="bg-blue-500/20 text-blue-400">Admin</Badge>}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className={`h-2 w-2 rounded-full ${user.is_online ? 'bg-green-400' : 'bg-slate-600'}`} />
                                      <span className="text-xs text-slate-400">{user.is_online ? 'Online' : 'Offline'}</span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Connections */}
              {activeTab === 'connections' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-white">Conexões WhatsApp</h1>
                      <p className="text-slate-400">Gerencie as conexões de WhatsApp do sistema</p>
                    </div>
                    <Button variant="outline" onClick={fetchAllData} disabled={loadingData} className="border-slate-600 text-slate-300">
                      <RefreshCw className={`h-4 w-4 mr-2 ${loadingData ? 'animate-spin' : ''}`} />
                      Atualizar
                    </Button>
                  </div>

                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="pt-6">
                      {loadingData ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                      ) : connections.length === 0 ? (
                        <div className="text-center py-12">
                          <Wifi className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                          <p className="text-slate-400">Nenhuma conexão encontrada</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-700">
                              <TableHead className="text-slate-400">Nome</TableHead>
                              <TableHead className="text-slate-400">Número</TableHead>
                              <TableHead className="text-slate-400">Empresa</TableHead>
                              <TableHead className="text-slate-400">Plataforma</TableHead>
                              <TableHead className="text-slate-400">Status</TableHead>
                              <TableHead className="text-slate-400 text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {connections.map((conn) => (
                              <TableRow key={conn.id} className="border-slate-700">
                                <TableCell className="text-white font-medium">{conn.name || '-'}</TableCell>
                                <TableCell className="text-slate-400">{conn.phone_number || '-'}</TableCell>
                                <TableCell className="text-slate-400 text-sm">{getCompanyName(conn.company_id)}</TableCell>
                                <TableCell><Badge variant="outline" className="text-slate-300 border-slate-600">{conn.platform || 'uazapi'}</Badge></TableCell>
                                <TableCell>
                                  <Badge className={conn.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                                    {conn.is_active ? 'Ativa' : 'Inativa'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleToggleConnection(conn)}>
                                      {conn.is_active ? <X className="h-4 w-4 text-slate-400" /> : <Check className="h-4 w-4 text-slate-400" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteConnection(conn)}>
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
                </motion.div>
              )}

              {/* Conversations */}
              {activeTab === 'conversations' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-white">Conversas</h1>
                    <p className="text-slate-400">Visão geral das conversas do sistema</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: 'Total de Conversas', value: stats.totalConversations, icon: MessageSquare },
                      { label: 'Conexões Ativas', value: stats.activeConnections, icon: Wifi },
                      { label: 'Empresas Ativas', value: stats.activeCompanies, icon: Building2 },
                    ].map((item, i) => (
                      <Card key={i} className="bg-slate-800/50 border-slate-700">
                        <CardContent className="pt-6 flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-slate-700/50">
                            <item.icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-white">{loadingData ? '...' : item.value}</p>
                            <p className="text-sm text-slate-400">{item.label}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="pt-6">
                      <p className="text-slate-400 text-sm text-center py-8">
                        As conversas são gerenciadas individualmente por cada empresa através do painel de atendimento. 
                        Aqui você tem a visão consolidada de todas as conversas do sistema.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Company Dialog */}
      <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">{editingCompany ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingCompany ? 'Atualize os dados da empresa' : 'Preencha os dados para criar uma nova empresa'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Nome da Empresa</Label>
              <Input value={companyForm.name} onChange={(e) => setCompanyForm(f => ({ ...f, name: e.target.value }))} className="bg-slate-900 border-slate-600 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Máx. Usuários</Label>
                <Input type="number" value={companyForm.max_users} onChange={(e) => setCompanyForm(f => ({ ...f, max_users: parseInt(e.target.value) || 1 }))} className="bg-slate-900 border-slate-600 text-white" />
              </div>
              <div>
                <Label className="text-slate-300">Máx. Conexões</Label>
                <Input type="number" value={companyForm.max_connections} onChange={(e) => setCompanyForm(f => ({ ...f, max_connections: parseInt(e.target.value) || 1 }))} className="bg-slate-900 border-slate-600 text-white" />
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Plano</Label>
              <Select value={companyForm.plan} onValueChange={(v) => setCompanyForm(f => ({ ...f, plan: v }))}>
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompanyDialogOpen(false)} className="border-slate-600 text-slate-300">Cancelar</Button>
            <Button onClick={handleSaveCompany}>{editingCompany ? 'Atualizar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerAdmin;
