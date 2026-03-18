## Agent Cheat Sheet

Use natural language by default. Name the agent explicitly only when you want to force a specific workflow.

### Default Rule
- If the request is general and unambiguous, Codex can usually pick the right approach without you naming an agent.
- If you want a specific runbook, say `Use <agent-name> ...` in your prompt.

### Best-Fit Agents For This Repo
- `feature-workflow-manager`
  - Use for branch and PR workflow tasks.
  - Example prompts:
    - `Use feature-workflow-manager to start issue 123`
    - `Use feature-workflow-manager to commit and sync my changes`
    - `Use feature-workflow-manager to finalize this branch`
- `risk-first-pr-reviewer`
  - Use for findings-first code review, regression checks, and merge risk analysis.
  - Example prompts:
    - `Use risk-first-pr-reviewer to review these changes`
    - `Use risk-first-pr-reviewer to look for regressions`
- `ui-visual-implementer`
  - Use for styling polish, layout refinement, responsive visual improvements, and motion.
  - Example prompts:
    - `Use ui-visual-implementer to polish the dashboard`
    - `Use ui-visual-implementer to improve the mobile layout`
- `expert-react-frontend-engineer`
  - Use for React implementation, refactors, hooks, component architecture, performance, and frontend tests.
  - Example prompts:
    - `Use expert-react-frontend-engineer to refactor this React component`
    - `Use expert-react-frontend-engineer to add tests for this page`
- `4.1 Beast Mode v3.1`
  - Use for broad end-to-end coding tasks when no narrower agent is a better fit.
  - Example prompts:
    - `Use 4.1 Beast Mode v3.1 to handle this task end to end`

### Usually Not Relevant Here
- `csharp-dotnet-janitor`
  - Prefer this in `MambaSplit.Api` for .NET cleanup and modernization work.
- `email-template-designer`
  - Prefer this in `MambaSplit.Api` for transactional email template work.
