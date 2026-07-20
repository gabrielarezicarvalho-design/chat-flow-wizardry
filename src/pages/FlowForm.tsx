import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle, Clock, Send } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'phone' | 'textarea' | 'select';
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

interface FlowForm {
  id: string;
  connection_id: string;
  phone: string;
  initial_message: string | null;
  questions: Question[];
  answered: boolean;
  expires_at: string;
  created_at: string;
}

const FlowForm = () => {
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<FlowForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
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
      console.log('🔄 Loading form:', formId);
      
      const { data, error: fetchError } = await supabase
        .from('flow_forms' as any)
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

      const formData = data as unknown as FlowForm;
      
      // Check if expired
      const expiresAt = new Date(formData.expires_at);
      if (expiresAt < new Date()) {
        setExpired(true);
        setLoading(false);
        return;
      }

      // Check if already answered
      if (formData.answered) {
        setSubmitted(true);
        setLoading(false);
        return;
      }

      setForm(formData);
      setPhone(formData.phone || '');
      
      console.log('✅ Form loaded:', formData);
    } catch (err: any) {
      console.error('💥 Error:', err);
      setError('Erro ao carregar formulário');
    }

    setLoading(false);
  };

  const validatePhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!validatePhone(phone)) {
      toast.error('Telefone inválido');
      return;
    }

    // Validate required questions
    if (form?.questions) {
      for (const q of form.questions) {
        if (q.required && !answers[q.id]?.trim()) {
          toast.error(`Campo "${q.label}" é obrigatório`);
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      // Save response
      const { error: responseError } = await supabase
        .from('leads_forms_responses' as any)
        .insert({
          form_id: formId,
          connection_id: form?.connection_id,
          phone: phone.replace(/\D/g, ''),
          name: name.trim(),
          address: address.trim(),
          answers: answers,
        });

      if (responseError) {
        console.error('❌ Response error:', responseError);
        toast.error('Erro ao enviar dados');
        setSubmitting(false);
        return;
      }

      // Mark form as answered
      await supabase
        .from('flow_forms' as any)
        .update({ answered: true })
        .eq('id', formId);

      // Send WhatsApp confirmation
      try {
        await supabase.functions.invoke('wa-send-text', {
          body: {
            number: phone.replace(/\D/g, ''),
            text: '✅ Recebemos seus dados! Assim que nosso time estiver disponível, retornaremos seu atendimento.',
            instance_token: form?.connection_id,
            environment: 'PROD'
          }
        });
      } catch (msgError) {
        console.log('Mensagem de confirmação não enviada:', msgError);
      }

      setSubmitted(true);
      toast.success('Dados enviados com sucesso!');

    } catch (err: any) {
      console.error('💥 Submit error:', err);
      toast.error('Erro ao enviar dados');
    }

    setSubmitting(false);
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    if (cleaned.length <= 11) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
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

  // Expired state
  if (expired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-16 w-16 text-amber-500 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Formulário Expirado</h2>
            <p className="text-slate-400">Este formulário expirou. Solicite um novo atendimento.</p>
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
            <p className="text-slate-400 mb-2">Seus dados foram enviados com sucesso.</p>
            <p className="text-slate-500 text-sm">Nossa equipe retornará assim que possível.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <Send className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 font-['Space_Grotesk'] tracking-tight">NEXT PRO&nbsp;</h1>
          {form?.initial_message && (
            <p className="text-slate-400">{form.initial_message}</p>
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
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">
                  Nome completo <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                  required
                />
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-300">
                  Telefone <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="phone"
                  value={formatPhone(phone)}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="(00) 00000-0000"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                  required
                />
              </div>

              {/* Endereço */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-slate-300">
                  Endereço
                </Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Seu endereço"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>

              {/* Dynamic Questions */}
              {form?.questions && form.questions.length > 0 && (
                <>
                  <div className="border-t border-slate-700 pt-5">
                    <p className="text-sm text-slate-400 mb-4">Perguntas adicionais</p>
                  </div>
                  {form.questions.map((question) => (
                    <div key={question.id} className="space-y-2">
                      <Label htmlFor={question.id} className="text-slate-300">
                        {question.label} {question.required && <span className="text-red-400">*</span>}
                      </Label>
                      {question.type === 'textarea' ? (
                        <Textarea
                          id={question.id}
                          value={answers[question.id] || ''}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                          placeholder={question.placeholder || ''}
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20 min-h-[100px]"
                          required={question.required}
                        />
                      ) : question.type === 'select' && question.options ? (
                        <select
                          id={question.id}
                          value={answers[question.id] || ''}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                          className="w-full h-10 px-3 rounded-md bg-slate-700/50 border border-slate-600 text-white focus:border-emerald-500 focus:ring-emerald-500/20"
                          required={question.required}
                        >
                          <option value="">Selecione...</option>
                          {question.options.map((opt, idx) => (
                            <option key={idx} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          id={question.id}
                          type={question.type === 'email' ? 'email' : question.type === 'number' ? 'number' : 'text'}
                          value={answers[question.id] || ''}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                          placeholder={question.placeholder || ''}
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                          required={question.required}
                        />
                      )}
                    </div>
                  ))}
                </>
              )}

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
          Powered by NEXT PRO&nbsp;
        </p>
      </div>
    </div>
  );
};

export default FlowForm;
