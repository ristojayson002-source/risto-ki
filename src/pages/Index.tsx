import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Send, Camera, Image as ImageIcon, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

const Index = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const speakText = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Try to use the best available German voice
    const voices = window.speechSynthesis.getVoices();
    const germanVoices = voices.filter(voice => 
      voice.lang.startsWith('de')
    );
    
    // Prefer higher quality voices (often contain "Premium" or "Enhanced")
    const premiumVoice = germanVoices.find(v => 
      v.name.includes('Premium') || v.name.includes('Enhanced') || v.name.includes('Natural')
    );
    const germanVoice = premiumVoice || germanVoices.find(v => v.lang === 'de-DE') || germanVoices[0];
    
    if (germanVoice) {
      utterance.voice = germanVoice;
      console.log('Using German voice:', germanVoice.name);
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const startRecording = async () => {
    if (!hasStarted) {
      setHasStarted(true);
    }

    try {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (!SpeechRecognition) {
        toast({
          title: "Fehler",
          description: "Spracherkennung wird nicht unterstützt",
          variant: "destructive",
        });
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "de-DE";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsRecording(false);
        await sendMessage(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
        toast({
          title: "Fehler",
          description: `Spracherkennung fehlgeschlagen: ${event.error}`,
          variant: "destructive",
        });
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsRecording(false);
      toast({
        title: "Fehler",
        description: "Mikrofon-Zugriff nicht möglich",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendMessage = async (text: string, imageData?: string) => {
    const userMessage: Message = { 
      role: "user", 
      content: text,
      image: imageData 
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsTyping(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/risto-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: updatedMessages.map(msg => ({
              role: msg.role,
              content: msg.image ? [
                { type: "text", text: msg.content },
                { type: "image_url", image_url: { url: msg.image } }
              ] : msg.content
            })),
          }),
        }
      );

      const data = await response.json();
      
      if (data.error) {
        setIsTyping(false);
        toast({
          title: "Fehler",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setIsTyping(false);
      const assistantMessage: Message = { 
        role: "assistant", 
        content: data.text,
        image: data.image // Bild von der KI generiert
      };
      setMessages(prev => [...prev, assistantMessage]);
      speakText(data.text);
    } catch (error) {
      console.error("Error:", error);
      setIsTyping(false);
      toast({
        title: "Fehler",
        description: "Verbindung zur KI fehlgeschlagen",
        variant: "destructive",
      });
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    const messageText = inputText || "Was ist auf diesem Bild?";
    const imageData = selectedImage || undefined;
    
    setInputText("");
    setSelectedImage(null);
    
    await sendMessage(messageText, imageData);
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

  const clearChat = () => {
    setMessages([]);
    setHasStarted(false);
    window.speechSynthesis.cancel();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Risto KI</h1>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearChat}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-primary">Willkommen bei Risto KI</h2>
              <p className="text-muted-foreground">Wie kann ich Ihnen heute helfen?</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl px-4">
              <div className="bg-card border border-border rounded-lg p-6 text-center space-y-2">
                <div className="text-4xl">🌤️</div>
                <h3 className="font-bold text-primary">Wetter</h3>
                <p className="text-sm text-muted-foreground">Aktuelle Wetterinformationen für jeden Ort</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-6 text-center space-y-2">
                <div className="text-4xl">🔍</div>
                <h3 className="font-bold text-primary">Echtzeit-Suche</h3>
                <p className="text-sm text-muted-foreground">Aktuelle Informationen aus dem Internet</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-6 text-center space-y-2">
                <div className="text-4xl">📸</div>
                <h3 className="font-bold text-primary">Bildanalyse</h3>
                <p className="text-sm text-muted-foreground">Erkennung von Objekten und Text in Bildern</p>
              </div>
            </div>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-4 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border"
              }`}
            >
              {msg.image && (
                <img src={msg.image} alt="User upload" className="rounded-lg mb-2 max-w-full h-auto" />
              )}
              {msg.role === "assistant" ? (
                <div className="space-y-2">
                  <ReactMarkdown
                    components={{
                      strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
                      p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      a: ({ children, href }) => (
                        <a 
                          href={href} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary underline hover:text-primary/80"
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="leading-relaxed">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg p-4 bg-card border border-border">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="border-t border-border bg-card p-4">
        {selectedImage && (
          <div className="mb-3 relative inline-block">
            <img src={selectedImage} alt="Selected" className="h-20 rounded-lg" />
            <Button
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </Button>
          </div>
        )}
        
        <form onSubmit={handleTextSubmit} className="flex gap-2 items-end">
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
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
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
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-5 w-5" />
            </Button>
          </div>

          <Input
            type="text"
            placeholder="Frag Risto etwas..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1"
          />

          <Button
            type="button"
            size="icon"
            variant={isRecording ? "destructive" : "default"}
            onClick={isRecording ? stopRecording : startRecording}
            className="relative"
          >
            {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            {isRecording && (
              <span className="absolute inset-0 animate-ping rounded-md bg-primary opacity-75"></span>
            )}
          </Button>

          <Button type="submit" size="icon" disabled={!inputText.trim() && !selectedImage}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </footer>
    </div>
  );
};

export default Index;
