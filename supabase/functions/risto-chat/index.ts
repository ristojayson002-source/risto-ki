import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function searchWeb(query: string): Promise<string> {
  try {
    const BRAVE_API_KEY = Deno.env.get("BRAVE_SEARCH_API_KEY");
    if (!BRAVE_API_KEY) {
      console.error('BRAVE_SEARCH_API_KEY not configured');
      return 'Suche nicht verfügbar - API-Schlüssel fehlt.';
    }

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': BRAVE_API_KEY
        }
      }
    );
    
    if (!response.ok) {
      console.error('Brave Search API error:', response.status, await response.text());
      return `Suche fehlgeschlagen: ${response.status}`;
    }

    const data = await response.json();
    
    if (data.web?.results && data.web.results.length > 0) {
      const results = data.web.results.slice(0, 3).map((result: any) => 
        `${result.title}: ${result.description}`
      ).join('\n\n');
      return `Suchergebnisse für "${query}":\n\n${results}`;
    }
    
    return `Keine aktuellen Informationen zu "${query}" gefunden.`;
  } catch (error) {
    console.error('Search error:', error);
    return 'Suche fehlgeschlagen.';
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Aktuelles Datum für Echtzeitinformationen
    const currentDate = new Date().toLocaleDateString('de-DE', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let systemPrompt = `Du bist Risto KI, eine freundliche, menschlich klingende Assistentin mit Zugriff auf aktuelle Informationen, Bildanalyse und Bildgenerierung.

WICHTIG: Du antwortest IMMER und AUSSCHLIESSLICH auf Deutsch!

AKTUELLES DATUM: Heute ist ${currentDate}

Du hilfst bei:
1. **Wetterfragen** - nutze die get_weather Funktion
2. **Aktuelle Informationen** - nutze die search_web Funktion für Echtzeitdaten und Ereignisse
3. **Bildanalyse** - beschreibe Bilder detailliert, erkenne Objekte, Text und Szenen
4. **Bildgenerierung** - erstelle Bilder mit der generate_image Funktion wenn Nutzer danach fragen
5. **Verkaufsautomaten-Problemen** - führe Schritt für Schritt durch Lösungen
6. **Allgemeinen Fragen**

FORMATIERUNG:
- Nutze **fett** für wichtige Begriffe und Schlüsselwörter
- Strukturiere längere Antworten mit Absätzen
- Verwende Listen wo sinnvoll

Alle deine Antworten müssen auf Deutsch sein. Du sprichst natürlich, höflich und hilfreich.
Antworte direkt auf die Frage des Nutzers ohne erneute Begrüßung.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "get_weather",
          description: "Ruft aktuelle Wetterdaten für einen Ort ab",
          parameters: {
            type: "object",
            properties: {
              location: { 
                type: "string",
                description: "Der Ort für den das Wetter abgerufen werden soll"
              }
            },
            required: ["location"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "search_web",
          description: "Sucht im Internet nach aktuellen Informationen. Nutze dies für Fragen zu aktuellen Ereignissen, Nachrichten oder Informationen.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Die Suchanfrage auf Deutsch oder Englisch"
              }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "generate_image",
          description: "Generiert ein Bild basierend auf einer Beschreibung. Nutze dies wenn Nutzer ein Bild erstellen möchten.",
          parameters: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "Die detaillierte Beschreibung des zu erstellenden Bildes auf Englisch"
              }
            },
            required: ["prompt"]
          }
        }
      }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools: tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Zu viele Anfragen, bitte versuchen Sie es später erneut." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Zahlungspflichtig, bitte fügen Sie Credits zu Ihrem Lovable AI-Workspace hinzu." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    // Check if tool call is needed
    if (data.choices[0].message.tool_calls) {
      const toolCalls = data.choices[0].message.tool_calls;
      const toolMessages = [];

      for (const toolCall of toolCalls) {
        if (toolCall.function.name === "get_weather") {
          const args = JSON.parse(toolCall.function.arguments);
          const weatherResponse = await fetch(
            `https://wttr.in/${encodeURIComponent(args.location)}?format=j1`
          );
          const weatherData = await weatherResponse.json();
          
          const weatherInfo = `Aktuelles Wetter in ${args.location}: Temperatur ${weatherData.current_condition[0].temp_C}°C, ${weatherData.current_condition[0].weatherDesc[0].value}`;
          
          toolMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: weatherInfo
          });
        } else if (toolCall.function.name === "search_web") {
          const args = JSON.parse(toolCall.function.arguments);
          const searchResult = await searchWeb(args.query);
          
          toolMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: searchResult
          });
        } else if (toolCall.function.name === "generate_image") {
          const args = JSON.parse(toolCall.function.arguments);
          
          // Generate image using Lovable AI
          const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image-preview",
              messages: [
                {
                  role: "user",
                  content: args.prompt
                }
              ],
              modalities: ["image", "text"]
            }),
          });

          if (!imageResponse.ok) {
            toolMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: "Bildgenerierung fehlgeschlagen."
            });
          } else {
            const imageData = await imageResponse.json();
            const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            
            if (imageUrl) {
              toolMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: `Bild erfolgreich generiert: ${imageUrl}`
              });
            } else {
              toolMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: "Bildgenerierung fehlgeschlagen - kein Bild erhalten."
              });
            }
          }
        }
      }

      if (toolMessages.length > 0) {
        const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              ...messages,
              data.choices[0].message,
              ...toolMessages
            ],
          }),
        });

        if (!finalResponse.ok) {
          throw new Error("Failed to get final response");
        }

        const finalData = await finalResponse.json();
        
        return new Response(JSON.stringify({ 
          text: finalData.choices[0].message.content
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check if response contains an image
    const messageContent = data.choices[0].message.content;
    const images = data.choices[0].message.images;
    
    return new Response(JSON.stringify({ 
      text: messageContent,
      image: images?.[0]?.image_url?.url
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
