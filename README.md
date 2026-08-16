# Cliver

LLMs can be faster and more comprehensive than humans at searching and processing information. Cliver lets you try AI-assisted customer screening for synthetic DNA orders.

**[Try Cliver](https://cliver.bio/try)** · **[Final paper](https://doi.org/10.3389/fbioe.2026.1819556)**

In [our evaluation](https://doi.org/10.3389/fbioe.2026.1819556), the best model matched the human baseline on four flag criteria (90.2% vs. 89.0%) at about one-tenth the cost ($1.18 vs. $14.04 per customer). AI-only information gathering across five tasks averaged $0.23 per customer, about 50 times cheaper than manual screening.

Cliver adapts the study's [screening](prompts/screening.txt) and [background-work](prompts/background-work.txt) prompts for a public demo with web, ORCID, Europe PMC, and U.S. Consolidated Screening List search. The deployed demo was not part of the evaluation. It returns evidence for a human to review; it does not decide whether to fulfill an order.

## Run it

```sh
cp .env.example .env.local
# Add API keys to .env.local
npm run dev
```

The app needs OpenRouter and Tavily keys. A free [Consolidated Screening List API key](https://developer.trade.gov/) enables sanctions checks.

```sh
npm test
npm run check
```

The implementation is a static page and one Vercel function:

- [`public/`](public/) — form and report viewer
- [`api/screen.js`](api/screen.js) — request validation and parallel prompt runs
- [`lib/openrouter.js`](lib/openrouter.js) — model tool loop
- [`lib/tools.js`](lib/tools.js) — public-data searches
- [`prompts/`](prompts/) — prompts tested in the paper

Released into the public domain under [The Unlicense](LICENSE).
