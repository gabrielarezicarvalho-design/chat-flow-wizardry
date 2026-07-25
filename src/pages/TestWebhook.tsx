import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const TestWebhook = () => {
  const [instanceId, setInstanceId] = useState("test-instance");
  const [fromNumber, setFromNumber] = useState("5511999999999@s.whatsapp.net");
  const [toNumber, setToNumber] = useState("5511888888888@s.whatsapp.net");
  const [messageText, setMessageText] = useState("Olá! Esta é uma mensagem de teste.");
  const [loading, setLoading] = useState(false);

  const handleTestWebhook = async () => {
    setLoading(true);
    try {
      const payload = {
        instanceId,
        message: {
          from: fromNumber,
          to: toNumber,
          text: {
            body: messageText
          },
          type: "chat",
          timestamp: Date.now(),
          fromMe: false
        }
      };

      const { data, error } = await supabase.functions.invoke('wa-webhook-listener', {
        body: payload
      });

      if (error) throw error;

      toast.success("Mensagem de teste enviada com sucesso!");
      console.log("Resposta do webhook:", data);
    } catch (error: any) {
      console.error("Erro ao testar webhook:", error);
      toast.error("Erro ao enviar mensagem de teste: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Testar Webhook</h1>
        <p className="text-muted-foreground mt-1">
          Simule o recebimento de mensagens via webhook Evolution
        </p>
      </div>

      <Card className="p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <Label htmlFor="instanceId">Instance ID</Label>
            <Input
              id="instanceId"
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
              placeholder="test-instance"
            />
          </div>

          <div>
            <Label htmlFor="fromNumber">De (Número)</Label>
            <Input
              id="fromNumber"
              value={fromNumber}
              onChange={(e) => setFromNumber(e.target.value)}
              placeholder="5511999999999@s.whatsapp.net"
            />
          </div>

          <div>
            <Label htmlFor="toNumber">Para (Número)</Label>
            <Input
              id="toNumber"
              value={toNumber}
              onChange={(e) => setToNumber(e.target.value)}
              placeholder="5511888888888@s.whatsapp.net"
            />
          </div>

          <div>
            <Label htmlFor="messageText">Mensagem</Label>
            <Textarea
              id="messageText"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Digite a mensagem de teste..."
              rows={4}
            />
          </div>

          <Button
            onClick={handleTestWebhook}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Enviando..." : "Enviar Mensagem de Teste"}
          </Button>
        </div>
      </Card>

      <Card className="p-6 max-w-2xl">
        <h3 className="font-semibold mb-4">Instruções:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Preencha os campos acima com os dados de teste</li>
          <li>Clique em "Enviar Mensagem de Teste"</li>
          <li>Verifique os logs da Edge Function wa-webhook-listener</li>
          <li>Acesse a página "Conversas em Tempo Real" para ver a mensagem</li>
          <li>A mensagem deve aparecer automaticamente em tempo real</li>
        </ol>
      </Card>
    </div>
  );
};

export default TestWebhook;
