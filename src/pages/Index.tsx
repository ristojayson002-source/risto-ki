import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { VoiceRecordingModal } from "@/components/VoiceRecordingModal";

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
    // Remove markdown formatting for speech
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/#{1,6}\s/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "de-DE";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const germanVoices = voices.filter(voice => voice.lang.startsWith('de'));
    const premiumVoice = germanVoices.find(v => 
      v.name.includes('Premium') || v.name.includes('Enhanced') || v.name.includes('Natural')
    );
    const germanVoice = premiumVoice || germanVoices.find(v => v.lang === 'de-DE') || germanVoices[0];
    
    if (germanVoice) {
      utterance.voice = germanVoice;
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const startRecording = async () => {
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

      // Stop any ongoing speech
      stopSpeaking();
      
      setShowVoiceModal(true);
      setIsVoiceInput(true);

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
        setShowVoiceModal(false);
        await sendMessage(transcript);
        setIsVoiceInput(false);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
        setShowVoiceModal(false);
        setIsVoiceInput(false);
        toast({
          title: "Fehler",
          description: `Spracherkennung fehlgeschlagen: ${event.error}`,
          variant: "destructive",
        });
      };

      recognition.onend = () => {
        setIsRecording(false);
        setShowVoiceModal(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsRecording(false);
      setShowVoiceModal(false);
      setIsVoiceInput(false);
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
      setShowVoiceModal(false);
      setIsVoiceInput(false);
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
        image: data.image
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Only speak if this was a voice input
      if (data.text && !data.image && isVoiceInput) {
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Risto KI
          </h1>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {messages.length === 0 ? (
            <WelcomeScreen />
          ) : (
            <div className="space-y-6">
              {messages.map((msg, idx) => (
                <ChatMessage key={idx} message={msg} />
              ))}
              {isTyping && (
                <div className="flex justify-start animate-fade-in">
                  <div className="max-w-[80%] rounded-2xl p-4 bg-muted/50 backdrop-blur-sm border border-border/50">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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

      <VoiceRecordingModal 
        isOpen={showVoiceModal}
        onClose={stopRecording}
      />
    </div>
  );
};

export default Index;
