# Working in this repo

- npm workspaces. `packages/core` is the engine, `packages/api` serves it over HTTP, `packages/web` is the playground, `packages/action` is the GitHub Action (`action.yml` at the root).
- `examples/handbook/checks.yml` is generated from `SAMPLES` in core. Change the samples, then regenerate it.
- Before a PR: `npm run lint && npm run typecheck && npm test`. While working, run only the test file you touched: `npx vitest run test/<file>`.
- Write the test first. Every new pattern (English or German) gets a passing and a failing example.
- Core stays offline and deterministic. No network, no model calls, no keys. Claim mode takes a `complete` function from the caller.
- The voice check must match the Python reference in `packages/core/reference` to 1e-9. Change both or neither.
- Never commit keys, real customer documents or personal data. Test documents are synthetic.
- Branches: `claude/<short-name>` or `feat/<short-name>`, based on main. Nothing merges without Jakob's yes.
