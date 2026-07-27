import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, ShieldCheck, CheckCircle2 } from "lucide-react";

const DataDeletion = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      toast.error("Preencha pelo menos nome e e-mail.");
      return;
    }
    setLoading(true);
    // Simulate submission
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
  return (
      <div className="light min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-10 pb-10 space-y-4">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-bold">Solicitação Enviada</h2>
            <p className="text-muted-foreground">
              Sua solicitação de exclusão de dados foi recebida com sucesso. 
              Processaremos seu pedido em até <strong>15 dias úteis</strong> e 
              enviaremos uma confirmação para o e-mail informado.
            </p>
            <p className="text-sm text-muted-foreground">
              Código de referência: <strong>DEL-{Date.now().toString(36).toUpperCase()}</strong>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="light min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-destructive/10">
            <Trash2 className="h-7 w-7 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Exclusão de Dados</CardTitle>
          <CardDescription className="text-base">
            Em conformidade com a LGPD e políticas da Meta, você pode solicitar 
            a exclusão dos seus dados pessoais armazenados em nosso aplicativo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+55 (11) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo da solicitação..."
                rows={3}
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-3 flex gap-3 items-start">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Ao enviar esta solicitação, todos os seus dados pessoais serão 
                permanentemente removidos de nossos sistemas em até 15 dias úteis. 
                Esta ação é irreversível.
              </p>
            </div>

            <Button type="submit" className="w-full" variant="destructive" disabled={loading}>
              {loading ? "Enviando..." : "Solicitar Exclusão de Dados"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataDeletion;
