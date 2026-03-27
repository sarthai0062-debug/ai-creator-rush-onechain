const MODEL_NAME = "stepfun-ai/step-3.5-flash";
const UNSAFE_TERMS = [
  "sexual minor",
  "child porn",
  "self harm",
  "suicide method",
  "bomb making",
  "hate crime",
];

function sanitizeText(input) {
  return String(input || "")
    .replace(/[<>`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 800);
}

function containsUnsafe(input) {
  const text = sanitizeText(input).toLowerCase();
  return UNSAFE_TERMS.some((term) => text.includes(term));
}

function buildNpcSystemPrompt(npc) {
  return [
    `You are ${npc.name}, an NPC in a fantasy-tech world.`,
    `Role: ${npc.role}.`,
    `Tone: ${npc.tone}.`,
    `Primary goal: ${npc.goal}.`,
    `Knowledge focus: ${npc.knowledge}.`,
    npc.challengeFocus ? `Challenge specialty: ${npc.challengeFocus}.` : "",
    "Keep responses short, useful, and immersive for gameplay.",
    "Offer one concrete next action when possible.",
  ].join(" ");
}

export async function streamNpcReply({ npc, history, playerMessage, onChunk }) {
  if (containsUnsafe(playerMessage)) {
    throw new Error("Message blocked by safety filter. Please use a safer request.");
  }
  const messages = [
    { role: "system", content: buildNpcSystemPrompt(npc) },
    ...history,
    { role: "user", content: sanitizeText(playerMessage) },
  ];

  const response = await fetch("/api/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages,
      temperature: 0.8,
      top_p: 0.9,
      max_tokens: 1200,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text();
    if (response.status === 401 && text.includes("authorization")) {
      throw new Error(
        "Chat request failed (401): missing NVIDIA auth header. Set NVAPI_KEY in .env and restart npm run dev."
      );
    }
    throw new Error(`Chat request failed (${response.status}): ${text}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let reasoningText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed?.choices?.[0]?.delta || {};
        if (delta.reasoning_content) {
          reasoningText += delta.reasoning_content;
        }
        if (delta.content) {
          fullText += delta.content;
          onChunk?.(delta.content, fullText);
        }
      } catch {
        // Ignore malformed SSE chunk.
      }
    }
  }

  return { text: fullText.trim(), reasoning: reasoningText.trim() };
}
