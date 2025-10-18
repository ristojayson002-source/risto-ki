import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Send, Camera, Image as ImageIcon, X, XCircle } from "lucide-react";

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
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    const messageText = inputText || "Was ist auf diesem Bild?";
    const imageData = selectedImage || undefined;

    setInputText("");
    setSelectedImage(null);

    onSendMessage(messageText, imageData);
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
    <div className="border-t border-border/50 bg-background/80 backdrop-blur-md p-4">
      {selectedImage && (
        <div className="mb-3 relative inline-block animate-scale-in">
          <img
            src={selectedImage}
            alt="Selected"
            className="h-20 rounded-lg border border-border"
          />
          <Button
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={() => setSelectedImage(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 items-end max-w-4xl mx-auto">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="hover:bg-muted"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageSelect}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled}
            className="hover:bg-muted"
          >
            <Camera className="h-5 w-5" />
          </Button>
        </div>

        <Input
          type="text"
          placeholder="Frag Risto etwas..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-muted/50 border-border/50 focus-visible:ring-primary"
          disabled={disabled}
        />

        <Button
          type="button"
          size="icon"
          variant={isRecording ? "destructive" : "ghost"}
          onClick={isRecording ? onStopRecording : onStartRecording}
          className="relative hover:bg-muted"
          disabled={disabled}
        >
          {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          {isRecording && (
            <span className="absolute inset-0 animate-ping rounded-md bg-destructive opacity-75"></span>
          )}
        </Button>

        {isGenerating && onAbort && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onAbort}
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <XCircle className="h-5 w-5" />
          </Button>
        )}

        <Button
          type="submit"
          size="icon"
          disabled={(!inputText.trim() && !selectedImage) || disabled}
          className="bg-primary hover:bg-primary/90"
        >
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
};
