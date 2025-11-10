import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Send, Plus, X, Camera, Image as ImageIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface ChatInputProps {
  onSendMessage: (text: string, image?: string, file?: File) => void;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showMediaSheet, setShowMediaSheet] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!input.trim() && !selectedImage && !selectedFile) return;

    const messageText = input || (selectedImage ? "Was ist auf diesem Bild?" : selectedFile ? "Bitte bearbeite diese Datei" : "");
    const imageData = selectedImage || undefined;

    setInput("");
    setSelectedImage(null);

    onSendMessage(messageText, imageData, selectedFile || undefined);
    setSelectedFile(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setSelectedFile(file);
      }
    }
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
        setShowMediaSheet(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="sticky bottom-0 border-t border-border/30 bg-background/95 backdrop-blur-xl shadow-2xl">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-5">
        <div 
          className={`flex gap-2 sm:gap-3 items-end transition-all ${isDragging ? 'ring-2 ring-primary ring-offset-2' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
          
          <Button
            onClick={() => setShowMediaSheet(true)}
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-primary transition-all hover:scale-110 rounded-full h-9 w-9 sm:h-10 sm:w-10"
            disabled={disabled}
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          <div className="flex-1 relative">
            {selectedImage && (
              <div className="mb-2 sm:mb-3 relative inline-block">
                <img 
                  src={selectedImage} 
                  alt="Selected" 
                  className="max-h-20 sm:max-h-24 rounded-xl border-2 border-border shadow-lg"
                />
                <Button
                  onClick={() => setSelectedImage(null)}
                  variant="destructive"
                  size="icon"
                  className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-6 w-6 sm:h-7 sm:w-7 rounded-full shadow-lg hover:scale-110 transition-all"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            )}
            {selectedFile && (
              <div className="mb-2 sm:mb-3 relative inline-block bg-secondary/50 px-3 py-2 rounded-lg">
                <span className="text-sm">{selectedFile.name}</span>
                <Button
                  onClick={() => setSelectedFile(null)}
                  variant="destructive"
                  size="icon"
                  className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-6 w-6 sm:h-7 sm:w-7 rounded-full shadow-lg hover:scale-110 transition-all"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            )}
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nachricht an Risto..."
              className="min-h-[50px] sm:min-h-[60px] max-h-[200px] resize-none rounded-2xl bg-input border-border/50 focus:border-primary transition-all pr-10 sm:pr-12 shadow-inner text-sm sm:text-base"
              disabled={false}
            />
          </div>

          {isGenerating ? (
            <Button
              onClick={onAbort}
              variant="ghost"
              size="icon"
              className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all hover:scale-110 rounded-full h-9 w-9 sm:h-10 sm:w-10"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          ) : (
            <>
              <Button
                onClick={isRecording ? onStopRecording : onStartRecording}
                variant="ghost"
                size="icon"
                className={`shrink-0 transition-all hover:scale-110 rounded-full h-9 w-9 sm:h-10 sm:w-10 ${
                  isRecording 
                    ? 'text-destructive hover:text-destructive hover:bg-destructive/10' 
                    : 'text-muted-foreground hover:text-primary'
                }`}
                disabled={disabled}
              >
                {isRecording ? <MicOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
              </Button>

              <Button
                onClick={handleSend}
                disabled={disabled || (!input.trim() && !selectedImage && !selectedFile)}
                size="icon"
                className="shrink-0 rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all hover:scale-110 shadow-lg hover:shadow-glow disabled:opacity-50 disabled:hover:scale-100 h-9 w-9 sm:h-10 sm:w-10"
              >
                <Send className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </>
          )}
        </div>
      </div>

      <Sheet open={showMediaSheet} onOpenChange={setShowMediaSheet}>
        <SheetContent side="bottom" className="bg-background border-border/50">
          <SheetHeader>
            <SheetTitle className="text-foreground">Bild hinzufügen</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-4 py-6">
            <Button
              onClick={handleCameraClick}
              variant="outline"
              className="h-24 flex-col gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/5"
            >
              <Camera className="h-8 w-8" />
              <span>Kamera</span>
            </Button>
            <Button
              onClick={handleGalleryClick}
              variant="outline"
              className="h-24 flex-col gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/5"
            >
              <ImageIcon className="h-8 w-8" />
              <span>Galerie</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};