import { Card } from "@/components/ui/card";
import { CheckCheck, Image, FileText, Music, Video, ChevronRight, List } from "lucide-react";

export type InteractiveType = "none" | "buttons" | "list" | "carousel" | "poll";

interface CarouselCard {
  title: string;
  description: string;
  imageUrl: string;
  buttons: { label: string; action: string }[];
}

interface ListItem {
  title: string;
  description?: string;
}

interface WhatsAppPreviewProps {
  messageType: string;
  message: string;
  mediaPreview?: string;
  mediaFile?: File | null;
  buttons?: { id: string; label: string; action?: string }[];
  interactiveType?: InteractiveType;
  listItems?: ListItem[];
  carouselCards?: CarouselCard[];
}

export function WhatsAppPreview({ 
  messageType, 
  message, 
  mediaPreview, 
  mediaFile,
  buttons = [],
  interactiveType = "none",
  listItems = [],
  carouselCards = []
}: WhatsAppPreviewProps) {
  const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const renderInteractiveButtons = () => {
    if (interactiveType !== "buttons" || buttons.length === 0) return null;
    
    return (
      <div className="mt-1 space-y-1">
        {buttons.filter(b => b.label.trim()).map((btn, idx) => (
          <div 
            key={idx}
            className="bg-[#1f3631] text-[#00a884] text-center py-2.5 rounded-lg text-sm font-medium border border-[#2a3942] hover:bg-[#2a3942] transition-colors cursor-pointer"
          >
            {btn.label}
          </div>
        ))}
      </div>
    );
  };

  const renderInteractiveList = () => {
    if (interactiveType !== "list" || listItems.length === 0) return null;
    
    return (
      <div className="mt-1">
        <div className="bg-[#1f3631] rounded-lg border border-[#2a3942] overflow-hidden">
          <div className="flex items-center justify-center gap-2 py-2.5 text-[#00a884] font-medium text-sm border-b border-[#2a3942]">
            <List className="w-4 h-4" />
            Ver opções
          </div>
        </div>
        {/* List Preview */}
        <div className="mt-2 bg-[#111b21] rounded-lg border border-[#2a3942] overflow-hidden">
          {listItems.filter(item => item.title.trim()).map((item, idx) => (
            <div 
              key={idx}
              className="flex items-center justify-between px-3 py-2.5 border-b border-[#2a3942] last:border-b-0 hover:bg-[#1f3631] cursor-pointer"
            >
              <div>
                <p className="text-white text-sm font-medium">{item.title}</p>
                {item.description && (
                  <p className="text-gray-400 text-xs mt-0.5">{item.description}</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCarousel = () => {
    if (interactiveType !== "carousel" || carouselCards.length === 0) return null;
    
    return (
      <div className="mt-2 flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {carouselCards.filter(card => card.title.trim()).map((card, idx) => (
          <div 
            key={idx}
            className="min-w-[200px] max-w-[200px] bg-[#1f3631] rounded-lg border border-[#2a3942] overflow-hidden flex-shrink-0"
          >
            {card.imageUrl ? (
              <img src={card.imageUrl} alt={card.title} className="w-full h-24 object-cover" />
            ) : (
              <div className="w-full h-24 bg-[#0b141a] flex items-center justify-center">
                <Image className="w-8 h-8 text-gray-600" />
              </div>
            )}
            <div className="p-3">
              <p className="text-white text-sm font-medium truncate">{card.title}</p>
              {card.description && (
                <p className="text-gray-400 text-xs mt-1 line-clamp-2">{card.description}</p>
              )}
              {card.buttons.length > 0 && (
                <div className="mt-2 space-y-1">
                  {card.buttons.filter(b => b.label.trim()).map((btn, bIdx) => (
                    <div 
                      key={bIdx}
                      className="text-[#00a884] text-center py-1.5 rounded text-xs font-medium bg-[#0b141a]"
                    >
                      {btn.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="text-sm font-medium text-muted-foreground mb-2">Pré-visualização WhatsApp</div>
      <Card className="flex-1 bg-[#0b141a] rounded-xl overflow-hidden">
        {/* WhatsApp Header */}
        <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2a3942] flex items-center justify-center">
            <span className="text-sm text-gray-400">👤</span>
          </div>
          <div>
            <p className="text-white text-sm font-medium">Contato</p>
            <p className="text-gray-400 text-xs">online</p>
          </div>
        </div>

        {/* Chat Background */}
        <div 
          className="min-h-[350px] p-4 flex flex-col justify-end overflow-y-auto"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23182229' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundColor: '#0b141a'
          }}
        >
          {/* Carousel (full width) */}
          {interactiveType === "carousel" && renderCarousel()}

          {/* Message Bubble */}
          <div className="flex justify-end">
            <div className="max-w-[280px]">
              {/* Media Content */}
              {messageType !== "text" && interactiveType !== "carousel" && (
                <div className="bg-[#005c4b] rounded-t-lg overflow-hidden">
                  {messageType === "image" && mediaPreview ? (
                    <img src={mediaPreview} alt="Preview" className="w-full h-40 object-cover" />
                  ) : messageType === "image" ? (
                    <div className="w-full h-40 bg-[#1f3631] flex items-center justify-center">
                      <Image className="w-12 h-12 text-gray-500" />
                    </div>
                  ) : messageType === "video" ? (
                    <div className="w-full h-40 bg-[#1f3631] flex items-center justify-center relative">
                      <Video className="w-12 h-12 text-gray-500" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center">
                          <span className="text-white text-2xl ml-1">▶</span>
                        </div>
                      </div>
                    </div>
                  ) : messageType === "audio" ? (
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center">
                        <span className="text-white">▶</span>
                      </div>
                      <div className="flex-1">
                        <div className="h-1 bg-gray-500 rounded-full">
                          <div className="h-1 w-1/3 bg-[#00a884] rounded-full"></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">0:00 / 0:30</p>
                      </div>
                    </div>
                  ) : messageType === "document" ? (
                    <div className="px-4 py-3 flex items-center gap-3 bg-[#1f3631]">
                      <div className="w-10 h-10 rounded bg-[#00a884] flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white text-sm">{mediaFile?.name || "documento.pdf"}</p>
                        <p className="text-gray-400 text-xs">{mediaFile ? `${(mediaFile.size / 1024).toFixed(1)} KB` : "PDF"}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Text Message */}
              {(message || messageType === "text") && interactiveType !== "carousel" && (
                <div className={`bg-[#005c4b] px-3 py-2 ${messageType !== "text" ? "rounded-b-lg" : "rounded-lg"}`}>
                  <p className="text-white text-sm whitespace-pre-wrap break-words">
                    {message || "Digite sua mensagem..."}
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px] text-gray-400">{currentTime}</span>
                    <CheckCheck className="w-4 h-4 text-[#53bdeb]" />
                  </div>
                </div>
              )}

              {/* Interactive Elements */}
              {renderInteractiveButtons()}
              {renderInteractiveList()}
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3">
          <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2">
            <span className="text-gray-500 text-sm">Mensagem</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center">
            <span className="text-white">🎤</span>
          </div>
        </div>
      </Card>
    </div>
  );
}