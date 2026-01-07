import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

interface SmartFormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'cpf' | 'address' | 'number' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface SmartForm {
  id: string;
  name: string;
  welcome_message: string;
  success_message: string;
  fields: SmartFormField[];
  is_active: boolean;
  user_id: string;
}

const SmartFormView = () => {
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<SmartForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    loadForm();
  }, [formId]);

  const loadForm = async () => {
    if (!formId) {
      setError('Link inválido');
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 Loading smart form:', formId);
      
      const { data, error: fetchError } = await supabase
        .from('smart_forms')
        .select('*')
        .eq('id', formId)
        .maybeSingle();

      if (fetchError) {
        console.error('❌ Fetch error:', fetchError);
        setError('Erro ao carregar formulário');
        setLoading(false);
        return;
      }

      if (!data) {
        setError('Formulário não encontrado');
        setLoading(false);
        return;
      }

      if (!data.is_active) {
        setError('Este formulário está desativado');
        setLoading(false);
        return;
      }

      const formData: SmartForm = {
        id: data.id,
        name: data.name,
        welcome_message: data.welcome_message || '',
        success_message: data.success_message || 'Obrigado! Seus dados foram enviados.',
        fields: data.fields as unknown as SmartFormField[],
        is_active: data.is_active ?? true,
        user_id: data.user_id,
      };
      
      setForm(formData);
      console.log('✅ Smart form loaded:', formData);
    } catch (err: any) {
      console.error('💥 Error:', err);
      setError('Erro ao carregar formulário');
    }

    setLoading(false);
  };

  const validateField = (field: SmartFormField, value: string): boolean => {
    if (!field.required && !value.trim()) return true;
    
    switch (field.type) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'phone':
        return /^\d{10,11}$/.test(value.replace(/\D/g, ''));
      case 'cpf':
        return /^\d{11}$/.test(value.replace(/\D/g, ''));
      default:
        return value.trim().length > 0;
    }
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    if (cleaned.length <= 11) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form) return;

    // Validate all required fields
    for (const field of form.fields) {
      const value = answers[field.name] || '';
      if (field.required && !value.trim()) {
        toast.error(`Campo "${field.label}" é obrigatório`);
        return;
      }
      if (!validateField(field, value)) {
        toast.error(`Campo "${field.label}" inválido`);
        return;
      }
    }

    setSubmitting(true);

    try {
      // Extract phone and name from answers
      const phoneField = form.fields.find(f => f.type === 'phone');
      const nameField = form.fields.find(f => f.name === 'nome' || f.label.toLowerCase().includes('nome'));
      
      const phone = phoneField ? (answers[phoneField.name] || '').replace(/\D/g, '') : '';
      const name = nameField ? answers[nameField.name] || '' : '';

      // Save submission
      const { error: submitError } = await supabase
        .from('smart_form_submissions')
        .insert({
          form_id: formId,
          user_id: form.user_id,
          phone: phone || 'sem-telefone',
          name: name || null,
          answers: answers,
          status: 'pendente',
          unique_token: crypto.randomUUID().slice(0, 8),
          submitted_at: new Date().toISOString(),
        });

      if (submitError) {
        console.error('❌ Submit error:', submitError);
        toast.error('Erro ao enviar dados');
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      toast.success('Dados enviados com sucesso!');

    } catch (err: any) {
      console.error('💥 Submit error:', err);
      toast.error('Erro ao enviar dados');
    }

    setSubmitting(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mb-4" />
            <p className="text-slate-300">Carregando formulário...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Erro</h2>
            <p className="text-slate-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
              <CheckCircle className="h-12 w-12 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-3">Obrigado!</h2>
            <p className="text-slate-400 mb-2">{form?.success_message}</p>
            <p className="text-slate-500 text-sm">Nossa equipe retornará assim que possível.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form state
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
        <meta property="og:url" content={`https://ia.marketflowchat.com.br/formulario/${formId}`} />
        <meta property="og:site_name" content="MarketFlow" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={form?.name || 'Formulário de Contato'} />
        <meta name="twitter:description" content={form?.welcome_message || 'Preencha o formulário para agilizar seu atendimento'} />
        <meta name="twitter:image" content="https://ia.marketflowchat.com.br/og-form-image.png" />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <Send className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{form?.name || 'MarketFlow'}</h1>
          {form?.welcome_message && (
            <p className="text-slate-400">{form.welcome_message}</p>
          )}
        </div>

        {/* Form Card */}
        <Card className="bg-slate-800/50 border-slate-700 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white">Preencha seus dados</CardTitle>
            <CardDescription className="text-slate-400">
              Complete o formulário para agilizar seu atendimento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {form?.fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name} className="text-slate-300">
                    {field.label} {field.required && <span className="text-red-400">*</span>}
                  </Label>
                  {field.type === 'select' && field.options ? (
                    <select
                      id={field.name}
                      value={answers[field.name] || ''}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [field.name]: e.target.value }))}
                      className="w-full h-10 px-3 rounded-md bg-slate-700/50 border border-slate-600 text-white focus:border-emerald-500 focus:ring-emerald-500/20"
                      required={field.required}
                    >
                      <option value="">Selecione...</option>
                      {field.options.map((opt, idx) => (
                        <option key={idx} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === 'phone' ? (
                    <Input
                      id={field.name}
                      value={formatPhone(answers[field.name] || '')}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [field.name]: e.target.value.replace(/\D/g, '') }))}
                      placeholder={field.placeholder || '(00) 00000-0000'}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                      required={field.required}
                    />
                  ) : field.type === 'cpf' ? (
                    <Input
                      id={field.name}
                      value={formatCPF(answers[field.name] || '')}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [field.name]: e.target.value.replace(/\D/g, '') }))}
                      placeholder={field.placeholder || '000.000.000-00'}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                      required={field.required}
                    />
                  ) : field.type === 'address' ? (
                    <Textarea
                      id={field.name}
                      value={answers[field.name] || ''}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [field.name]: e.target.value }))}
                      placeholder={field.placeholder || 'Rua, número, bairro, cidade'}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20 min-h-[80px]"
                      required={field.required}
                    />
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}
                      value={answers[field.name] || ''}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [field.name]: e.target.value }))}
                      placeholder={field.placeholder || ''}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                      required={field.required}
                    />
                  )}
                </div>
              ))}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold text-lg shadow-lg shadow-emerald-500/20 transition-all duration-200"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    Enviar Dados
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

          {/* Footer */}
          <p className="text-center text-slate-500 text-sm mt-6">
            Powered by MarketFlow
          </p>
        </div>
      </div>
    </>
  );
};

export default SmartFormView;
