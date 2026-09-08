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
- When finished, move it to `~/best/archive/` and record its previous location and why in the archive's `REPLICATE.md`.
<!-- agent-context:end -->

Read README.md for this project's purpose, setup and current state.
