# Cliver decisions

## Core decisions

- Use direct Anthropic Opus 5.5 for screening reports so personal Max 20x API
  credits cover eligible usage. Keep evidence and citations for human review.
- Preserve Claude's complete assistant content between tool rounds, including
  opaque thinking blocks, and match each tool result to its tool-use ID.
- Keep the API credential on the server; public assets must never contain it.

## Details

The model change preserves the evaluated prompts, tool-call limits, bot protection
and customer input validation. The public demo remains separate from the paper's
model evaluation. Code: [1cdccdf](https://github.com/alejoacelas/cliver/commit/1cdccdf).

## Decision log

### 2026-10-12

Switch the live demo from Gemini through OpenRouter to direct Opus 5.5 using the
API organization linked to the personal monthly Claude credit. The production and
preview environments use the credential recorded in AGENTS.md.
