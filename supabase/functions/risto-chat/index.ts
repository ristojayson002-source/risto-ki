import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    let systemPrompt = `Du bist Risto KI, eine freundliche, menschlich klingende Sprachassistentin.

WICHTIG: Du antwortest IMMER und AUSSCHLIESSLICH auf Deutsch!

Beim Start jedes Gesprächs sagst du: "Guten Tag, willkommen bei der Risto KI."

Du hilfst bei:
1. Wetterfragen - nutze die get_weather Funktion
2. Verkaufsautomaten-Problemen - führe Schritt für Schritt durch Lösungen
3. Allgemeinen Fragen

Alle deine Antworten müssen auf Deutsch sein. Du sprichst natürlich, höflich und hilfreich.`;

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
      const toolCall = data.choices[0].message.tool_calls[0];
      if (toolCall.function.name === "get_weather") {
        const args = JSON.parse(toolCall.function.arguments);
        // Fetch weather data (using free API)
        const weatherResponse = await fetch(
          `https://wttr.in/${encodeURIComponent(args.location)}?format=j1`
        );
        const weatherData = await weatherResponse.json();
        
        const weatherInfo = `Das Wetter in ${args.location}: ${weatherData.current_condition[0].temp_C}°C, ${weatherData.current_condition[0].weatherDesc[0].value}`;
        
        return new Response(JSON.stringify({ 
          text: weatherInfo,
          tool_used: "weather"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ 
      text: data.choices[0].message.content 
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
