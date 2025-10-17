import { Sparkles, Cloud, Image, Search } from "lucide-react";

export const WelcomeScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-12 animate-fade-in">
      <div className="text-center space-y-6 max-w-2xl">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
          <Sparkles className="w-10 h-10 text-primary" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Willkommen bei Risto KI
        </h1>
        
        <p className="text-lg text-muted-foreground">
          Deine intelligente Assistentin für Informationen, Bilder und mehr
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
          <div className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Search className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Echtzeit-Suche</h3>
              <p className="text-sm text-muted-foreground">
                Aktuelle Informationen aus dem Internet
              </p>
            </div>
          </div>

          <div className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Image className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Bildgenerierung</h3>
              <p className="text-sm text-muted-foreground">
                Erstelle einzigartige Bilder mit KI
              </p>
            </div>
          </div>

          <div className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Cloud className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Wetter</h3>
              <p className="text-sm text-muted-foreground">
                Wetterdaten für jeden Ort weltweit
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
