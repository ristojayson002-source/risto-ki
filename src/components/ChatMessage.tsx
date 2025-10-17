import ReactMarkdown from "react-markdown";
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

  return (
    <div
      className={`flex w-full ${
        message.role === "user" ? "justify-end" : "justify-start"
      } animate-fade-in`}
    >
      <div
        className={`max-w-[80%] md:max-w-[70%] rounded-2xl p-4 ${
          message.role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-muted/50 backdrop-blur-sm border border-border/50"
        }`}
      >
        {message.image && (
          <div className="mb-3 relative group">
            <img 
              src={message.image} 
              alt={message.role === "user" ? "Hochgeladenes Bild" : "Generiertes Bild"} 
              className="rounded-xl w-full h-auto shadow-lg"
            />
            {message.role === "assistant" && (
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDownload(message.image!)}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            )}
          </div>
        )}
        {message.role === "assistant" ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                strong: ({ children }) => (
                  <strong className="font-bold text-primary">{children}</strong>
                ),
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0 leading-relaxed text-foreground">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">{children}</li>
                ),
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
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="leading-relaxed">{message.content}</p>
        )}
      </div>
    </div>
  );
};
