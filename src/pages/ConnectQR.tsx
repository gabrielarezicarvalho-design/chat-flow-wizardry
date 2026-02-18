import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, CheckCircle2, Smartphone, Download, QrCode, Wifi } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

const ConnectQR = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionName, setConnectionName] = useState("");
  const [companyName, setCompanyName] = useState("MarketFlow");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#10b981");
  const [error, setError] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const celebrationFired = useRef(false);

  const fireCelebration = useCallback(() => {
    if (celebrationFired.current) return;
    celebrationFired.current = true;
    const duration = 3000;
    const end = Date.now() + duration;
    const colors = ['#22c55e', '#3b82f6', '#a855f7', '#eab308', '#ef4444'];
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const fetchQRCode = useCallback(async (action?: string) => {
    if (!id) return;

    try {
      const { data, error: fnError } = await supabase.functions.invoke("wa-public-qrcode", {
        body: { connection_id: id, action },
      });

      if (fnError) throw fnError;

      if (data?.connected) {
        setConnected(true);
        setConnectionName(data.name || "");
        fireCelebration();
        return;
      }

      setQrCode(data?.qrcode || null);
      setPairCode(data?.paircode || null);
      setConnectionName(data?.name || "");
      setCompanyName(data?.companyName || "MarketFlow");
      setLogoUrl(data?.logoUrl || null);
      setPrimaryColor(data?.primaryColor || "#10b981");
    } catch (err: any) {
      console.error("Error fetching QR:", err);
      setError("Conexão não encontrada ou link inválido.");
    }
  }, [id]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchQRCode();
      setLoading(false);
    };
    load();
  }, [fetchQRCode]);

  // Auto-refresh to check if connected
  useEffect(() => {
    if (connected || error) return;
    
    const interval = setInterval(async () => {
      await fetchQRCode();
    }, 5000);

    return () => clearInterval(interval);
  }, [connected, error, fetchQRCode]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchQRCode("refresh");
    setRefreshing(false);
    toast.success("QR Code atualizado!");
  };

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    await fetchQRCode();
    setCheckingStatus(false);
    if (!connected) {
      toast.info("Ainda não conectado. Escaneie o QR Code e tente novamente.");
    }
  };

  const handleDownloadQR = () => {
    if (!qrCode) return;
    const link = document.createElement("a");
    link.href = qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`;
    link.download = `qrcode-${connectionName || "conexao"}.png`;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0f172a" }}>
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#0f172a" }}>
        <Card className="max-w-md w-full bg-slate-900 border-slate-700">
          <CardContent className="p-8 text-center">
            <QrCode className="h-16 w-16 mx-auto mb-4 text-slate-500" />
            <h2 className="text-xl font-bold text-white mb-2">Link Inválido</h2>
            <p className="text-slate-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#0f172a" }}>
        <Card className="max-w-md w-full bg-slate-900 border-slate-700 animate-scale-in">
          <CardContent className="p-8 text-center">
            <div className="h-20 w-20 rounded-full mx-auto mb-6 flex items-center justify-center animate-fade-in" style={{ backgroundColor: `${primaryColor}20` }}>
              <CheckCircle2 className="h-10 w-10" style={{ color: primaryColor }} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Conectado!</h2>
            <p className="text-slate-400 mb-4">
              O WhatsApp <strong className="text-white">{connectionName}</strong> foi conectado com sucesso.
            </p>
            <Badge className="text-white mb-6" style={{ backgroundColor: primaryColor }}>
              <Wifi className="w-3 h-3 mr-1" />
              Online
            </Badge>
          </CardContent>
        </Card>
        <p className="fixed bottom-4 text-center text-xs text-slate-600 w-full">
          © {new Date().getFullYear()} {companyName}
        </p>
      </div>
    );
  }

  const qrSrc = qrCode
    ? qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`
    : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: "#0f172a" }}>
      <Card className="max-w-md w-full bg-slate-900 border-slate-700">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-12 mx-auto mb-3 object-contain" />
            ) : (
              <div className="h-14 w-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}aa)` }}>
                <Smartphone className="h-7 w-7 text-white" />
              </div>
            )}
            <h1 className="text-xl font-bold text-white">{companyName}</h1>
            <p className="text-slate-400 text-sm mt-1">Conecte seu WhatsApp</p>
            {connectionName && (
              <Badge variant="outline" className="mt-2 border-slate-600 text-slate-300">
                {connectionName}
              </Badge>
            )}
          </div>

          {/* QR Code */}
          <div className="bg-white rounded-2xl p-4 mb-6">
            {qrSrc ? (
              <img src={qrSrc} alt="QR Code" className="w-full aspect-square object-contain" />
            ) : (
              <div className="w-full aspect-square flex flex-col items-center justify-center text-slate-400">
                <QrCode className="h-16 w-16 mb-3 text-slate-300" />
                <p className="text-sm text-center">Clique em "Gerar QR Code" para começar</p>
              </div>
            )}
          </div>

          {/* Pair Code */}
          {pairCode && (
            <div className="mb-4 p-3 rounded-xl bg-slate-800 border border-slate-700 text-center">
              <p className="text-xs text-slate-400 mb-1">Código de pareamento</p>
              <p className="text-2xl font-mono font-bold tracking-widest text-white">{pairCode}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mb-3">
            <Button
              className="flex-1 text-white"
              style={{ backgroundColor: primaryColor }}
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {qrSrc ? "Atualizar QR" : "Gerar QR Code"}
            </Button>
            {qrSrc && (
              <Button variant="outline" className="border-slate-600 text-slate-300" onClick={handleDownloadQR}>
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Check Status Button */}
          {qrSrc && (
            <Button
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:text-white"
              onClick={handleCheckStatus}
              disabled={checkingStatus}
            >
              {checkingStatus ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Verificar se foi conectado
            </Button>
          )}

          {/* Instructions */}
          <div className="mt-6 space-y-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Como conectar</p>
            <div className="space-y-2 text-sm text-slate-400">
              <div className="flex gap-3 items-start">
                <span className="h-5 w-5 rounded-full text-xs flex items-center justify-center shrink-0 font-bold text-white" style={{ backgroundColor: primaryColor }}>1</span>
                <span>Abra o WhatsApp no seu celular</span>
              </div>
              <div className="flex gap-3 items-start">
                <span className="h-5 w-5 rounded-full text-xs flex items-center justify-center shrink-0 font-bold text-white" style={{ backgroundColor: primaryColor }}>2</span>
                <span>Toque em <strong className="text-slate-300">Configurações &gt; Aparelhos conectados</strong></span>
              </div>
              <div className="flex gap-3 items-start">
                <span className="h-5 w-5 rounded-full text-xs flex items-center justify-center shrink-0 font-bold text-white" style={{ backgroundColor: primaryColor }}>3</span>
                <span>Toque em <strong className="text-slate-300">Conectar um aparelho</strong> e escaneie o QR Code</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} {companyName}. Todos os direitos reservados.
      </p>
    </div>
  );
};

export default ConnectQR;
