import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Loader2, Copy, Check, Trash2, Plus, Terminal, Send, X, Upload, Image as ImageIcon, Link, Video, FileText, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadToCloud } from "@/lib/cloud-storage";

interface Connection {
  id: string;
  name: string;
  status: string;
  token?: string;
}

interface ApiTesterProps {
  connections: Connection[];
}

type TestAction = "text" | "image" | "video" | "document" | "audio" | "button" | "list" | "carousel" | "poll";

interface TestResult {
  success: boolean;
  timestamp: string;
  action: string;
  number: string;
  response: any;
  duration: number;
}

interface CarouselButton {
  id: string;
  text: string;
  type: "REPLY" | "URL" | "COPY" | "CALL";
}

interface CarouselCard {
  text: string;
  image: string;
  buttons: CarouselButton[];
}

export function ApiTester({ connections }: ApiTesterProps) {
  const [selectedConnection, setSelectedConnection] = useState("");
  const [testNumber, setTestNumber] = useState("");
  const [testAction, setTestAction] = useState<TestAction>("text");
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [copied, setCopied] = useState(false);

  // Message fields
  const [textMessage, setTextMessage] = useState("Olá! Esta é uma mensagem de teste.");
  
  // Media fields
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaCaption, setMediaCaption] = useState("");
  const [docName, setDocName] = useState("documento.pdf");
  const [mediaMode, setMediaMode] = useState<"url" | "upload">("upload");
  const [uploading, setUploading] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Interactive fields - Button
  const [menuText, setMenuText] = useState("Selecione uma opção:");
  const [footerText, setFooterText] = useState("");
  const [buttonImageUrl, setButtonImageUrl] = useState("");
  // UZAPI button format: "texto|id" or "texto|copy:codigo" or "texto|call:numero" or "texto|url"
  const [buttonChoices, setButtonChoices] = useState<{ label: string; action: string; type: "REPLY" | "URL" | "COPY" | "CALL" }[]>([
    { label: "Opção 1", action: "opcao_1", type: "REPLY" },
    { label: "Opção 2", action: "opcao_2", type: "REPLY" }
  ]);

  // List fields
  const [listButtonText, setListButtonText] = useState("Ver opções");
  const [listItems, setListItems] = useState([
    { title: "Item 1", id: "item_1", description: "Descrição do item 1" },
    { title: "Item 2", id: "item_2", description: "Descrição do item 2" }
  ]);

  // Poll fields
  const [pollOptions, setPollOptions] = useState(["Opção 1", "Opção 2", "Opção 3"]);
  const [pollSelectableCount, setPollSelectableCount] = useState(1);

  // Carousel fields - using /send/carousel format
  const [carouselCards, setCarouselCards] = useState<CarouselCard[]>([
    { 
      text: "Produto 1\nDescrição do produto", 
      image: "https://picsum.photos/300/200", 
      buttons: [
        { id: "comprar_1", text: "Comprar", type: "REPLY" },
        { id: "https://example.com", text: "Ver mais", type: "URL" }
      ] 
    }
  ]);

  const addResult = (result: TestResult) => {
    setResults(prev => [result, ...prev].slice(0, 20));
  };

  const clearResults = () => {
    setResults([]);
  };

  const handleFileUpload = async (file: File, type: string) => {
    if (file.size > 16 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 16MB)");
      return;
    }

    setUploading(true);
    try {
      const uploadResult = await uploadToCloud(file);
      if (!uploadResult.success) throw new Error(uploadResult.error || 'Erro no upload');

      setMediaUrl(uploadResult.url);
      
      if (type.startsWith("image") || type.startsWith("video")) {
        setPreviewMedia(URL.createObjectURL(file));
      } else {
        setPreviewMedia(null);
      }
      
      toast.success("Arquivo carregado!");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(`Erro no upload: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const runTest = async () => {
    if (!selectedConnection) {
      toast.error("Selecione uma conexão");
      return;
    }
    if (!testNumber) {
      toast.error("Digite um número de teste");
      return;
    }

    setTesting(true);
    const startTime = Date.now();

    try {
      const formattedNumber = testNumber.replace(/\D/g, "") + "@s.whatsapp.net";
      let payload: any = {
        action: "direct",
        connectionId: selectedConnection,
        numbers: [formattedNumber]
      };

      switch (testAction) {
        case "text":
          payload.type = "text";
          payload.text = textMessage;
          break;

        case "image":
        case "video":
        case "audio":
        case "document":
          payload.type = testAction;
          payload.media = mediaUrl;
          payload.text = mediaCaption; // UZAPI uses 'text' for caption
          if (testAction === "document") {
            payload.docName = docName;
          }
          break;

        case "button":
          // UZAPI: type "button" with choices array
          // Format based on type: "texto|id", "texto|copy:codigo", "texto|call:numero", "texto|https://url"
          payload.type = "button";
          payload.text = menuText;
          payload.choices = buttonChoices
            .filter(b => b.label.trim())
            .map(b => {
              switch (b.type) {
                case "URL":
                  return `${b.label}|${b.action}`;
                case "COPY":
                  return `${b.label}|copy:${b.action}`;
                case "CALL":
                  return `${b.label}|call:${b.action}`;
                case "REPLY":
                default:
                  return `${b.label}|${b.action}`;
              }
            });
          if (footerText) payload.footerText = footerText;
          if (buttonImageUrl) payload.imageButton = buttonImageUrl;
          break;

        case "list":
          // UZAPI: type "list" with choices array
          // Format: "[Titulo Seção]", "titulo|id|descrição"
          payload.type = "list";
          payload.text = menuText;
          payload.listButton = listButtonText;
          payload.choices = listItems
            .filter(i => i.title.trim())
            .map(i => {
              if (i.description) {
                return `${i.title}|${i.id || i.title}|${i.description}`;
              } else {
                return `${i.title}|${i.id || i.title}`;
              }
            });
          if (footerText) payload.footerText = footerText;
          break;

        case "poll":
          // UZAPI: type "poll" with choices array
          payload.type = "poll";
          payload.text = menuText;
          payload.choices = pollOptions.filter(o => o.trim());
          payload.selectableCount = pollSelectableCount;
          break;

        case "carousel":
          // UZAPI: /send/carousel with carousel array
          payload.type = "carousel";
          payload.text = menuText;
          payload.carousel = carouselCards
            .filter(c => c.text.trim())
            .map(card => ({
              text: card.text,
              image: card.image,
              buttons: card.buttons
                .filter(b => b.text.trim())
                .map(b => ({
                  id: b.id,
                  text: b.text,
                  type: b.type
                }))
            }));
          break;
      }

      console.log("[ApiTester] Sending payload:", JSON.stringify(payload, null, 2));

      const { data, error } = await supabase.functions.invoke("wa-sender", { body: payload });

      const duration = Date.now() - startTime;
      const success = !error && data?.success;

      addResult({
        success,
        timestamp: new Date().toLocaleTimeString(),
        action: testAction,
        number: testNumber,
        response: error || data,
        duration
      });

      if (success) {
        toast.success(`Teste enviado com sucesso (${duration}ms)`);
      } else {
        toast.error(`Falha no teste: ${error?.message || data?.error || "Erro desconhecido"}`);
      }
    } catch (err: any) {
      const duration = Date.now() - startTime;
      addResult({
        success: false,
        timestamp: new Date().toLocaleTimeString(),
        action: testAction,
        number: testNumber,
        response: { error: err.message },
        duration
      });
      toast.error(`Erro: ${err.message}`);
    }

    setTesting(false);
  };

  const copyPayload = () => {
    const formattedNumber = testNumber.replace(/\D/g, "");
    let payload: any = { number: formattedNumber };

    switch (testAction) {
      case "text":
        payload = { number: formattedNumber, text: textMessage };
        break;
      case "image":
      case "video":
      case "audio":
      case "document":
        payload = { 
          number: formattedNumber, 
          type: testAction, 
          file: mediaUrl, 
          text: mediaCaption 
        };
        if (testAction === "document") payload.docName = docName;
        break;
      case "button":
        payload = { 
          number: formattedNumber, 
          type: "button", 
          text: menuText, 
          choices: buttonChoices.map(b => {
            switch (b.type) {
              case "URL": return `${b.label}|${b.action}`;
              case "COPY": return `${b.label}|copy:${b.action}`;
              case "CALL": return `${b.label}|call:${b.action}`;
              case "REPLY":
              default: return `${b.label}|${b.action}`;
            }
          }),
          footerText
        };
        break;
      case "list":
        payload = { 
          number: formattedNumber, 
          type: "list", 
          text: menuText, 
          listButton: listButtonText,
          choices: listItems.map(i => i.description ? `${i.title}|${i.id}|${i.description}` : `${i.title}|${i.id}`),
          footerText
        };
        break;
      case "poll":
        payload = { 
          number: formattedNumber, 
          type: "poll",
          text: menuText, 
          choices: pollOptions,
          selectableCount: pollSelectableCount
        };
        break;
      case "carousel":
        payload = { 
          number: formattedNumber, 
          text: menuText, 
          carousel: carouselCards
        };
        break;
    }

    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Payload copiado");
  };

  const getFileAccept = () => {
    switch (testAction) {
      case "image": return "image/*";
      case "video": return "video/mp4";
      case "audio": return "audio/*";
      case "document": return ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx";
      default: return "*/*";
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Left: Configuration */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-5">
          <Terminal className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">API Tester</h3>
          <Badge variant="outline" className="ml-auto">UZAPI Format</Badge>
        </div>

        <div className="space-y-4">
          {/* Connection & Number */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Conexão</Label>
              <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${c.status === "connected" ? "bg-green-500" : "bg-muted"}`} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Número de Teste</Label>
              <Input 
                value={testNumber} 
                onChange={(e) => setTestNumber(e.target.value)}
                placeholder="5511999999999"
                className="mt-1 font-mono"
              />
            </div>
          </div>

          {/* Action Type */}
          <Tabs value={testAction} onValueChange={(v) => setTestAction(v as TestAction)}>
            <TabsList className="grid w-full grid-cols-4 mb-2">
              <TabsTrigger value="text">Texto</TabsTrigger>
              <TabsTrigger value="image">Imagem</TabsTrigger>
              <TabsTrigger value="video">Vídeo</TabsTrigger>
              <TabsTrigger value="document">Documento</TabsTrigger>
            </TabsList>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="audio">Áudio</TabsTrigger>
              <TabsTrigger value="button">Botões</TabsTrigger>
              <TabsTrigger value="list">Lista</TabsTrigger>
              <TabsTrigger value="poll">Enquete</TabsTrigger>
              <TabsTrigger value="carousel">Carrossel</TabsTrigger>
            </TabsList>

            {/* Text Tab */}
            <TabsContent value="text" className="mt-4 space-y-3">
              <div>
                <Label className="text-xs">Mensagem</Label>
                <Textarea 
                  value={textMessage} 
                  onChange={(e) => setTextMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="mt-1 h-24"
                />
              </div>
            </TabsContent>

            {/* Media Tabs (Image, Video, Audio, Document) */}
            {["image", "video", "audio", "document"].map(mediaType => (
              <TabsContent key={mediaType} value={mediaType} className="mt-4 space-y-3">
                {/* Toggle between URL and Upload */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={mediaMode === "upload" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMediaMode("upload")}
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                  <Button
                    type="button"
                    variant={mediaMode === "url" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMediaMode("url")}
                    className="flex-1"
                  >
                    <Link className="w-4 h-4 mr-2" />
                    URL
                  </Button>
                </div>

                {mediaMode === "upload" ? (
                  <div>
                    <Label className="text-xs">Upload de {mediaType === "image" ? "Imagem" : mediaType === "video" ? "Vídeo" : mediaType === "audio" ? "Áudio" : "Documento"}</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={getFileAccept()}
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await handleFileUpload(file, file.type);
                      }}
                    />
                    <div 
                      onClick={() => !uploading && fileInputRef.current?.click()}
                      className={`mt-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                        uploading ? "opacity-50 cursor-not-allowed" : "hover:border-primary hover:bg-muted/30"
                      }`}
                    >
                      {uploading ? (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-8 h-8 animate-spin" />
                          <span className="text-sm">Enviando...</span>
                        </div>
                      ) : previewMedia && (testAction === "image" || testAction === "video") ? (
                        <div className="space-y-2">
                          {testAction === "image" ? (
                            <img src={previewMedia} alt="Preview" className="max-h-32 mx-auto rounded" />
                          ) : (
                            <video src={previewMedia} className="max-h-32 mx-auto rounded" controls />
                          )}
                          <p className="text-xs text-muted-foreground">Clique para trocar</p>
                        </div>
                      ) : mediaUrl ? (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          {testAction === "document" ? <FileText className="w-8 h-8" /> : <Music className="w-8 h-8" />}
                          <span className="text-sm">Arquivo selecionado</span>
                          <span className="text-xs break-all">{mediaUrl.split('/').pop()}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          {testAction === "image" && <ImageIcon className="w-8 h-8" />}
                          {testAction === "video" && <Video className="w-8 h-8" />}
                          {testAction === "audio" && <Music className="w-8 h-8" />}
                          {testAction === "document" && <FileText className="w-8 h-8" />}
                          <span className="text-sm">Clique para selecionar</span>
                          <span className="text-xs">Máx. 16MB</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs">URL do Arquivo</Label>
                    <Input 
                      value={mediaUrl} 
                      onChange={(e) => {
                        setMediaUrl(e.target.value);
                        setPreviewMedia(null);
                      }}
                      placeholder="https://example.com/file.jpg"
                      className="mt-1"
                    />
                  </div>
                )}

                {mediaUrl && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded break-all">
                    <strong>URL:</strong> {mediaUrl}
                  </div>
                )}

                {mediaType === "document" && (
                  <div>
                    <Label className="text-xs">Nome do Arquivo</Label>
                    <Input 
                      value={docName} 
                      onChange={(e) => setDocName(e.target.value)}
                      placeholder="documento.pdf"
                      className="mt-1"
                    />
                  </div>
                )}

                <div>
                  <Label className="text-xs">Legenda (opcional)</Label>
                  <Input 
                    value={mediaCaption} 
                    onChange={(e) => setMediaCaption(e.target.value)}
                    placeholder="Legenda da mídia"
                    className="mt-1"
                  />
                </div>
              </TabsContent>
            ))}

            {/* Button Tab */}
            <TabsContent value="button" className="mt-4 space-y-3">
              <div>
                <Label className="text-xs">Texto Principal</Label>
                <Textarea 
                  value={menuText} 
                  onChange={(e) => setMenuText(e.target.value)}
                  className="mt-1 h-16"
                />
              </div>
              <div>
                <Label className="text-xs">Texto do Rodapé (opcional)</Label>
                <Input 
                  value={footerText} 
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Rodapé da mensagem"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Imagem do Botão (opcional)</Label>
                <Input 
                  value={buttonImageUrl} 
                  onChange={(e) => setButtonImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Botões (máx. 3)</Label>
                <div className="space-y-2 mt-2">
                  {buttonChoices.map((btn, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input 
                        value={btn.label}
                        onChange={(e) => {
                          const newBtns = [...buttonChoices];
                          newBtns[idx].label = e.target.value;
                          setButtonChoices(newBtns);
                        }}
                        placeholder="Texto do botão"
                        className="flex-1"
                      />
                      <Select
                        value={btn.type}
                        onValueChange={(value: "REPLY" | "URL" | "COPY" | "CALL") => {
                          const newBtns = [...buttonChoices];
                          newBtns[idx].type = value;
                          // Limpa ação ao trocar tipo para dar exemplo correto
                          if (value === "URL") newBtns[idx].action = "https://";
                          else if (value === "CALL") newBtns[idx].action = "+55";
                          else if (value === "COPY") newBtns[idx].action = "";
                          else newBtns[idx].action = "";
                          setButtonChoices(newBtns);
                        }}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REPLY">REPLY</SelectItem>
                          <SelectItem value="URL">URL</SelectItem>
                          <SelectItem value="COPY">COPY</SelectItem>
                          <SelectItem value="CALL">CALL</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input 
                        value={btn.action}
                        onChange={(e) => {
                          const newBtns = [...buttonChoices];
                          newBtns[idx].action = e.target.value;
                          setButtonChoices(newBtns);
                        }}
                        placeholder={
                          btn.type === "REPLY" ? "ID da resposta" :
                          btn.type === "URL" ? "https://site.com" :
                          btn.type === "COPY" ? "Texto a copiar" :
                          "+5511999999999"
                        }
                        className="flex-1"
                      />
                      {buttonChoices.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setButtonChoices(buttonChoices.filter((_, i) => i !== idx))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {buttonChoices.length < 3 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setButtonChoices([...buttonChoices, { label: "", action: "", type: "REPLY" }])}
                    >
                      <Plus className="w-3 h-3 mr-1" />Adicionar
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* List Tab */}
            <TabsContent value="list" className="mt-4 space-y-3">
              <div>
                <Label className="text-xs">Texto Principal</Label>
                <Textarea 
                  value={menuText} 
                  onChange={(e) => setMenuText(e.target.value)}
                  className="mt-1 h-16"
                />
              </div>
              <div>
                <Label className="text-xs">Texto do Botão</Label>
                <Input 
                  value={listButtonText} 
                  onChange={(e) => setListButtonText(e.target.value)}
                  placeholder="Ver opções"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Texto do Rodapé (opcional)</Label>
                <Input 
                  value={footerText} 
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Rodapé"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Itens da Lista</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Use [Título] para criar seções
                </p>
                <div className="space-y-2 mt-1">
                  {listItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-1">
                        <Input 
                          value={item.title}
                          onChange={(e) => {
                            const newItems = [...listItems];
                            newItems[idx].title = e.target.value;
                            setListItems(newItems);
                          }}
                          placeholder="Título"
                        />
                        <div className="flex gap-2">
                          <Input 
                            value={item.id}
                            onChange={(e) => {
                              const newItems = [...listItems];
                              newItems[idx].id = e.target.value;
                              setListItems(newItems);
                            }}
                            placeholder="ID"
                            className="flex-1"
                          />
                          <Input 
                            value={item.description}
                            onChange={(e) => {
                              const newItems = [...listItems];
                              newItems[idx].description = e.target.value;
                              setListItems(newItems);
                            }}
                            placeholder="Descrição"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      {listItems.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setListItems(listItems.filter((_, i) => i !== idx))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setListItems([...listItems, { title: "", id: "", description: "" }])}
                  >
                    <Plus className="w-3 h-3 mr-1" />Adicionar Item
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Poll Tab */}
            <TabsContent value="poll" className="mt-4 space-y-3">
              <div>
                <Label className="text-xs">Pergunta da Enquete</Label>
                <Textarea 
                  value={menuText} 
                  onChange={(e) => setMenuText(e.target.value)}
                  placeholder="Qual horário prefere para atendimento?"
                  className="mt-1 h-16"
                />
              </div>
              <div>
                <Label className="text-xs">Opções Selecionáveis</Label>
                <Select 
                  value={pollSelectableCount.toString()}
                  onValueChange={(v) => setPollSelectableCount(parseInt(v))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 opção (única escolha)</SelectItem>
                    <SelectItem value="2">2 opções</SelectItem>
                    <SelectItem value="3">3 opções</SelectItem>
                    <SelectItem value="0">Múltiplas (sem limite)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Opções da Enquete</Label>
                <div className="space-y-2 mt-1">
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input 
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...pollOptions];
                          newOpts[idx] = e.target.value;
                          setPollOptions(newOpts);
                        }}
                        placeholder={`Opção ${idx + 1}`}
                      />
                      {pollOptions.length > 2 && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 12 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setPollOptions([...pollOptions, ""])}
                    >
                      <Plus className="w-3 h-3 mr-1" />Adicionar Opção
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Carousel Tab */}
            <TabsContent value="carousel" className="mt-4 space-y-3">
              <div>
                <Label className="text-xs">Texto Principal</Label>
                <Input 
                  value={menuText} 
                  onChange={(e) => setMenuText(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Cards do Carrossel</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Tipo: REPLY (resposta), URL (link), COPY (copiar), CALL (ligar)
                </p>
                <div className="space-y-3 mt-1">
                  {carouselCards.map((card, idx) => (
                    <Card key={idx} className="p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium">Card {idx + 1}</span>
                        {carouselCards.length > 1 && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setCarouselCards(carouselCards.filter((_, i) => i !== idx))}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      <Textarea 
                        value={card.text}
                        onChange={(e) => {
                          const newCards = [...carouselCards];
                          newCards[idx].text = e.target.value;
                          setCarouselCards(newCards);
                        }}
                        placeholder="Título\nDescrição"
                        className="h-16"
                      />
                      <Input 
                        value={card.image}
                        onChange={(e) => {
                          const newCards = [...carouselCards];
                          newCards[idx].image = e.target.value;
                          setCarouselCards(newCards);
                        }}
                        placeholder="URL da imagem"
                      />
                      <div className="space-y-2">
                        <Label className="text-xs">Botões</Label>
                        {card.buttons.map((btn, btnIdx) => (
                          <div key={btnIdx} className="flex gap-2">
                            <Input 
                              value={btn.text}
                              onChange={(e) => {
                                const newCards = [...carouselCards];
                                newCards[idx].buttons[btnIdx].text = e.target.value;
                                setCarouselCards(newCards);
                              }}
                              placeholder="Texto"
                              className="flex-1"
                            />
                            <Input 
                              value={btn.id}
                              onChange={(e) => {
                                const newCards = [...carouselCards];
                                newCards[idx].buttons[btnIdx].id = e.target.value;
                                setCarouselCards(newCards);
                              }}
                              placeholder="ID/URL"
                              className="flex-1"
                            />
                            <Select 
                              value={btn.type}
                              onValueChange={(v) => {
                                const newCards = [...carouselCards];
                                newCards[idx].buttons[btnIdx].type = v as "REPLY" | "URL" | "COPY" | "CALL";
                                setCarouselCards(newCards);
                              }}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="REPLY">REPLY</SelectItem>
                                <SelectItem value="URL">URL</SelectItem>
                                <SelectItem value="COPY">COPY</SelectItem>
                                <SelectItem value="CALL">CALL</SelectItem>
                              </SelectContent>
                            </Select>
                            {card.buttons.length > 1 && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  const newCards = [...carouselCards];
                                  newCards[idx].buttons = card.buttons.filter((_, i) => i !== btnIdx);
                                  setCarouselCards(newCards);
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {card.buttons.length < 3 && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const newCards = [...carouselCards];
                              newCards[idx].buttons.push({ id: "", text: "", type: "REPLY" });
                              setCarouselCards(newCards);
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" />Botão
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCarouselCards([...carouselCards, { 
                      text: "", 
                      image: "", 
                      buttons: [{ id: "", text: "", type: "REPLY" }] 
                    }])}
                  >
                    <Plus className="w-3 h-3 mr-1" />Adicionar Card
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={runTest} 
              disabled={testing || !selectedConnection || !testNumber}
              className="flex-1"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Executar Teste
            </Button>
            <Button variant="outline" onClick={copyPayload}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </Card>

      {/* Right: Results */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Resultados</h3>
            <Badge variant="outline">{results.length}</Badge>
          </div>
          {results.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearResults}>
              <Trash2 className="w-4 h-4 mr-1" />Limpar
            </Button>
          )}
        </div>

        {results.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Terminal className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Execute um teste para ver os resultados</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {results.map((result, idx) => (
                <Card 
                  key={idx} 
                  className={`p-3 border-l-4 ${result.success ? "border-l-green-500" : "border-l-destructive"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={result.success ? "default" : "destructive"} className="text-xs">
                        {result.success ? "OK" : "ERRO"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{result.timestamp}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">{result.duration}ms</Badge>
                  </div>
                  <div className="text-xs space-y-1">
                    <p><span className="text-muted-foreground">Tipo:</span> {result.action}</p>
                    <p><span className="text-muted-foreground">Número:</span> {result.number}</p>
                  </div>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto max-h-32">
                    {JSON.stringify(result.response, null, 2)}
                  </pre>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}