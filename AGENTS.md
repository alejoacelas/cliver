Read README.md for this project's purpose, setup and current state.

## Model access

Use direct Anthropic Messages with Opus 5.5 for screening reports. The API key uses
Alejandro's Projects (personal identity `alejoacelas@gmail.com`), linked to monthly
Max 20x API credits. `ANTHROPIC_API_KEY` is stored in personal 1Password account
`my.1password.com`, vault `mac-agents`, item `ANTHROPIC_API_KEY — personal-apps-2026-10`
(`mj6dyf42xml2ughfxqzpxey3zi`), field `credential`. Load with `op-agent` into ignored
`.env.local` or Vercel's encrypted environment. Never expose it in the browser bundle.
