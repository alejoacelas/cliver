# Cliver demo decisions

## Core decisions

### Purpose and evidence

- [Keep human review as the outcome of screening](#decision-1).
- [Do not transfer the paper’s evaluation results to the deployed demo](#decision-2).

### Public endpoint

- [Retain bounded inputs and abuse protections](#decision-3).
- [Distinguish returned evidence from unsupported citation markers](#decision-4).

### Model access

- [Use direct Anthropic Opus 5.5 and preserve its tool conversation](#decision-5).

## Details

<a id="decision-1"></a>

### Keep human review as the outcome of screening

The public demo returns evidence and flags for a human; it does not decide whether to fulfill an order. Preserve that boundary when changing prompts, reports or defaults. See [README.md](README.md).

<a id="decision-2"></a>

### Do not transfer the paper’s evaluation results to the deployed demo

The study evaluated specific prompts and models; the web demo adapts them and was not part of that evaluation. Keep published cost/accuracy figures tied to their experiment rather than imply measured production performance. See [README.md](README.md).

<a id="decision-3"></a>

### Retain bounded inputs and abuse protections

The public handler validates structured known fields and rejects malformed or oversized input. Keep bot checks and concurrent-request controls alongside model/tool limits rather than letting arbitrary text or repeated requests expand paid work silently. See [api/screen.js](api/screen.js).

<a id="decision-4"></a>

### Distinguish returned evidence from unsupported citation markers

The model tool loop records sources and reports citations not returned by tools. Preserve the citation warning path and source links so a polished answer cannot hide missing support. See [test/api.test.js](test/api.test.js). History inspected: [bd47d8e](https://github.com/alejoacelas/cliver/commit/bd47d8e), [b34f2b2](https://github.com/alejoacelas/cliver/commit/b34f2b2).

<a id="decision-5"></a>

### Use direct Anthropic Opus 5.5 and preserve its tool conversation

Use the personal API organization linked to Max 20x monthly credits. Keep the API
credential on the server, in the location recorded in AGENTS.md. Preserve complete
assistant content, including opaque thinking blocks, between rounds and match each
tool result to its tool-use ID. Implementation:
[1cdccdf](https://github.com/alejoacelas/cliver/commit/1cdccdf).

## Decision log

### 2026-10-12

Switch the live demo from Gemini through OpenRouter to direct Opus 5.5 using the
API organization linked to the personal monthly Claude credit. Production and
preview environments use the credential recorded in AGENTS.md.
