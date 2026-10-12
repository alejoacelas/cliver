---
agent_context:
  version: 1
  groups:
  - once
  visibility: public
---
<!-- agent-context:begin sha256=cc3aa932e2bd95352d2ae412c60a17264af80a3adcfd45268b71f3ebdaac0808 -->
<!-- shared group: once -->
# One-off projects

- Name each folder `YYYY-MM-project-name`; separate words with dashes.
- Give every one-off its own Git repository and GitHub remote when creating it.
- Make it public unless it contains employer information, others' private information, or credentials.
- Give its `AGENTS.md` one to three sentences stating its scope or goal and declare the `once` group.
- Make `CLAUDE.md` contain `@AGENTS.md`.
- Follow the current workspace archive rules. Keep consequential archive placement and retention constraints in the archive's `DECISIONS.md`; Git preserves move history.
<!-- agent-context:end -->

Read README.md for this project's purpose, setup and current state.

## Model access

Use direct Anthropic Messages with Opus 5.5 for screening reports. The API key uses
Alejandro's Projects (personal identity `alejoacelas@gmail.com`), linked to monthly
Max 20x API credits. `ANTHROPIC_API_KEY` is stored in personal 1Password account
`my.1password.com`, vault `mac-agents`, item `ANTHROPIC_API_KEY — personal-apps-2026-10`
(`mj6dyf42xml2ughfxqzpxey3zi`), field `credential`. Load with `op-agent` into ignored
`.env.local` or Vercel's encrypted environment. Never expose it in the browser bundle.
