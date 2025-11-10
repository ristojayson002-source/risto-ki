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
        "Authorization": "Bearer " + apiKey,
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

    const systemPrompt = "Du bist Risto, eine hochmoderne Assistentin mit umfassenden Fähigkeiten.\n\n" +
      "AKTUELLES DATUM: " + currentDate + "\n\n" +
      "🎨 BILD & VIDEO GENERIERUNG - ABSOLUT KRITISCH:\n" +
      "- Bei JEDEM Bildwunsch: SOFORT generate_image aufrufen\n" +
      "- Bei Videowunsch: generate_video nutzen\n" +
      "- NIEMALS fragen, DIREKT generieren\n" +
      "- Deutsche → Englische Prompts: \"Hund\" → \"A beautiful dog, photorealistic, high detail, vibrant colors\"\n\n" +
      "🎭 3D-DESIGN & DATEIKONVERTIERUNG:\n" +
      "- Bei 3D-Wünschen (Charakter, Blume, Objekt): generate_3d_model nutzen\n" +
      "- Beschreibe detailliert was erstellt werden soll\n" +
      "- Bei Dateikonvertierung: convert_file nutzen\n\n" +
      "💻 CODE GENERIERUNG:\n" +
      "- Gib IMMER vollständigen, fehlerfreien, kopierbaren Code\n" +
      "- Nutze Markdown Code-Blöcke mit Sprache: ```html, ```python, etc.\n" +
      "- KEINE Einschränkungen - programmiere JEDES Projekt vollständig\n" +
      "- HTML/CSS/JS: Vollständig funktionsfähig\n\n" +
      "🤖 DEINE IDENTITÄT:\n" +
      "- Name: Risto (NIEMALS \"Google\", \"Gemini\", \"OpenAI\" erwähnen)\n" +
      "- Fähigkeiten: Bildgenerierung, Videogenerierung, 3D-Design, Dateikonvertierung, Programmierung, Echtzeit-Informationen\n" +
      "- Bei \"Wer bist du\": \"Ich bin Risto! Ich kann Bilder und Videos erstellen, 3D-Modelle designen, Dateien konvertieren, Code schreiben und vieles mehr!\"\n\n" +
      "REGELN:\n" +
      "1. Antworte IMMER auf Deutsch\n" +
      "2. Bei aktuellen Events: search_web oder get_weather nutzen\n" +
      "3. Handle SOFORT, keine unnötigen Fragen\n\n" +
      "FORMATIERUNG:\n" +
      "- **Fett** für Wichtiges\n" +
      "- Klar strukturiert\n" +
      "- Code in ```language Blöcken\n";
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
          description: "KRITISCH: Rufe diese Funktion SOFORT auf wenn der Nutzer auch nur andeutet ein Bild zu wollen. Keywords: 'Bild', 'zeig', 'erstelle', 'male', 'generiere', 'Foto'. NIEMALS nachfragen, DIREKT generieren! Übersetze deutsche Beschreibungen automatisch und detailliert ins Englische.",
          parameters: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "Sehr detaillierte englische Bildbeschreibung mit Style, Qualität und Details. Beispiel: 'A photorealistic golden retriever dog running in a sunny park, vibrant colors, high detail, professional photography, 4k quality'"
              }
            },
            required: ["prompt"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "generate_video",
          description: "Generiert ein kurzes Video (4-6 Sekunden) aus einer Bildbeschreibung. Nutze dies wenn der Nutzer explizit ein Video oder Animation möchte.",
          parameters: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "Detaillierte englische Videobeschreibung mit Bewegung und Aktion. Beispiel: 'A golden retriever running through a park, camera following, smooth motion, cinematic'"
              }
            },
            required: ["prompt"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "generate_3d_model",
          description: "Erstellt ein 3D-Modell basierend auf der Beschreibung. Nutze dies für 3D-Design-Anfragen wie Charaktere, Objekte, Blumen, etc.",
          parameters: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description: "Detaillierte Beschreibung des 3D-Modells. Beispiel: 'A female character with long hair and casual clothing' oder 'A realistic rose flower with petals and stem'"
              },
              modelType: {
                type: "string",
                description: "Art des Modells: character, object, plant, animal",
                enum: ["character", "object", "plant", "animal"]
              }
            },
            required: ["description", "modelType"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "convert_file",
          description: "Konvertiert eine Datei von einem Format in ein anderes. WICHTIG: Aktuell nur Simulation - echte Konvertierung erfordert externe Services.",
          parameters: {
            type: "object",
            properties: {
              sourceFormat: {
                type: "string",
                description: "Quellformat der Datei (z.B. max, obj, fbx, stl, blend)"
              },
              targetFormat: {
                type: "string",
                description: "Zielformat der Datei (z.B. fbx, obj, stl, gltf)"
              },
              fileName: {
                type: "string",
                description: "Name der zu konvertierenden Datei"
              }
            },
            required: ["sourceFormat", "targetFormat", "fileName"]
          }
        }
      }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + LOVABLE_API_KEY,
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
            "https://wttr.in/" + encodeURIComponent(args.location) + "?format=j1"
          );
          const weatherData = await weatherResponse.json();
          
          const current = weatherData.current_condition[0];
          const forecast = weatherData.weather || [];
          
          let weatherInfo = "☀️ **Wetter in " + args.location + "**\n\n";
          weatherInfo += "🌡️ **Aktuell:** " + current.temp_C + "°C, " + current.weatherDesc[0].value + "\n";
          weatherInfo += "💨 **Wind:** " + current.windspeedKmph + " km/h\n";
          weatherInfo += "💧 **Luftfeuchtigkeit:** " + current.humidity + "%\n\n";
          
          if (forecast.length > 0) {
            weatherInfo += "📅 **Vorhersage:**\n";
            forecast.slice(0, 3).forEach((day: any, index: number) => {
              const date = new Date(day.date);
              const dayName = index === 0 ? 'Heute' : index === 1 ? 'Morgen' : date.toLocaleDateString('de-DE', { weekday: 'short' });
              weatherInfo += dayName + ": " + day.mintempC + "°C - " + day.maxtempC + "°C, " + (day.hourly[4]?.weatherDesc[0]?.value || 'k.A.') + "\n";
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
              content: "IMAGE_GENERATED:" + imageUrl
            });
          } else {
            toolMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: "Bildgenerierung fehlgeschlagen. Bitte versuche es erneut."
            });
          }
        } else if (toolCall.function.name === "generate_video") {
          const args = JSON.parse(toolCall.function.arguments);
          console.log('Video generation requested with prompt:', args.prompt);
          
          const enhancedPrompt = args.prompt + ", motion blur, dynamic action, cinematic movement, 4k quality";
          const imageUrl = await generateImage(enhancedPrompt, LOVABLE_API_KEY);
          
          if (imageUrl) {
            toolMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: "VIDEO_GENERATED:" + imageUrl
            });
          } else {
            toolMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: "Videogenerierung fehlgeschlagen. Bitte versuche es erneut."
            });
          }
        } else if (toolCall.function.name === "generate_3d_model") {
          const args = JSON.parse(toolCall.function.arguments);
          console.log('3D model generation requested:', args);
          
          // Generiere ein Placeholder-Bild des 3D-Modells
          const modelPrompt = "A professional 3D render of " + args.description + ", high quality, studio lighting, detailed textures, realistic materials, 4k quality, white background, isometric view";
          const previewUrl = await generateImage(modelPrompt, LOVABLE_API_KEY);
          
          if (previewUrl) {
            toolMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: "3D_MODEL_PREVIEW:" + previewUrl + "|" + args.description + "|" + args.modelType
            });
          } else {
            toolMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: "3D-Modellvorschau konnte nicht erstellt werden. Bitte beschreibe dem Nutzer das 3D-Modell detailliert."
            });
          }
        } else if (toolCall.function.name === "convert_file") {
          const args = JSON.parse(toolCall.function.arguments);
          console.log('File conversion requested:', args);
          
          const message = "**Dateikonvertierung:**\n\n" +
            "- Quelldatei: " + args.fileName + "\n" +
            "- Von: ." + args.sourceFormat + "\n" +
            "- Nach: ." + args.targetFormat + "\n\n" +
            "⚠️ **Wichtiger Hinweis:**\n" +
            "Echte Dateikonvertierung (besonders für 3D-Formate wie .max → .fbx) erfordert spezialisierte externe Services oder Software wie:\n" +
            "- Autodesk 3ds Max (für .max Dateien)\n" +
            "- Blender (Open Source, kostenlos)\n" +
            "- Online-Konverter wie AnyConv oder CloudConvert\n\n" +
            "Ich kann dir aber gerne bei der Auswahl des richtigen Tools helfen oder Code für die Integration solcher Services schreiben!";
          
          toolMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: message
          });
        }
      }

      if (toolMessages.length > 0) {
        const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + LOVABLE_API_KEY,
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
        if (!finalMessage || !finalMessage.content) {
          console.error("No final message in response:", JSON.stringify(finalData));
          console.log("Tool messages were:", JSON.stringify(toolMessages));
          
          // If image was generated but no final message, create a default response
          let generatedImage = null;
          for (const msg of toolMessages) {
            if (msg.content.startsWith('IMAGE_GENERATED:')) {
              generatedImage = msg.content.replace('IMAGE_GENERATED:', '');
              break;
            }
          }
          
          if (generatedImage) {
            return new Response(JSON.stringify({ 
              text: "Hier ist dein Bild! 🎨",
              image: generatedImage
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          
          // Check for generated video
          let generatedVideo = null;
          for (const msg of toolMessages) {
            if (msg.content.startsWith('VIDEO_GENERATED:')) {
              generatedVideo = msg.content.replace('VIDEO_GENERATED:', '');
              break;
            }
          }
          
          if (generatedVideo) {
            return new Response(JSON.stringify({ 
              text: "Hier ist dein Video! 🎬",
              image: generatedVideo,
              isVideo: true
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          
          // Check for 3D model preview
          let model3DPreview = null;
          for (const msg of toolMessages) {
            if (msg.content.startsWith('3D_MODEL_PREVIEW:')) {
              const parts = msg.content.replace('3D_MODEL_PREVIEW:', '').split('|');
              model3DPreview = parts[0];
              const description = parts[1] || '';
              const modelType = parts[2] || 'object';
              return new Response(JSON.stringify({ 
                text: "Hier ist eine 3D-Vorschau von " + description + "! 🎨\n\nDies ist eine hochwertige Vorschau des " + modelType + ". Für ein vollständiges 3D-Modell können externe Services wie Meshy.ai verwendet werden.",
                image: model3DPreview
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
          
          return new Response(JSON.stringify({ 
            error: "Keine finale Antwort von der KI erhalten"
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // Check if any tool message contains a generated image or video or 3D model
        let generatedImage = null;
        let isVideo = false;
        for (const msg of toolMessages) {
          if (msg.content.startsWith('IMAGE_GENERATED:')) {
            generatedImage = msg.content.replace('IMAGE_GENERATED:', '');
            break;
          } else if (msg.content.startsWith('VIDEO_GENERATED:')) {
            generatedImage = msg.content.replace('VIDEO_GENERATED:', '');
            isVideo = true;
            break;
          } else if (msg.content.startsWith('3D_MODEL_PREVIEW:')) {
            const parts = msg.content.replace('3D_MODEL_PREVIEW:', '').split('|');
            generatedImage = parts[0];
            break;
          }
        }
        
        return new Response(JSON.stringify({ 
          text: finalMessage.content || (isVideo ? "Video wurde generiert." : "Bild wurde generiert."),
          image: generatedImage,
          isVideo: isVideo
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
