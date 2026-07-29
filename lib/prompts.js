import { readFile } from "node:fs/promises";

const promptUrl = (name) => new URL(`../prompts/${name}.txt`, import.meta.url);

const [screening, backgroundWork] = await Promise.all([
  readFile(promptUrl("screening"), "utf8"),
  readFile(promptUrl("background-work"), "utf8"),
]);

export const PROMPTS = Object.freeze({ screening, backgroundWork });

export function fillPrompt(template, customerInfo) {
  return template.replace("{{customer_info}}", customerInfo);
}
