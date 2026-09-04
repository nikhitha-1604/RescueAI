import { recommendAction } from "./recovery";
import type { RecoveryDecision, Signal } from "./types";

const SYSTEM = `You are RescueAI, a checkout recovery agent for a payments demo.
Write one short merchant-facing reason (max 40 words) for the recommended recovery action.
Never suggest auto-charging, changing the amount, or contacting the customer if they opted out.
Do not reveal hidden chain-of-thought.`;

export async function maybePolishReason(
  signals: Signal[],
  riskLevel: string,
  decision: RecoveryDecision
): Promise<RecoveryDecision> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return decision;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 80,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `Signals: ${signals.join(", ")}. Risk: ${riskLevel}. Action: ${decision.action}. Title: ${decision.title}.`,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        ...decision,
        usedFallback: true,
        aiNotice: "AI unavailable. Using fallback recovery engine.",
      };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return { ...decision, usedFallback: true };

    return { ...decision, reason: text, usedFallback: false };
  } catch {
    return {
      ...recommendAction(signals, riskLevel),
      usedFallback: true,
      aiNotice: "AI unavailable. Using fallback recovery engine.",
    };
  } finally {
    clearTimeout(timer);
  }
}
