# Cliver demo decisions

## Core decisions

### Purpose and evidence

- [Keep human review as the outcome of screening](#decision-1).
- [Do not transfer the paper’s evaluation results to the deployed demo](#decision-2).

### Public endpoint

- [Retain bounded inputs and abuse protections](#decision-3).
- [Distinguish returned evidence from unsupported citation markers](#decision-4).

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
