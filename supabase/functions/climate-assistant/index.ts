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
    const { message, climateData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are Clima 🌤️, a friendly climate research assistant. 
Your role is to help users find climate outlook data for specific locations and dates.

When users ask about climate data:
- ALWAYS extract location names and dates from their queries using the extract_search_params function
- Extract any location mentioned (cities, countries, regions)
- Convert relative dates (like "next month", "February 2026") to specific dates in YYYY-MM-DD format
- If only month/year is mentioned, use the 15th of that month
- Today's date is ${new Date().toISOString().split('T')[0]}
- Be warm, encouraging, and make climate data feel accessible
- Keep responses concise and friendly

After extracting the parameters, briefly acknowledge what you found and ask if they want to proceed.`;

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
          { role: "user", content: message },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_search_params",
              description: "Extract location and date from user's climate search query",
              parameters: {
                type: "object",
                properties: {
                  location: {
                    type: "string",
                    description: "The location name mentioned by the user (city, country, or region)"
                  },
                  date: {
                    type: "string",
                    description: "The date in YYYY-MM-DD format. Convert relative dates (like 'next month', 'February 2026') to absolute dates. If only month/year is given, use the 15th of that month. Today is " + new Date().toISOString().split('T')[0]
                  }
                },
                required: [],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: "auto"
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    console.log("AI Response:", JSON.stringify(data, null, 2));
    
    const aiMessage = data.choices?.[0]?.message;
    
    let extractedParams = null;
    if (aiMessage?.tool_calls && aiMessage.tool_calls.length > 0) {
      const toolCall = aiMessage.tool_calls[0];
      console.log("Tool call detected:", JSON.stringify(toolCall, null, 2));
      if (toolCall.function.name === "extract_search_params") {
        extractedParams = JSON.parse(toolCall.function.arguments);
        console.log("Extracted params:", extractedParams);
      }
    } else {
      console.log("No tool calls in response");
    }

    return new Response(
      JSON.stringify({ 
        reply: aiMessage?.content || "I'm here to help with your climate research!",
        searchParams: extractedParams
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Climate assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
