import { fillPrompt, PROMPTS } from "../lib/prompts.js";
import { runPrompt } from "../lib/openrouter.js";
import { checkBotId } from "botid/server";

export const maxDuration = 300;

const activeIps = new Set();
const FIELD_LIMITS = {
  name: 160,
  institution: 240,
  email: 254,
  orcid: 19,
  order: 2_000,
};

function clientIp(request) {
  return String(request.headers["x-forwarded-for"] || request.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

export function validateCustomer(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Customer fields are required";
  for (const [field, limit] of Object.entries(FIELD_LIMITS)) {
    if (typeof value[field] !== "string") return `${field} must be text`;
    if (value[field].length > limit) return `${field} is too long`;
  }
  if (!value.name.trim() || !value.institution.trim()) return "Name and institution are required";
  if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) return "Email is invalid";
  if (value.orcid && !/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(value.orcid)) return "ORCID is invalid";
  return null;
}

export function formatCustomer(value) {
  return [
    ["Name", value.name],
    ["Institution", value.institution],
    ["Email", value.email],
    ["ORCID", value.orcid],
    ["Order or intended work", value.order],
  ].filter(([, item]) => item.trim())
    .map(([label, item]) => `${label}: ${item.trim()}`)
    .join("\n");
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Use POST /api/screen" });
  }

  const validationError = validateCustomer(request.body?.customer);
  if (validationError) {
    return response.status(400).json({ error: validationError });
  }

  const bot = await checkBotId();
  if (bot.isBot) return response.status(403).json({ error: "Automated requests are not allowed" });

  const ip = clientIp(request);
  if (activeIps.has(ip)) {
    return response.status(429).json({ error: "One screening at a time. Try again after the current run finishes." });
  }

  const customerInfo = formatCustomer(request.body.customer);
  const startedAt = Date.now();
  const signal = AbortSignal.timeout(230_000);
  activeIps.add(ip);
  try {
    const [screening, backgroundWork] = await Promise.all([
      runPrompt(fillPrompt(PROMPTS.screening, customerInfo), { signal }),
      runPrompt(fillPrompt(PROMPTS.backgroundWork, customerInfo), { signal }),
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
  } finally {
    activeIps.delete(ip);
  }
}
