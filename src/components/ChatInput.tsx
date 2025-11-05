import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Send, Camera, X, XCircle } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string, image?: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  isRecording: boolean;
  disabled?: boolean;
  onAbort?: () => void;
  isGenerating?: boolean;
}

export const ChatInput = ({
  onSendMessage,
  onStartRecording,
  onStopRecording,
  isRecording,
  disabled = false,
  onAbort,
  isGenerating = false
}: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!input.trim() && !selectedImage) return;

    const messageText = input || "Was ist auf diesem Bild?";
    const imageData = selectedImage || undefined;

    setInput("");
    setSelectedImage(null);

    onSendMessage(messageText, imageData);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="sticky bottom-0 border-t border-border/30 bg-background/95 backdrop-blur-xl shadow-2xl">
      <div className="max-w-4xl mx-auto px-6 py-5">
        <div className="flex gap-3 items-end">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-primary transition-all hover:scale-110 rounded-full"
            disabled={disabled}
          >
            <Camera className="h-5 w-5" />
          </Button>

          <div className="flex-1 relative">
            {selectedImage && (
              <div className="mb-3 relative inline-block">
                <img 
                  src={selectedImage} 
                  alt="Selected" 
                  className="max-h-24 rounded-xl border-2 border-border shadow-lg"
                />
                <Button
                  onClick={() => setSelectedImage(null)}
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-lg hover:scale-110 transition-all"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nachricht an Risto..."
              className="min-h-[60px] max-h-[200px] resize-none rounded-2xl bg-input border-border/50 focus:border-primary transition-all pr-12 shadow-inner"
              disabled={disabled}
            />
          </div>

          {isGenerating ? (
            <Button
              onClick={onAbort}
              variant="ghost"
              size="icon"
              className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all hover:scale-110 rounded-full"
            >
              <XCircle className="h-6 w-6" />
            </Button>
          ) : (
            <>
              <Button
                onClick={isRecording ? onStopRecording : onStartRecording}
                variant="ghost"
                size="icon"
                className={`shrink-0 transition-all hover:scale-110 rounded-full ${
                  isRecording 
                    ? 'text-destructive hover:text-destructive hover:bg-destructive/10' 
                    : 'text-muted-foreground hover:text-primary'
                }`}
                disabled={disabled}
              >
                {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>

              <Button
                onClick={handleSend}
                disabled={disabled || (!input.trim() && !selectedImage)}
                size="icon"
                className="shrink-0 rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all hover:scale-110 shadow-lg hover:shadow-glow disabled:opacity-50 disabled:hover:scale-100"
              >
                <Send className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
