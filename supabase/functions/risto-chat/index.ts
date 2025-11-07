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
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&freshness=pd`,
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
      const results = data.web.results.slice(0, 5).map((result: any) => 
        `**${result.title}**\n${result.description}\n📍 Quelle: ${result.url}`
      ).join('\n\n---\n\n');
      return `🔍 **Aktuelle Suchergebnisse für "${query}":**\n\n${results}`;
    }
    
    return `Keine aktuellen Informationen zu "${query}" gefunden.`;
  } catch (error) {
    console.error('Search error:', error);
    return 'Suche fehlgeschlagen.';
  }
}

async function generateImage(prompt: string, apiKey: string): Promise<string | null> {
  try {
    console.log('Generating image with prompt:', prompt);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image generation failed:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('Image generation response:', JSON.stringify(data).slice(0, 200));
    
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (imageUrl) {
      console.log('Image generated successfully');
      return imageUrl;
    }
    
    console.error('No image URL in response');
    return null;
  } catch (error) {
    console.error('Image generation error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Limit conversation history to last 10 messages and remove images from history to avoid token limits
    const limitedMessages = messages.slice(-10).map((msg: any) => {
      if (Array.isArray(msg.content)) {
        // Remove image_url from content array to save tokens
        return {
          ...msg,
          content: msg.content.filter((item: any) => item.type !== 'image_url')
        };
      }
      return msg;
    });

    const currentDate = new Date().toLocaleDateString('de-DE', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let systemPrompt = `Du bist Risto KI, eine freundliche und kompetente KI-Assistentin.

AKTUELLES DATUM: ${currentDate}

KRITISCHE REGELN:
1. Antworte IMMER auf Deutsch
2. Bei Bildwünschen (z.B. "erstelle ein Bild", "zeig ein Bild", "male", "generiere"):
   - Nutze SOFORT die generate_image Funktion ohne zu fragen
   - Wandle deutsche Beschreibungen in detaillierte englische Prompts um
   - Wenn gefragt ob du Bilder erstellen kannst: Antworte "Ja, natürlich! Was möchtest du sehen?"
3. Bei Fragen zu aktuellen Ereignissen, Wetter, Nachrichten:
   - Nutze SOFORT search_web oder get_weather
   - KEINE Antworten aus veralteten Trainingsdaten
4. Du KANNST Bilder erstellen und hast Zugriff auf Echtzeitinformationen

FUNKTIONEN:
- **Bildgenerierung**: JA, du kannst Bilder erstellen
- **Echtzeit-Suche**: Aktuelle Informationen weltweit
- **Wetter**: Live-Wetterdaten für alle Orte
- **Bildanalyse**: Beschreibe hochgeladene Bilder

FORMATIERUNG:
- Nutze **fett** für wichtige Begriffe
- Strukturiere Antworten klar
- Kurz und präzise

Sei hilfreich, handle schnell, keine unnötigen Fragen.`;

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
          description: "Sucht im Internet nach aktuellen Informationen. VERWENDE DIES IMMER für: Wettervorhersagen (heute, morgen, kommende Tage), aktuelle Nachrichten, Sportergebnisse, Börsenkurse und alle zeitabhängigen Informationen. Formuliere die Suchanfrage präzise.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Die detaillierte Suchanfrage (z.B. 'Wetter Berlin morgen Vorhersage', 'Nachrichten Deutschland heute')"
              }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "generate_image",
          description: "Generiert SOFORT ein Bild wenn der Nutzer ein Bild möchte. Verwende dies bei jeder Bildanfrage ohne nachzufragen. Übersetze deutsche Beschreibungen automatisch ins Englische für bessere Ergebnisse.",
          parameters: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "Detaillierte englische Bildbeschreibung (übersetze deutsche Anfragen automatisch). Füge kreative Details hinzu für bessere Ergebnisse."
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
          ...limitedMessages,
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
          
          const current = weatherData.current_condition[0];
          const forecast = weatherData.weather || [];
          
          let weatherInfo = `☀️ **Wetter in ${args.location}**\n\n`;
          weatherInfo += `🌡️ **Aktuell:** ${current.temp_C}°C, ${current.weatherDesc[0].value}\n`;
          weatherInfo += `💨 **Wind:** ${current.windspeedKmph} km/h\n`;
          weatherInfo += `💧 **Luftfeuchtigkeit:** ${current.humidity}%\n\n`;
          
          if (forecast.length > 0) {
            weatherInfo += `📅 **Vorhersage:**\n`;
            forecast.slice(0, 3).forEach((day: any, index: number) => {
              const date = new Date(day.date);
              const dayName = index === 0 ? 'Heute' : index === 1 ? 'Morgen' : date.toLocaleDateString('de-DE', { weekday: 'short' });
              weatherInfo += `${dayName}: ${day.mintempC}°C - ${day.maxtempC}°C, ${day.hourly[4]?.weatherDesc[0]?.value || 'k.A.'}\n`;
            });
          }
          
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
          console.log('Image generation requested with prompt:', args.prompt);
          
          const imageUrl = await generateImage(args.prompt, LOVABLE_API_KEY);
          
          if (imageUrl) {
            toolMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: `IMAGE_GENERATED:${imageUrl}`
            });
          } else {
            toolMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: "Bildgenerierung fehlgeschlagen. Bitte versuche es erneut."
            });
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
              ...limitedMessages,
              data.choices[0].message,
              ...toolMessages
            ],
          }),
        });

        if (!finalResponse.ok) {
          throw new Error("Failed to get final response");
        }

        const finalData = await finalResponse.json();
        
        const finalMessage = finalData.choices?.[0]?.message;
        if (!finalMessage) {
          console.error("No final message in response:", finalData);
          return new Response(JSON.stringify({ 
            error: "Keine finale Antwort von der KI erhalten"
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // Check if any tool message contains a generated image
        let generatedImage = null;
        for (const msg of toolMessages) {
          if (msg.content.startsWith('IMAGE_GENERATED:')) {
            generatedImage = msg.content.replace('IMAGE_GENERATED:', '');
            break;
          }
        }
        
        return new Response(JSON.stringify({ 
          text: finalMessage.content || "Bild wurde generiert.",
          image: generatedImage
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check if response contains an image
    const responseMessage = data.choices?.[0]?.message;
    if (!responseMessage) {
      console.error("No message in response:", data);
      return new Response(JSON.stringify({ 
        error: "Keine Antwort von der KI erhalten"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageContent = responseMessage.content || "";
    const images = responseMessage.images;
    
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
