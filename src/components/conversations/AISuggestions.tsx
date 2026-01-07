import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { useState } from "react";

interface AISuggestionsProps {
  onSelect: (text: string) => void;
}

export const AISuggestions = ({ onSelect }: AISuggestionsProps) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([
    "Olá! Fico feliz em ajudar. Poderia me dar mais detalhes sobre o que você precisa?",
    "Entendo sua situação. Vou verificar isso para você imediatamente.",
    "Agradeço o contato! Já estou encaminhando sua solicitação para o setor responsável."
  ]);

  const regenerate = () => {
    setLoading(true);
    // Simular geração de IA
    setTimeout(() => {
      setSuggestions([
        "Que ótimo! Vou te ajudar com isso agora mesmo.",
        "Perfeito! Deixa eu consultar essas informações para você.",
        "Sem problemas! Já estou resolvendo isso para você."
      ]);
      setLoading(false);
    }, 1000);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Sugestões de IA</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={regenerate} disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            className="w-full text-left justify-start h-auto py-3 px-4"
            onClick={() => onSelect(suggestion)}
          >
            <p className="text-sm text-muted-foreground line-clamp-2">{suggestion}</p>
          </Button>
        ))}
      </div>

      <div className="space-y-2 pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => onSelect("Poderia reformular isso de forma mais clara?")}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reformular resposta
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => onSelect("Vou melhorar a clareza da mensagem")}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Melhorar clareza
        </Button>
      </div>
    </Card>
  );
};