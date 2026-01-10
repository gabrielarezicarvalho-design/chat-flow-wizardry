import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, Loader2, AlertCircle, Send, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface FormData {
  id: string;
  name: string;
  fields: FormField[];
  welcome_message: string;
  success_message: string;
}

const PublicForm = () => {
  const { token } = useParams<{ token: string }>();
  const [form, setForm] = useState<FormData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        // For now, show a demo form since tables don't exist
        setForm({
          id: 'demo',
          name: 'Formulário de Contato',
          fields: [
            { name: 'nome', label: 'Nome Completo', type: 'text', required: true, placeholder: 'Digite seu nome' },
            { name: 'email', label: 'E-mail', type: 'email', required: true, placeholder: 'seu@email.com' },
            { name: 'telefone', label: 'Telefone', type: 'phone', required: true, placeholder: '(00) 00000-0000' },
          ],
          welcome_message: 'Preencha os dados abaixo para entrarmos em contato',
          success_message: 'Obrigado! Entraremos em contato em breve.'
        });
        setLoading(false);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [token, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form) return;

    // Validate required fields
    for (const field of form.fields) {
      if (field.required && !answers[field.name]?.trim()) {
        toast.error(`${field.label} é obrigatório`);
        return;
      }
    }

    setSubmitting(true);
    
    // Simulate submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setSubmitted(true);
    toast.success('Formulário enviado com sucesso!');
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur border-border">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Oops!</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur border-border">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Enviado!</h2>
            <p className="text-muted-foreground">
              {form?.success_message || 'Obrigado! Sua solicitação foi registrada.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{form?.name || 'Formulário'} | MarketFlow</title>
        <meta name="description" content={form?.welcome_message || 'Preencha o formulário'} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={form?.name || 'Formulário de Contato'} />
        <meta property="og:description" content={form?.welcome_message || 'Preencha o formulário'} />
        <meta property="og:image" content="/og-form-image.png" />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-card/90 backdrop-blur border-border shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              {form?.name || 'Formulário de Contato'}
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              {form?.welcome_message || 'Preencha os dados abaixo'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {form?.fields.map((field, index) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name} className="text-foreground font-medium">
                    {index + 1}. {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>

                  {field.type === 'select' && field.options ? (
                    <Select 
                      value={answers[field.name] || ''} 
                      onValueChange={(v) => setAnswers(prev => ({ ...prev, [field.name]: v }))}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder={field.placeholder || 'Selecione...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                      placeholder={field.placeholder || `Digite ${field.label.toLowerCase()}`}
                      value={answers[field.name] || ''}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [field.name]: e.target.value }))}
                      className="bg-background border-border focus:border-primary"
                      required={field.required}
                    />
                  )}
                </div>
              ))}

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold mt-6"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Enviar Formulário
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default PublicForm;