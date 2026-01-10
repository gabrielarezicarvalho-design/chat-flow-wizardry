import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, FileText } from 'lucide-react';

const FormResponses = () => {
  const [search, setSearch] = useState('');

  // Simplified - no database query since table doesn't exist
  const responses: any[] = [];
  const isLoading = false;

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

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">Nenhuma resposta encontrada</p>
          <p className="text-muted-foreground text-sm">
            As respostas dos formulários aparecerão aqui
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FormResponses;