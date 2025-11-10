import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { VoiceAssistantModal } from "@/components/VoiceAssistantModal";

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

const Index = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceInput, setIsVoiceInput] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    currentUtteranceRef.current = null;
  };

  const speakText = (text: string) => {
    if (!isVoiceInput || !showVoiceModal) return;

    stopSpeaking();

    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported');
      return;
    }

    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/#{1,6}\s/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "de-DE";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const germanVoice = voices.find(voice => voice.lang.startsWith('de'));
      if (germanVoice) {
        utterance.voice = germanVoice;
      }
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      setVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = setVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      if (isVoiceInput && showVoiceModal) {
        setTimeout(() => startRecording(), 300);
      }
    };

    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    currentUtteranceRef.current = utterance;
  };

  const handleTranscript = (text: string) => {
    if (text) {
      sendMessage(text);
    }
  };

  const startRecording = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      console.error('Microphone permission denied:', error);
      toast({
        title: "Mikrofon-Zugriff erforderlich",
        description: "Bitte erlauben Sie den Mikrofon-Zugriff",
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Fehler",
        description: "Spracherkennung wird nicht unterstützt",
        variant: "destructive",
      });
      return;
    }

    if (isSpeaking) {
      stopSpeaking();
    }
    
    if (!showVoiceModal) {
      setShowVoiceModal(true);
      setIsVoiceInput(true);
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "de-DE";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);
      if (transcript.trim()) {
        await sendMessage(transcript);
      }
    };
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
      if (isVoiceInput && showVoiceModal) {
        setTimeout(() => startRecording(), 1000);
      }
    };
    recognition.onend = () => {
      setIsRecording(false);
      if (isVoiceInput && showVoiceModal && !isSpeaking) {
        setTimeout(() => startRecording(), 300);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    stopSpeaking();
    setIsRecording(false);
    setShowVoiceModal(false);
    setIsVoiceInput(false);
  };

  const sendMessage = async (text: string, imageData?: string, file?: File) => {
    let finalText = text;
    
    // If file is provided, add context about the file
    if (file) {
      finalText = text + `\n\n[Datei hochgeladen: ${file.name}, Typ: ${file.type}, Größe: ${(file.size / 1024).toFixed(2)} KB]`;
    }
    
    const userMessage: Message = { 
      role: "user", 
      content: finalText,
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
        image: data.image
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Only speak if this was a voice input and in voice mode
      if (data.text && isVoiceInput && showVoiceModal) {
        speakText(data.text);
      }
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

  const clearChat = () => {
    setMessages([]);
    stopSpeaking();
    setIsVoiceInput(false);
  };

  const handleAbortResponse = () => {
    stopSpeaking();
    setIsTyping(false);
  };

  const [isDragging, setIsDragging] = useState(false);

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
          const imageData = reader.result as string;
          sendMessage("Was ist auf diesem Bild?", imageData);
        };
        reader.readAsDataURL(file);
      } else {
        sendMessage(`Bitte bearbeite diese Datei: ${file.name}`, undefined, file);
      }
    }
  };

  return (
    <div 
      className={`min-h-screen bg-background flex flex-col transition-all ${isDragging ? 'ring-4 ring-primary ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/30 bg-background/95 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Risto
          </h1>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all hover:scale-110 rounded-full h-9 w-9 sm:h-10 sm:w-10"
            >
              <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
          {messages.length === 0 ? (
            <WelcomeScreen />
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {messages.map((msg, idx) => (
                <ChatMessage key={idx} message={msg} />
              ))}
              {isTyping && (
                <div className="flex justify-start animate-fade-in">
                  <div className="max-w-[85%] rounded-2xl p-4 sm:p-5 bg-card border border-border/30 backdrop-blur-sm shadow-lg">
                    <div className="flex space-x-2">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-primary rounded-full animate-bounce shadow-glow" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-primary rounded-full animate-bounce shadow-glow" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-primary rounded-full animate-bounce shadow-glow" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <ChatInput
        onSendMessage={sendMessage}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        isRecording={isRecording}
        disabled={isTyping}
        onAbort={handleAbortResponse}
        isGenerating={isTyping || isSpeaking}
      />

      <VoiceAssistantModal 
        isOpen={showVoiceModal}
        onClose={stopRecording}
        onTranscript={handleTranscript}
        onSendMessage={sendMessage}
      />
    </div>
  );
};

export default Index;
