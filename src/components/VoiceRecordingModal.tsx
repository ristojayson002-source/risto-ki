import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MicOff } from "lucide-react";

interface VoiceRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceRecordingModal = ({ isOpen, onClose }: VoiceRecordingModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border/50 shadow-2xl">
        <div className="flex flex-col items-center justify-center py-10 space-y-6">
          <div className="relative w-40 h-40">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
            <div className="absolute inset-4 bg-primary/30 rounded-full animate-pulse"></div>
            <div className="absolute inset-8 bg-primary/40 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
            <div className="relative flex items-center justify-center w-full h-full bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-glow">
              <MicOff className="h-20 w-20 text-primary-foreground animate-pulse" />
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-foreground">Ich höre zu...</p>
            <p className="text-sm text-muted-foreground">Sprechen Sie jetzt</p>
          </div>

          <Button
            onClick={onClose}
            size="lg"
            variant="outline"
            className="gap-2 rounded-full px-8 hover:scale-105 transition-all border-border/50 hover:border-primary/50"
          >
            <MicOff className="h-5 w-5" />
            Aufnahme beenden
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
