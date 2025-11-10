import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscript: (text: string) => void;
  onSendMessage: (text: string) => void;
}

export const VoiceAssistantModal = ({ 
  isOpen, 
  onClose, 
  onTranscript,
  onSendMessage 
}: VoiceAssistantModalProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const startListening = async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        toast.error("Spracherkennung wird nicht unterstützt");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "de-DE";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        console.log("Listening started");
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);

        if (event.results[current].isFinal) {
          console.log("Final transcript:", transcriptText);
          setIsListening(false);
          handleSendMessage(transcriptText);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error("Bitte erlaube den Zugriff auf das Mikrofon");
        } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
          // Restart on other errors, but not on aborted or no-speech
          if (isOpen && !isSpeaking) {
            setTimeout(() => startListening(), 1000);
          }
        }
      };

      recognition.onend = () => {
        console.log("Recognition ended");
        setIsListening(false);
        // Auto-restart listening if modal is open and not speaking
        if (isOpen && !isSpeaking) {
          setTimeout(() => {
            if (isOpen && !isSpeaking) {
              startListening();
            }
          }, 500);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error("Error starting recognition:", error);
      toast.error("Mikrofon-Zugriff fehlgeschlagen");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const speak = (text: string) => {
    if (!synthRef.current) return;

    // Stop any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Get German voice
    const setVoice = () => {
      const voices = synthRef.current?.getVoices() || [];
      const germanVoice = voices.find(voice => voice.lang.startsWith('de'));
      if (germanVoice) {
        utterance.voice = germanVoice;
      }
    };

    if (synthRef.current.getVoices().length > 0) {
      setVoice();
    } else {
      synthRef.current.onvoiceschanged = setVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      stopListening(); // Stop listening while speaking
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      // Restart listening after speaking
      setTimeout(() => {
        if (isOpen) {
          startListening();
        }
      }, 300);
    };

    utterance.onerror = (e) => {
      console.error("Speech synthesis error:", e);
      setIsSpeaking(false);
    };

    synthRef.current.speak(utterance);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    setTranscript("");
    onTranscript(text);

    try {
      // Get response from API
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/risto-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [
              { role: "user", content: text }
            ],
          }),
        }
      );

      const data = await response.json();
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.text) {
        setResponse(data.text);
        // Clean markdown from text before speaking
        const cleanText = data.text
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/#{1,6}\s/g, '')
          .replace(/```[\s\S]*?```/g, ''); // Remove code blocks
        
        speak(cleanText);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Verbindung fehlgeschlagen");
    }
  };

  useEffect(() => {
    if (isOpen) {
      startListening();
    } else {
      stopListening();
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      setIsSpeaking(false);
      setTranscript("");
      setResponse("");
    }

    return () => {
      stopListening();
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-background border-border/50 shadow-2xl">
        <div className="flex flex-col items-center justify-center py-8 space-y-6 px-4">
          {/* Microphone Animation */}
          <div className="relative w-40 h-40">
            {isListening && (
              <>
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                <div className="absolute inset-4 bg-primary/30 rounded-full animate-pulse"></div>
                <div className="absolute inset-8 bg-primary/40 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
              </>
            )}
            <div className={`relative flex items-center justify-center w-full h-full bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-glow transition-all ${isSpeaking ? 'scale-110' : ''}`}>
              {isSpeaking ? (
                <Volume2 className="h-20 w-20 text-primary-foreground animate-pulse" />
              ) : (
                <Mic className="h-20 w-20 text-primary-foreground" />
              )}
            </div>
          </div>
          
          {/* Status Text */}
          <div className="text-center space-y-2 min-h-[80px]">
            <p className="text-lg font-medium text-foreground">
              {isSpeaking ? "Ich spreche..." : isListening ? "Ich höre zu..." : "Bereit"}
            </p>
            {transcript && (
              <p className="text-sm text-muted-foreground italic">"{transcript}"</p>
            )}
            {response && !isSpeaking && (
              <p className="text-sm text-primary font-medium max-w-md">
                {response.substring(0, 100)}...
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-4">
            <Button
              onClick={isListening ? stopListening : startListening}
              size="lg"
              variant={isListening ? "destructive" : "default"}
              className="gap-2 rounded-full px-8"
            >
              {isListening ? (
                <>
                  <MicOff className="h-5 w-5" />
                  Stoppen
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5" />
                  Starten
                </>
              )}
            </Button>

            {isSpeaking && (
              <Button
                onClick={() => synthRef.current?.cancel()}
                size="lg"
                variant="outline"
                className="gap-2 rounded-full px-8"
              >
                <VolumeX className="h-5 w-5" />
                Stumm
              </Button>
            )}
          </div>

          {/* Close Button */}
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="mt-4"
          >
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};