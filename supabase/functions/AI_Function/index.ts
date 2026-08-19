import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  try {
    const { message, shapes = [], selectedShape = null } = await request.json();
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) throw new Error("GROQ_API_KEY sozlanmagan");

    const completion = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Sen lazer chizma muharriri yordamchisisan. Uzbek tilida javob ber. Foydalanuvchi shakl chizishni so'rasa, shapes massiviga valid shape obyektlari qo'sh: type faqat line, rect, circle, ellipse, semicircle yoki path bo'lsin; path uchun points [[x,y]] va closed kerak. Javobni faqat JSON qaytar: {message:string, shapes:array}.",
            },
            {
              role: "user",
              content: JSON.stringify({
                request: message,
                selectedShape,
                existingShapeCount: shapes.length,
              }),
            },
          ],
        }),
      },
    );
    if (!completion.ok) throw new Error(await completion.text());
    const result = await completion.json();
    const parsed = JSON.parse(result.choices?.[0]?.message?.content || "{}");
    return new Response(
      JSON.stringify({
        message: parsed.message || "Bajarildi.",
        shapes: Array.isArray(parsed.shapes) ? parsed.shapes : [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "AI xatosi" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
