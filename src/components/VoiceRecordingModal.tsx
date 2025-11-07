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
            onClick={onClose}
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
