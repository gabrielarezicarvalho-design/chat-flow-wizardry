import { useState, useRef, useEffect } from "react";
import { Download, FileText, Image as ImageIcon, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MessageContentProps {
  content: string;
  type: string;
  isSent: boolean;
}

interface MediaData {
  url: string;
  caption?: string;
  type: string;
  seconds?: number;
}

export const MessageContent = ({ content, type, isSent }: MessageContentProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Try to parse media data from JSON content
  const parseMediaData = (): MediaData | null => {
    try {
      const data = JSON.parse(content);
      // Handle WhatsApp format with uppercase URL
      if (data.URL) {
        const isAudio = data.mimetype?.includes('audio') || data.PTT === true;
        const isImage = data.mimetype?.includes('image');
        const isVideo = data.mimetype?.includes('video');
        const isDocument = data.mimetype && !isAudio && !isImage && !isVideo;
        
        let detectedType = type;
        if (isAudio) detectedType = 'audio';
        else if (isImage) detectedType = 'image';
        else if (isVideo) detectedType = 'video';
        else if (isDocument) detectedType = 'document';
        
        return { 
          url: data.URL, 
          type: detectedType, 
          caption: data.caption,
          seconds: data.seconds 
        };
      }
      // Handle lowercase url format
      if (data.url) {
        return data as MediaData;
      }
    } catch {
      // Not JSON, might be old format like "[image] caption" or just a URL
      if (content.startsWith('http')) {
        return { url: content, type };
      }
      // Check for old format [type] content
      const match = content.match(/^\[(\w+)\]\s*(.*)?$/);
      if (match) {
        return { url: '', caption: match[2] || '', type: match[1] };
      }
    }
    return null;
  };

  const mediaData = parseMediaData();

  // Auto-transcribe audio when component mounts
  useEffect(() => {
    const transcribeAudio = async () => {
      if (mediaData?.type !== 'audio' || !mediaData?.url || transcription !== null || isTranscribing) {
        return;
      }

      // Get current user for their API key
      const { data: { user } } = await supabase.auth.getUser();

      setIsTranscribing(true);
      try {
        const { data, error } = await supabase.functions.invoke('elevenlabs-transcribe', {
          body: { 
            audioUrl: mediaData.url,
            userId: user?.id 
          }
        });

        if (error) {
          console.error('Transcription error:', error);
          setTranscription('');
        } else if (data?.text && data.text.length > 2) {
          setTranscription(data.text);
        } else {
          setTranscription('');
        }
      } catch (err) {
        console.error('Transcription failed:', err);
        setTranscription('');
      } finally {
        setIsTranscribing(false);
      }
    };

    transcribeAudio();
  }, [mediaData?.url, mediaData?.type]);

  // Render based on type (use mediaData.type if available for auto-detection)
  const renderType = mediaData?.type || type;

  if (renderType === 'image' && mediaData?.url) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-lg overflow-hidden bg-muted/50 max-w-[280px]">
          {!imageLoaded && !imageError && (
            <div className="flex items-center justify-center h-32 animate-pulse">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          {imageError ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <div className="text-center">
                <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                <p className="text-xs">Imagem não disponível</p>
              </div>
            </div>
          ) : (
            <img 
              src={mediaData.url} 
              alt="Imagem enviada"
              className={`w-full h-auto max-h-[300px] object-cover cursor-pointer transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              onClick={() => window.open(mediaData.url, '_blank')}
            />
          )}
        </div>
        {mediaData.caption && (
          <p className={`text-sm ${isSent ? "text-primary-foreground" : "text-foreground"}`}>
            {mediaData.caption}
          </p>
        )}
      </div>
    );
  }

  if (renderType === 'audio' && mediaData?.url) {
    const formatDuration = (seconds?: number) => {
      if (!seconds) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <div className="space-y-2 min-w-[200px] max-w-[280px]">
        {/* Audio Player */}
        <div className={`flex items-center gap-2 p-2 rounded-lg ${isSent ? 'bg-primary-foreground/10' : 'bg-muted/50'}`}>
          <Mic className={`w-4 h-4 flex-shrink-0 ${isSent ? 'text-primary-foreground/70' : 'text-primary'}`} />
          
          {audioError ? (
            <div className="flex-1">
              <p className={`text-xs ${isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                🔊 Áudio ({formatDuration(mediaData.seconds)})
              </p>
              <a 
                href={mediaData.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`text-xs underline ${isSent ? 'text-primary-foreground/80' : 'text-primary'}`}
              >
                Abrir no navegador
              </a>
            </div>
          ) : (
            <audio 
              ref={audioRef}
              controls
              preload="metadata"
              className="flex-1 h-8"
              style={{ 
                filter: isSent ? 'invert(1) hue-rotate(180deg)' : 'none',
                opacity: isSent ? 0.9 : 1,
                maxWidth: '200px'
              }}
              onError={() => setAudioError(true)}
            >
              <source src={mediaData.url} type="audio/ogg; codecs=opus" />
              <source src={mediaData.url} type="audio/ogg" />
              <source src={mediaData.url} type="audio/mpeg" />
            </audio>
          )}
        </div>
        
        {/* Transcription */}
        {isTranscribing && (
          <p className={`text-xs italic ${isSent ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
            Transcrevendo...
          </p>
        )}
        {transcription && (
          <p className={`text-xs italic border-l-2 pl-2 ${isSent ? 'text-primary-foreground/80 border-primary-foreground/30' : 'text-muted-foreground border-muted-foreground/30'}`}>
            "{transcription}"
          </p>
        )}
      </div>
    );
  }

  if ((renderType === 'document' || renderType === 'video') && mediaData?.url) {
    return (
      <div className="space-y-2">
        <a 
          href={mediaData.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
            isSent ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30' : 'bg-muted hover:bg-muted/80'
          }`}
        >
          <FileText className={`w-8 h-8 ${isSent ? 'text-primary-foreground' : 'text-primary'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${isSent ? 'text-primary-foreground' : 'text-foreground'}`}>
              {type === 'video' ? 'Vídeo' : 'Documento'}
            </p>
            <p className={`text-xs truncate ${isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
              Clique para abrir
            </p>
          </div>
          <Download className={`w-4 h-4 ${isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`} />
        </a>
        {mediaData.caption && (
          <p className={`text-sm ${isSent ? "text-primary-foreground" : "text-foreground"}`}>
            {mediaData.caption}
          </p>
        )}
      </div>
    );
  }

  // Default text rendering - but check if it looks like JSON we shouldn't display
  const looksLikeMediaJson = content.startsWith('{"URL"') || content.startsWith('{"url"');
  if (looksLikeMediaJson) {
    // It's media JSON that wasn't parsed - show as audio fallback
    return (
      <div className={`flex items-center gap-2 p-2 rounded-lg ${isSent ? 'bg-primary-foreground/10' : 'bg-muted/50'}`}>
        <Mic className={`w-4 h-4 ${isSent ? 'text-primary-foreground/70' : 'text-primary'}`} />
        <span className={`text-sm ${isSent ? 'text-primary-foreground' : 'text-foreground'}`}>
          🔊 Mídia
        </span>
      </div>
    );
  }

  return (
    <p className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${isSent ? "text-primary-foreground" : "text-foreground"}`}>
      {content}
    </p>
  );
};
