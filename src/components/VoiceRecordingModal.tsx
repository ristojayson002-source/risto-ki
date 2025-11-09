import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MicOff } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface VoiceRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscript: (text: string) => void;
}

export const VoiceRecordingModal = ({ isOpen, onClose, onTranscript }: VoiceRecordingModalProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          
          try {
            const { data, error } = await supabase.functions.invoke('transcribe-audio', {
              body: { audio: base64 }
            });

            if (error) throw error;
            
            if (data?.text) {
              onTranscript(data.text);
              onClose();
            }
          } catch (err) {
            console.error('Transcription error:', err);
            toast.error('Fehler bei der Spracherkennung');
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Bitte erlaube den Zugriff auf das Mikrofon');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    if (isOpen && !isRecording) {
      startRecording();
    }
    
    return () => {
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
      }
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-background border-border/50 shadow-2xl">
        <div className="flex flex-col items-center justify-center py-8 sm:py-10 space-y-4 sm:space-y-6 px-4">
          <div className="relative w-32 h-32 sm:w-40 sm:h-40">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
            <div className="absolute inset-3 sm:inset-4 bg-primary/30 rounded-full animate-pulse"></div>
            <div className="absolute inset-6 sm:inset-8 bg-primary/40 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
            <div className="relative flex items-center justify-center w-full h-full bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-glow">
              <MicOff className="h-16 w-16 sm:h-20 sm:w-20 text-primary-foreground animate-pulse" />
            </div>
          </div>
          
          <div className="text-center space-y-1 sm:space-y-2">
            <p className="text-base sm:text-lg font-medium text-foreground">Ich höre zu...</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Sprechen Sie jetzt</p>
          </div>

          <Button
            onClick={() => {
              stopRecording();
              onClose();
            }}
            size="lg"
            variant="outline"
            className="gap-2 rounded-full px-6 sm:px-8 hover:scale-105 transition-all border-border/50 hover:border-primary/50 text-sm sm:text-base"
          >
            <MicOff className="h-4 w-4 sm:h-5 sm:w-5" />
            Aufnahme beenden
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};