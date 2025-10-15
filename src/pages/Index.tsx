import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const Index = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [inputText, setInputText] = useState("");
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!hasGreeted) {
      speakText("Guten Tag, willkommen bei der Risto KI. Wie kann ich Ihnen heute helfen?");
      setHasGreeted(true);
    }
  }, [hasGreeted]);

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
    try {
      // Initialize speech recognition
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
        console.log("Spracherkennung gestartet");
        setIsRecording(true);
      };

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log("Erkannter Text:", transcript);
        setIsRecording(false);
        
        const userMessage: Message = { role: "user", content: transcript };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);

        try {
          console.log("Sende Anfrage an Edge Function...");
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/risto-chat`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                messages: updatedMessages,
              }),
            }
          );

          console.log("Response Status:", response.status);
          const data = await response.json();
          console.log("Response Data:", data);
          
          if (data.error) {
            toast({
              title: "Fehler",
              description: data.error,
              variant: "destructive",
            });
            return;
          }

          const assistantMessage: Message = { role: "assistant", content: data.text };
          setMessages(prev => [...prev, assistantMessage]);
          speakText(data.text);
        } catch (fetchError) {
          console.error("Fetch Error:", fetchError);
          toast({
            title: "Fehler",
            description: "Verbindung zur KI fehlgeschlagen",
            variant: "destructive",
          });
        }
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
        console.log("Spracherkennung beendet");
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

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage: Message = { role: "user", content: inputText };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText("");

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
            messages: updatedMessages,
          }),
        }
      );

      const data = await response.json();
      
      if (data.error) {
        toast({
          title: "Fehler",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      const assistantMessage: Message = { role: "assistant", content: data.text };
      setMessages(prev => [...prev, assistantMessage]);
      speakText(data.text);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Fehler",
        description: "Verbindung zur KI fehlgeschlagen",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary">Risto KI</h1>
          <p className="text-muted-foreground">Ihre Sprachassistentin</p>
        </div>

        <div className="flex justify-center">
          <div className="relative">
            {isSpeaking && (
              <div className="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-75"></div>
            )}
            {isRecording && (
              <div className="absolute inset-0 animate-pulse rounded-full bg-blue-400 opacity-75"></div>
            )}
            <Button
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              className="rounded-full h-32 w-32"
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? (
                <MicOff className="h-16 w-16" />
              ) : (
                <Mic className="h-16 w-16" />
              )}
            </Button>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          {isRecording
            ? "Ich höre zu..."
            : isSpeaking
            ? "Ich spreche..."
            : "Drücken Sie den Button um zu sprechen"}
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleTextSubmit} className="flex gap-2">
          <Input
            type="text"
            placeholder="Oder schreiben Sie Ihre Frage hier..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!inputText.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Index;
