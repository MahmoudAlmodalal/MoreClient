import { OPENAI_API_KEY, OPENAI_BASE_URL, GEMINI_API_KEY, GEMINI_BASE_URL } from "./env";

export type ChatTurn = { role: "system" | "user" | "assistant"; content: string };

// Tries Gemini first, then OpenAI. Returns null when both are unavailable.
export async function llmComplete(messages: ChatTurn[]): Promise<string | null> {
  if (GEMINI_API_KEY) {
    const out = await callGemini(messages);
    if (out !== null) return out;
  }
  if (OPENAI_API_KEY) {
    const out = await callOpenAi(messages);
    if (out !== null) return out;
  }
  return null;
}

async function callOpenAi(messages: ChatTurn[]): Promise<string | null> {
  try {
    const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.3,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

async function callGemini(messages: ChatTurn[]): Promise<string | null> {
  try {
    const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
    const body: Record<string, unknown> = { contents };
    if (sys) body["systemInstruction"] = { parts: [{ text: sys }] };
    const url = `${GEMINI_BASE_URL}/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || null;
  } catch {
    return null;
  }
}
