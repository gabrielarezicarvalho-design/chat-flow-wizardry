import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Paperclip, Image, FileText, Loader2, X, Video } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface MediaSendPopoverProps {
  connectionId: string;
  phone: string;
  conversationId: string;
  disabled?: boolean;
  onSent?: () => void;
}

export const MediaSendPopover = ({ 
  connectionId, 
  phone, 
  conversationId, 
  disabled,
  onSent 
}: MediaSendPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sanitize filename to remove special characters
  const sanitizeFileName = (name: string): string => {
    // Remove accents and special characters, keep only alphanumeric, dash, underscore, dot
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-zA-Z0-9.\-_]/g, '_') // Replace special chars with underscore
      .replace(/_+/g, '_'); // Remove consecutive underscores
  };

  const getFileType = (file: File): 'image' | 'video' | 'audio' | 'document' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 16MB for images, 64MB for videos, 100MB for documents)
    let maxSize = 16 * 1024 * 1024; // 16MB default
    if (file.type.startsWith('video/')) {
      maxSize = 64 * 1024 * 1024; // 64MB for videos
    } else if (file.type.startsWith('application/')) {
      maxSize = 100 * 1024 * 1024; // 100MB for documents
    }
    
    if (file.size > maxSize) {
      toast.error(`Arquivo muito grande. Máximo: ${maxSize / 1024 / 1024}MB`);
      return;
    }

    setSelectedFile(file);
    
    // Create preview for images and videos
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setCaption("");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if (!selectedFile) return;
    
    setSending(true);
    
    try {
      // Sanitize filename and create unique name
      const sanitizedName = sanitizeFileName(selectedFile.name);
      const fileName = `${Date.now()}-${sanitizedName}`;
      
      // Upload to Supabase storage first
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(`conversations/${conversationId}/${fileName}`, selectedFile);
      
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(uploadData.path);

      const fileType = getFileType(selectedFile);

      // Send via UZAPI
      const { data, error } = await supabase.functions.invoke('wa-send-media', {
        body: {
          connectionId,
          phone,
          type: fileType,
          file: publicUrl,
          caption: caption || undefined,
          docName: fileType === 'document' ? selectedFile.name : undefined,
          conversationId
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao enviar');

      toast.success(`${fileType === 'image' ? 'Imagem' : fileType === 'video' ? 'Vídeo' : fileType === 'audio' ? 'Áudio' : 'Arquivo'} enviado!`);
      handleClear();
      setOpen(false);
      onSent?.();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar mídia');
    } finally {
      setSending(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          disabled={disabled}
        >
          <Paperclip className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="top" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Enviar Arquivo</h4>
            {selectedFile && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClear}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {!selectedFile ? (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                className="hidden"
                onChange={handleFileSelect}
              />
              
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "image/*";
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <Image className="w-6 h-6 text-green-500" />
                  <span className="text-xs">Imagem</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "video/*";
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <Video className="w-6 h-6 text-purple-500" />
                  <span className="text-xs">Vídeo</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt";
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <FileText className="w-6 h-6 text-blue-500" />
                  <span className="text-xs">Documento</span>
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                Imagens 16MB, vídeos 64MB, docs 100MB
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {previewUrl && selectedFile?.type.startsWith('image/') && (
                <div className="relative rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-full h-32 object-cover"
                  />
                </div>
              )}
              
              {previewUrl && selectedFile?.type.startsWith('video/') && (
                <div className="relative rounded-lg overflow-hidden bg-muted">
                  <video 
                    src={previewUrl} 
                    className="w-full h-32 object-cover"
                    controls
                    muted
                  />
                </div>
              )}
              
              {!previewUrl && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="caption" className="text-xs">Legenda (opcional)</Label>
                <Input
                  id="caption"
                  placeholder="Adicionar legenda..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="h-9"
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar'
                )}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
