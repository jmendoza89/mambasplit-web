---
name: "React UI Plan"
description: "Workspace-scoped prompt to request focused UI changes to React components using the Expert React Frontend Engineer agent. Uses GPT-5 mini."
agent: "Expert React Frontend Engineer"
model: "GPT-4.1"
related_skill: "agent-customization"
---

Purpose
- Ask the `Expert React Frontend Engineer` agent to make small, review-ready UI changes in this repository's React code.

When to use
- Small, focused visual or copy changes (spacing, text, layout tweaks, component props, modal behaviors).
- One UI area per prompt (component or view).
- Prefer incremental edits and include verification steps.

Required fields
- Task title: one-line summary
- Goal / Acceptance criteria: precise, observable outcomes
- Files / components to modify: list (optional but recommended)
- Visual guidance: spacing, copy, classes, mockup link (optional)
- Constraints: e.g., "Don't change backend APIs", "Keep tests passing"
- Tests / verification: manual steps or automated tests to run

Prompt template
```
Agent: Expert React Frontend Engineer
Model: GPT-5 mini
Repo root: .
Task title: <short summary>
Goal / Acceptance criteria:
- <bullet acceptance criteria>
Files / components to modify:
- <src/... or component names>
Visual guidance (optional):
- <design notes, spacing, copy, mockup link>
Constraints:
- <e.g., do not change backend APIs; keep existing tests>
Tests / verification:
- <how to verify changes>

Please produce:
1) Short plan of changes.
2) Unified diffs/patches that can be applied to the repo.
3) Any new/updated tests and a short verification checklist.

Respond first with the planned changes, then the patches. Ask one targeted clarification question if needed before making edits.
```

Example invocation
```
Task title: Clarify dashboard invite CTA and increase hero spacing
Goal / Acceptance criteria:
- Add 16px vertical spacing between hero and group cards
- Change invite CTA text to "Invite someone" and open `InviteModal` on click
Files / components to modify:
- src/views/DashboardView.jsx
- src/views/components/DashboardHero.jsx
Visual guidance:
- Add class `mb-4` to the hero container; update CTA text
Constraints:
- Do not change backend APIs or routing
Tests / verification:
- Manual: Open dashboard, verify spacing and CTA text; click CTA opens invite modal

```

Notes
- This is a workspace-scoped prompt saved at `.github/prompts/` so team members can reuse it.

Extract from conversation
- When possible, paste the relevant chat excerpt or summarize the recurring task pattern. The agent will extract:
	- Core task being repeated (e.g., "adjust spacing and copy in DashboardHero").
	- Implicit inputs (selected file, component name, mockup link).
	- Desired output format (diffs, tests, checklist).

Clarify if needed
- The agent may ask a single focused question before editing. Examples:
	- "Which screen (path) should I open to verify this change?"
	- "Should I update CSS classes or inline styles?"
	- "Do you want a new unit test or just manual verification steps?"

Iterate (recommended flow)
1. Draft the prompt and run the agent.
2. Review the planned changes and request refinements.
3. Approve the patch or ask for another iteration (small scope each time).


Verification checklist (examples)
- Visual: open `/` and navigate to the modified view, check spacing/text/interaction.
- Accessibility: ensure interactive elements are keyboard accessible and have aria-labels where needed.
- Tests: run `pnpm test` or `npm test` and include failing test details if any.

Related files
- Save location: `.github/prompts/react-ui-plan.prompt.md` (workspace-scoped).
- Related agent: `.github/agents/expert-react-frontend-engineer.agent.md`.
