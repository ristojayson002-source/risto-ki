import ReactMarkdown from "react-markdown";
import { Components } from 'react-markdown';
import { Download, Play, Copy, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);

  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'risto-bild.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateVideo = async (imageUrl: string) => {
    setGeneratingVideo(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setGeneratingVideo(false);
    handleDownload(imageUrl);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const handlePreviewHTML = (code: string) => {
    setHtmlPreview(code);
  };

  const markdownComponents: Components = {
    p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
    strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
    em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
    h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-foreground">{children}</h1>,
    h2: ({ children }) => <h2 className="text-xl font-bold mb-3 text-foreground">{children}</h2>,
    h3: ({ children }) => <h3 className="text-lg font-bold mb-2 text-foreground">{children}</h3>,
    ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    a: ({ children, href }) => (
      <a href={href} className="text-primary hover:text-primary/80 underline transition-colors" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    code: ({ node, inline, className, children, ...props }: any) => {
      if (inline) {
        return (
          <code className="bg-secondary/50 px-2 py-1 rounded text-sm font-mono" {...props}>
            {children}
          </code>
        );
      }
      
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      const language = match ? match[1] : '';
      const isHTML = language === 'html' || language === 'xml';
      
      return (
        <div className="relative group mb-3">
          <pre className="bg-secondary/50 p-4 rounded-lg overflow-x-auto">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {isHTML && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handlePreviewHTML(codeString)}
                className="h-7 px-2 gap-1"
              >
                <Eye className="h-3 w-3" />
                Anschauen
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleCopyCode(codeString)}
              className="h-7 px-2 gap-1"
            >
              <Copy className="h-3 w-3" />
              Kopieren
            </Button>
          </div>
        </div>
      );
    },
    pre: ({ children }) => <>{children}</>,
  };

  return (
    <div
      className={`flex w-full ${
        message.role === "user" ? "justify-end" : "justify-start"
      } animate-fade-in`}
    >
      <div
        className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-3 sm:p-5 shadow-lg transition-all hover:shadow-xl ${
          message.role === "user"
            ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground"
            : "bg-card border border-border/50 backdrop-blur-sm"
        }`}
      >
        {message.image && (
          <div className="mb-3 sm:mb-4 relative group">
            <img 
              src={message.image} 
              alt={message.role === "user" ? "Hochgeladenes Bild" : "Generiertes Bild"} 
              className="rounded-xl w-full h-auto shadow-lg ring-2 ring-border/20 cursor-pointer"
              onClick={() => message.role === "assistant" && setFullscreenImage(message.image!)}
            />
            {message.role === "assistant" && (
              <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="secondary"
                  className="shadow-lg hover:scale-110 transition-all text-xs sm:text-sm gap-1"
                  onClick={() => handleGenerateVideo(message.image!)}
                  disabled={generatingVideo}
                >
                  <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                  {generatingVideo ? "Generiere..." : "Video"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="shadow-lg hover:scale-110 transition-all text-xs sm:text-sm gap-1"
                  onClick={() => handleDownload(message.image!)}
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                  Download
                </Button>
              </div>
            )}
          </div>
        )}
        <div className={`prose prose-sm max-w-none text-sm sm:text-base ${message.role === "user" ? 'prose-invert' : 'dark:prose-invert'}`}>
          <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
        </div>
      </div>

      <Dialog open={!!fullscreenImage} onOpenChange={() => setFullscreenImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95">
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 z-50 bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          {fullscreenImage && (
            <img 
              src={fullscreenImage} 
              alt="Fullscreen" 
              className="w-full h-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!htmlPreview} onOpenChange={() => setHtmlPreview(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <button
            onClick={() => setHtmlPreview(null)}
            className="absolute top-4 right-4 z-50 bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          {htmlPreview && (
            <iframe
              srcDoc={htmlPreview}
              className="w-full h-[70vh] border-0 rounded-lg"
              title="HTML Preview"
              sandbox="allow-scripts"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};