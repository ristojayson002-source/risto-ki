import ReactMarkdown from "react-markdown";
import { Components } from 'react-markdown';
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'risto-ki-bild.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    code: ({ children }) => (
      <code className="bg-secondary/50 px-2 py-1 rounded text-sm font-mono">{children}</code>
    ),
    pre: ({ children }) => (
      <pre className="bg-secondary/50 p-4 rounded-lg overflow-x-auto mb-3">{children}</pre>
    ),
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
              className="rounded-xl w-full h-auto shadow-lg ring-2 ring-border/20"
            />
            {message.role === "assistant" && (
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2 sm:top-3 sm:right-3 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg text-xs sm:text-sm"
                onClick={() => handleDownload(message.image!)}
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            )}
          </div>
        )}
        <div className={`prose prose-sm max-w-none text-sm sm:text-base ${message.role === "user" ? 'prose-invert' : 'dark:prose-invert'}`}>
          <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
