import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Send, Play, Pause, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AudioRecorderButtonProps {
  connectionId: string;
  phone: string;
  conversationId: string;
  disabled?: boolean;
  onSent?: () => void;
}

export const AudioRecorderButton = ({ 
  connectionId, 
  phone, 
  conversationId, 
  disabled,
  onSent 
}: AudioRecorderButtonProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup audio URL when component unmounts or audio changes
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setRecordingTime(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        // Create URL for playback
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();
      
      // Start timer using Date.now() for accurate timing
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingTime(elapsed);
      }, 100); // Update more frequently for smoother display
      
    } catch (error) {
      toast.error('Erro ao acessar o microfone');
      console.error(error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Save final duration before stopping
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setFinalDuration(duration);
      
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setFinalDuration(0);
    setPlaybackTime(0);
    setIsPlaying(false);
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const togglePlayback = () => {
    if (!audioUrl) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => {
          setIsPlaying(false);
          setPlaybackTime(0);
        };
        audioRef.current.ontimeupdate = () => {
          if (audioRef.current) {
            setPlaybackTime(Math.floor(audioRef.current.currentTime));
          }
        };
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const sendAudio = async () => {
    if (!audioBlob) return;
    
    setIsSending(true);
    
    try {
      // Upload to Supabase storage
      const fileName = `${Date.now()}-audio.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(`conversations/${conversationId}/${fileName}`, audioBlob);
      
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(uploadData.path);

      // Send via UZAPI
      const { data, error } = await supabase.functions.invoke('wa-send-media', {
        body: {
          connectionId,
          phone,
          type: 'audio',
          file: publicUrl,
          conversationId
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao enviar');

      toast.success('Áudio enviado!');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      setFinalDuration(0);
      setPlaybackTime(0);
      setIsPlaying(false);
      onSent?.();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar áudio');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show recording UI
  if (isRecording) {
    return (
      <div className="flex items-center gap-2 bg-destructive/10 rounded-lg px-3 py-1">
        <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
        <span className="text-sm text-destructive font-mono">{formatTime(recordingTime)}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={stopRecording}
        >
          <Square className="w-4 h-4 fill-current" />
        </Button>
      </div>
    );
  }

  // Show send audio UI with playback
  if (audioBlob) {
    return (
      <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
        {/* Play/Pause button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20"
          onClick={togglePlayback}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-primary" />
          ) : (
            <Play className="w-4 h-4 text-primary" />
          )}
        </Button>
        
        {/* Duration/Playback time */}
        <span className="text-sm text-muted-foreground font-mono min-w-[45px]">
          {isPlaying ? formatTime(playbackTime) : formatTime(finalDuration)}
        </span>
        
        {/* Cancel button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={cancelRecording}
          title="Cancelar"
        >
          <X className="w-4 h-4" />
        </Button>
        
        {/* Send button */}
        <Button
          size="icon"
          className="h-8 w-8"
          onClick={sendAudio}
          disabled={isSending}
          title="Enviar"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    );
  }

  // Default state - mic button
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={startRecording}
      disabled={disabled || isSending}
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
    >
      <Mic className="w-5 h-5" />
    </Button>
  );
};
