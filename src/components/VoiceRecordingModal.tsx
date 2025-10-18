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
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border/50">
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          <div className="relative">
            <div className="absolute inset-0 animate-ping">
              <div className="w-24 h-24 rounded-full bg-primary/20"></div>
            </div>
            <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20">
              <div className="w-20 h-20 rounded-full bg-background/10 backdrop-blur-sm flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/30 animate-pulse"></div>
              </div>
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-foreground">Ich höre zu...</p>
            <p className="text-sm text-muted-foreground">Sprechen Sie jetzt</p>
          </div>

          <Button
            onClick={onClose}
            size="lg"
            variant="destructive"
            className="gap-2"
          >
            <MicOff className="h-5 w-5" />
            Aufnahme beenden
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
