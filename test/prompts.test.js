import test from "node:test";
import assert from "node:assert/strict";
import { fillPrompt, PROMPTS } from "../lib/prompts.js";

test("ships the study's four screening criteria", () => {
  assert.match(PROMPTS.screening, /Customer Institutional Affiliation/);
  assert.match(PROMPTS.screening, /Institution Type and Biomedical Focus/);
  assert.match(PROMPTS.screening, /Email Domain Verification/);
  assert.match(PROMPTS.screening, /Sanctions and Export Control Screening/);
});

test("fills customer information without changing the prompt", () => {
  const output = fillPrompt(PROMPTS.screening, "Name: Example Researcher");
  assert.match(output, /Name: Example Researcher/);
  assert.doesNotMatch(output, /\{\{customer_info\}\}/);
});

test("asks for primary background work and caps the result", () => {
  assert.match(PROMPTS.backgroundWork, /individual work products/);
  assert.match(PROMPTS.backgroundWork, /at most 5 works total/);
});
