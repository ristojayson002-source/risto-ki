import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff } from "lucide-react";
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
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
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Mikrofon-Zugriff nicht möglich",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.lang = "de-DE";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        
        const userMessage: Message = { role: "user", content: transcript };
        setMessages(prev => [...prev, userMessage]);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/risto-chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              messages: [...messages, userMessage],
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
      };

      recognition.onerror = () => {
        toast({
          title: "Fehler",
          description: "Spracherkennung fehlgeschlagen",
          variant: "destructive",
        });
      };

      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.play();
      recognition.start();
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Verarbeitung fehlgeschlagen",
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
      </Card>
    </div>
  );
};

export default Index;
