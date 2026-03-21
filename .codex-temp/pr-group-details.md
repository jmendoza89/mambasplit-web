## Summary
This PR improves the Group Details experience to make the page easier to scan, easier to act on, and more informative at a glance.

Closes #17

## User-Facing Enhancements
- Introduces a new Group Details hero with clearer hierarchy for group name, role, balance, member count, expense count, total spent, and settlement volume.
- Redesigns member rows into focused member cards with balance status and a visual owner treatment.
- Redesigns expense rows into compact expense cards with date chips, payer/owe summaries, and a lighter delete affordance.
- Reuses the same expense card presentation for settled expense groups so the page feels more consistent.
- Improves settle-up modal defaults by selecting the best receiver and a more accurate starting amount based on unsettled balances.
- Adds a quick avatar action in the group header to return to the dashboard.

## Why This Matters
- Reduces cognitive load on the group page by turning dense text blocks into scannable cards.
- Makes the user's financial position in the group immediately visible.
- Creates a stronger, more polished feature surface for release notes and future customer-facing announcements.

## Technical Implementation
- Refactors the main group page in `src/views/GroupView.jsx`.
- Adds reusable UI components:
  - `src/views/components/GroupDetailsHero.jsx`
  - `src/views/components/MemberCardItem.jsx`
  - `src/views/components/ExpenseCardItem.jsx`
- Updates `src/views/SettleUpModal.jsx` to improve receiver and amount preselection.
- Extends `src/styles.css` with the new group page layout, member card, and expense card styling.
- Keeps the balance diagnostics logic in code for possible future use, while hiding the section from the current UI.
- Adds focused component coverage in `src/views/components/__tests__/ExpenseCardItem.test.jsx`.

## Validation
- Ran `npm test -- src/views/components/__tests__/ExpenseCardItem.test.jsx`

## Affected Files
- `src/views/GroupView.jsx`
- `src/views/SettleUpModal.jsx`
- `src/views/components/ExpenseCardItem.jsx`
- `src/views/components/GroupDetailsHero.jsx`
- `src/views/components/MemberCardItem.jsx`
- `src/views/components/__tests__/ExpenseCardItem.test.jsx`
- `src/styles.css`

## Notes
- This branch still has additional local, uncommitted work for password reset mock/test flow and dashboard enhancements; those are not included in this PR.
- The committed diff also contains synced `.github/agents/*.md` files created by the repository workflow hook during commit. The intended product scope of this PR is the Group Details page enhancement work described above.

## Release / Newsletter Notes
- Group Details now highlights your current balance, role, and key group stats in a cleaner summary header.
- Members are easier to understand at a glance with clearer balance states and owner highlighting.
- Expenses are easier to scan with a more visual card layout and simplified actions.
- Settle up flows are smarter, with better defaults based on current balances.
