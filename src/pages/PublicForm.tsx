import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
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
  department_id: string | null;
  user_id: string;
}

const PublicForm = () => {
  const { token } = useParams<{ token: string }>();
  const [form, setForm] = useState<FormData | null>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('⏰ Timeout reached, stopping loading');
        setError('Tempo limite excedido. Tente novamente.');
        setLoading(false);
      }
    }, 10000);

    loadFormData();

    return () => clearTimeout(timeoutId);
  }, [token]);

  const loadFormData = async () => {
    console.log('🔄 Loading form data for token:', token);
    
    if (!token) {
      console.log('❌ No token provided');
      setError('Link inválido');
      setLoading(false);
      return;
    }

    try {
      // First get the submission to find the form
      console.log('📋 Fetching submission...');
      const submissionResult = await supabase
        .from('smart_form_submissions')
        .select('*')
        .eq('unique_token', token)
        .maybeSingle();

      console.log('📋 Submission result:', submissionResult);

      if (submissionResult.error) {
        console.error('❌ Submission error:', submissionResult.error);
        setError(submissionResult.error.message || 'Erro ao buscar formulário');
        setLoading(false);
        return;
      }
      
      if (!submissionResult.data) {
        console.log('❌ Submission not found');
        setError('Formulário não encontrado ou link expirado');
        setLoading(false);
        return;
      }

      const subData = submissionResult.data;
      setSubmission(subData);

      // Check if already submitted
      if (subData.submitted_at) {
        console.log('✅ Already submitted');
        setSubmitted(true);
        setLoading(false);
        return;
      }

      // Get the form configuration
      if (subData.form_id) {
        console.log('📝 Fetching form config for ID:', subData.form_id);
        const formResult = await supabase
          .from('smart_forms')
          .select('*')
          .eq('id', subData.form_id)
          .maybeSingle();

        console.log('📝 Form result:', formResult);

        if (formResult.error) {
          console.error('❌ Form error:', formResult.error);
          setError(formResult.error.message || 'Erro ao carregar formulário');
          setLoading(false);
          return;
        }
        
        if (!formResult.data) {
          console.log('❌ Form not found');
          setError('Configuração do formulário não encontrada');
          setLoading(false);
          return;
        }

        setForm(formResult.data as unknown as FormData);
        console.log('✅ Form loaded successfully');
        
        // Pre-fill phone if available
        if (subData.phone) {
          setAnswers(prev => ({ ...prev, telefone: subData.phone }));
        }
      } else {
        console.log('❌ No form_id in submission');
        setError('Formulário não configurado');
      }
    } catch (err: any) {
      console.error('💥 Error loading form:', err);
      setError(err?.message || 'Erro ao carregar formulário');
    }

    setLoading(false);
  };

  const validateField = (field: FormField, value: string): string | null => {
    if (field.required && !value.trim()) {
      return `${field.label} é obrigatório`;
    }

    if (!value.trim()) return null;

    switch (field.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Email inválido';
        break;
      case 'phone':
        const phoneClean = value.replace(/\D/g, '');
        if (phoneClean.length < 10 || phoneClean.length > 15) return 'Telefone inválido';
        break;
      case 'cpf':
        const cpfClean = value.replace(/\D/g, '');
        if (cpfClean.length !== 11) return 'CPF deve ter 11 dígitos';
        break;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form || !submission) return;

    // Validate all fields
    for (const field of form.fields) {
      const error = validateField(field, answers[field.name] || '');
      if (error) {
        toast.error(error);
        return;
      }
    }

    setSubmitting(true);

    try {
      // Extract name from answers
      const nameField = form.fields.find(f => 
        f.name.toLowerCase().includes('nome') || f.type === 'text'
      );
      const name = nameField ? answers[nameField.name] : null;

      // Update the submission
      const { error: updateError } = await supabase
        .from('smart_form_submissions' as any)
        .update({
          answers,
          name,
          status: 'aguardando_contato',
          submitted_at: new Date().toISOString()
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      // Call edge function to send WhatsApp confirmation
      try {
        await supabase.functions.invoke('smart-form-submit', {
          body: {
            submission_id: submission.id,
            answers,
            name
          }
        });
      } catch (e) {
        console.log('Confirmation message may not have been sent');
      }

      setSubmitted(true);
      toast.success('Formulário enviado com sucesso!');
    } catch (err: any) {
      console.error('Error submitting form:', err);
      toast.error('Erro ao enviar formulário');
    }

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
              {form?.success_message || 'Obrigado! Sua solicitação foi registrada. Nossa equipe entrará em contato em breve.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Dynamic SEO Meta Tags for Link Preview */}
      <Helmet>
        <title>{form?.name || 'Formulário'} | MarketFlow</title>
        <meta name="description" content={form?.welcome_message || 'Preencha o formulário para agilizar seu atendimento'} />
        
        {/* Open Graph for WhatsApp/Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={form?.name || 'Formulário de Contato'} />
        <meta property="og:description" content={form?.welcome_message || 'Preencha o formulário para agilizar seu atendimento'} />
        <meta property="og:image" content="https://ia.marketflowchat.com.br/og-form-image.png" />
        <meta property="og:url" content={`https://ia.marketflowchat.com.br/f/${token}`} />
        <meta property="og:site_name" content="MarketFlow" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={form?.name || 'Formulário de Contato'} />
        <meta name="twitter:description" content={form?.welcome_message || 'Preencha o formulário para agilizar seu atendimento'} />
        <meta name="twitter:image" content="https://ia.marketflowchat.com.br/og-form-image.png" />
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
