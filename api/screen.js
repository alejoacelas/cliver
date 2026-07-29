import { fillPrompt, PROMPTS } from "../lib/prompts.js";
import { runPrompt } from "../lib/openrouter.js";

export const maxDuration = 300;

const MAX_INPUT_LENGTH = 12_000;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Use POST /api/screen" });
  }

  const customerInfo = String(request.body?.customerInfo || "").trim();
  if (!customerInfo) {
    return response.status(400).json({ error: "Customer information is required" });
  }
  if (customerInfo.length > MAX_INPUT_LENGTH) {
    return response.status(400).json({ error: `Customer information must be under ${MAX_INPUT_LENGTH.toLocaleString()} characters` });
  }

  const startedAt = Date.now();
  try {
    const [screening, backgroundWork] = await Promise.all([
      runPrompt(fillPrompt(PROMPTS.screening, customerInfo)),
      runPrompt(fillPrompt(PROMPTS.backgroundWork, customerInfo)),
    ]);
    return response.status(200).json({
      screening,
      backgroundWork,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("Screening failed", error);
    return response.status(502).json({
      error: "The screening run failed. Please try again.",
      detail: process.env.NODE_ENV === "development"
        ? (error instanceof Error ? error.message : String(error))
        : undefined,
    });
  }
}
