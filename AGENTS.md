# MambaSplit Web Agent Guidance

## Scope
- This file applies to `mambasplit-web` only.
- Also inherit shared guidance from `../Agents.md` when present.
- Repo-specific instructions override broader/global instructions when they conflict.

## Workflow Keywords
- Inherit workflow commands from parent `C:\MambaSplit\AGENTS.md`.

## Web Defaults
- Prefer existing package manager lockfile (`npm`, `pnpm`, or `yarn`) already used by the repo.
- Use project scripts for local run/build/test (for example `npm run dev`, `npm run build`, `npm run test`).
- Preserve established UI patterns and design tokens in this repo.

## Safety Rules
- Never run destructive git commands unless explicitly requested.
- If merge/rebase conflicts happen, stop and ask how to proceed.