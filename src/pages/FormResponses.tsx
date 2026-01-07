import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, User, Phone, MapPin, Calendar, FileText, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FormResponse {
  id: string;
  form_id: string;
  connection_id: string | null;
  phone: string;
  name: string | null;
  address: string | null;
  answers: Record<string, any>;
  created_at: string;
}

const FormResponses = () => {
  const [search, setSearch] = useState('');
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);

  const { data: responses, isLoading } = useQuery({
    queryKey: ['leads_forms_responses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads_forms_responses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as FormResponse[];
    }
  });

  const filteredResponses = responses?.filter(response => {
    const searchLower = search.toLowerCase();
    return (
      response.name?.toLowerCase().includes(searchLower) ||
      response.phone?.includes(search) ||
      response.address?.toLowerCase().includes(searchLower)
    );
  });

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Respostas de Formulários</h1>
          <p className="text-muted-foreground">Leads capturados através dos formulários</p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {responses?.length || 0} leads
          </Badge>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou endereço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                  <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredResponses?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">Nenhuma resposta encontrada</p>
              <p className="text-muted-foreground text-sm">
                As respostas dos formulários aparecerão aqui
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResponses?.map((response) => (
              <Card 
                key={response.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => setSelectedResponse(response)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {response.name || 'Sem nome'}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {formatPhone(response.phone)}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {response.address && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{response.address}</span>
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(response.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    {Object.keys(response.answers || {}).length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {Object.keys(response.answers).length} respostas
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!selectedResponse} onOpenChange={() => setSelectedResponse(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span>{selectedResponse?.name || 'Sem nome'}</span>
                  <p className="text-sm font-normal text-muted-foreground">
                    {selectedResponse?.phone && formatPhone(selectedResponse.phone)}
                  </p>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {selectedResponse?.address && (
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Endereço</p>
                    <p className="text-sm text-muted-foreground">{selectedResponse.address}</p>
                  </div>
                </div>
              )}

              {selectedResponse?.answers && Object.keys(selectedResponse.answers).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Respostas do Formulário</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedResponse.answers).map(([key, value]) => (
                      <div key={key} className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-muted-foreground">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                <Calendar className="h-3 w-3" />
                Recebido em {selectedResponse && format(new Date(selectedResponse.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
  );
};

export default FormResponses;
