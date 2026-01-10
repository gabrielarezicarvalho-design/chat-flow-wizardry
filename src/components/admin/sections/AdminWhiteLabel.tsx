import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  Plus, 
  Settings,
  Loader2,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const AdminWhiteLabel = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">White Label</h2>
          <p className="text-muted-foreground">Personalizações por empresa</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
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
              <div className="p-3 rounded-xl bg-green-500/10">
                <Palette className="h-6 w-6 text-green-500" />
              </div>
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
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Settings className="h-6 w-6 text-blue-500" />
              </div>
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
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma empresa cadastrada
            </div>
          ) : (
            <div className="space-y-4">
              {companies.map((company) => (
                <div 
                  key={company.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4">
                    {company.logo_url ? (
                      <img 
                        src={company.logo_url} 
                        alt={company.name}
                        className="h-10 w-10 rounded-lg object-contain"
                      />
                    ) : (
                      <div 
                        className="h-10 w-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${company.primary_color}20` }}
                      >
                        <Building2 
                          className="h-5 w-5"
                          style={{ color: company.primary_color }}
                        />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{company.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {company.slug || 'Sem identificador'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-4 w-4 rounded-full border"
                      style={{ backgroundColor: company.primary_color }}
                      title="Cor primária"
                    />
                    <Badge variant={company.is_active ? "default" : "secondary"}>
                      {company.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <p className="text-sm text-amber-300">
          💡 As empresas podem personalizar cores e logo através das configurações da conta.
          Para funcionalidades avançadas de white label (domínio customizado, Supabase separado), 
          será necessário criar a tabela white_label_partners.
        </p>
      </div>
    </div>
  );
};

export default AdminWhiteLabel;
