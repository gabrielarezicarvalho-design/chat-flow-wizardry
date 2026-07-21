import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Download, ExternalLink, PlayCircle, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LightboxMedia {
  type: "image" | "video";
  url: string;
  poster?: string;
}

interface MediaLightboxProps {
  open: boolean;
  onClose: () => void;
  media: LightboxMedia[];
  initialIndex?: number;
  title?: string;
  externalUrl?: string;
}

export function MediaLightbox({
  open,
  onClose,
  media,
  initialIndex = 0,
  title,
  externalUrl,
}: MediaLightboxProps) {
  const [idx, setIdx] = useState(initialIndex);

  useEffect(() => {
    if (open) setIdx(initialIndex);
  }, [open, initialIndex]);

  const next = useCallback(() => {
    setIdx((i) => (i + 1) % media.length);
  }, [media.length]);

  const prev = useCallback(() => {
    setIdx((i) => (i - 1 + media.length) % media.length);
  }, [media.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, next, prev]);

  if (!open || media.length === 0) return null;

  const current = media[idx];

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = current.url;
    a.download = `criativo-${idx + 1}`;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Header */}
      <div
        className="absolute top-0 inset-x-0 flex items-center justify-between p-4 z-10 bg-gradient-to-b from-black/80 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-white min-w-0">
          {current.type === "video" ? (
            <PlayCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <ImageIcon className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="text-sm font-medium truncate">
            {title || "Criativo"}
          </span>
          {media.length > 1 && (
            <span className="text-xs text-white/70 flex-shrink-0">
              {idx + 1} / {media.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {externalUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              asChild
            >
              <a href={externalUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                Abrir origem
              </a>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-1" />
            Baixar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Media */}
      <div
        className="relative max-w-[92vw] max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {current.type === "video" ? (
          <video
            key={current.url}
            src={current.url}
            poster={current.poster}
            controls
            autoPlay
            playsInline
            className="max-w-[92vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />
        ) : (
          <img
            key={current.url}
            src={current.url}
            alt={title || "Criativo"}
            className="max-w-[92vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />
        )}
      </div>

      {/* Nav arrows */}
      {media.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-white flex items-center justify-center transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-white flex items-center justify-center transition-colors"
            aria-label="Próximo"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Thumbnails */}
          <div
            className="absolute bottom-4 inset-x-0 flex justify-center px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-2 p-2 rounded-full bg-black/60 backdrop-blur max-w-full overflow-x-auto">
              {media.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`h-12 w-12 rounded-md overflow-hidden flex-shrink-0 ring-2 transition ${
                    i === idx ? "ring-white" : "ring-transparent opacity-60 hover:opacity-100"
                  }`}
                  aria-label={`Ir para item ${i + 1}`}
                >
                  {m.type === "video" ? (
                    <div className="w-full h-full bg-black flex items-center justify-center relative">
                      {m.poster ? (
                        <img src={m.poster} alt="" className="w-full h-full object-cover" />
                      ) : null}
                      <PlayCircle className="absolute h-5 w-5 text-white" />
                    </div>
                  ) : (
                    <img src={m.url} alt="" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}
