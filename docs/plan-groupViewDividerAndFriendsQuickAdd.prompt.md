# Plan: GroupView Friends Quick-Add

## TL;DR
Friends quick-add list in "Add Someone" - pre-fills form, disabled if already member/invited.

---

## Item 1 - Friends Quick-Add (Pre-fill UX)

### API Changes - NONE needed
- `GET /api/v1/friends` -> `friendService.list()` already exists
- `POST /api/v1/groups/{groupId}/invites` continues to power form submit (unchanged)

### Phase 1 - State & data in GroupView.jsx
- Add `import { friendService } from "../services"` to GroupView.jsx
- Add local state: `const [friendsList, setFriendsList] = useState([])`
- Add `useEffect` on mount (no deps beyond selectedGroupId) to call `friendService.list()` and set state
- No loading indicator required for this secondary list

### Phase 2 - Disabled logic (computed inline)
Derive two Sets from existing data in GroupView:
- `memberEmailSet`: from `displayMembers.filter(m => m.email).map(m => m.email.toLowerCase())`
- `pendingEmailSet`: from `groupSentInvites.map(inv => inv.sentToEmail.toLowerCase())`
For each friend: `isDisabled = memberEmailSet.has(friend.email.toLowerCase()) || pendingEmailSet.has(friend.email.toLowerCase())`
Disabled reason label:
- Member email match -> "Already a member"
- Pending invite match -> "Invite pending"

### Phase 3 - UI in GroupView.jsx (inline JSX, no new component file)
Insert a "From your friends" sub-section **above** the form inside `.group-members-manage`, rendered only when `friendsList.length > 0` - shows:
- Small heading (`<p>` or `<h5>`): "From your friends"
- `ul.group-friends-quick-list` - one `button` per friend:
  - `div.avatar` (initials) + `span` display name
  - Optional: small status badge if `friend.status === "Pending"` (friend hasn't accepted any invite yet)
  - `disabled` attribute + `title` for disabled state
  - `aria-pressed` based on `selectedFriendId === friend.id`
- On click (enabled friends): `setInviteFriendName(friend.displayName); setInviteFriendEmail(friend.email); setSelectedFriendId(friend.id)`
Add `selectedFriendId` local state; clear it in `clearInviteDraft()`.

### Phase 4 - CSS in styles.css
New classes:
- `.group-friends-quick-section`: small heading + list container, `margin-bottom: 8px`
- `.group-friends-quick-list`: `display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none`
- `.group-friends-quick-item`: `button` style - pill shape, avatar + name inline, uses existing `.avatar` sizing
  - Default: border + subtle bg
  - Hover / focus: elevated style consistent with app
  - `[aria-pressed="true"]`: selected highlight (app's teal/primary accent)
  - `.is-disabled` / `[disabled]`: `opacity: 0.45; cursor: not-allowed`

---

## Relevant Files
- `src/styles.css` - add `.group-friends-quick-*` classes
- `src/views/GroupView.jsx` - add friendService import, `friendsList` state, `selectedFriendId` state, `useEffect` loader, friends quick-add JSX, update `clearInviteDraft`

## Verification
1. Load a group that has friends - confirm quick-add list appears above form.
2. Click an enabled friend -> Name + Email fields pre-fill, friend chip highlights.
3. Click "Add person" -> invite sent; form clears; selected chip de-highlights.
4. Click "Clear" -> form clears + chip de-highlights.
5. Friends already in the group or with a pending invite -> show greyed, disabled, `title` tooltip shows reason.
6. No friends in app -> "From your friends" section is hidden (no empty state needed).
7. Run `npm test` - confirm no regressions in GroupView tests.

## Decisions
- Friends invite UX: pre-fill (not one-tap, not accordion)
- Already-added or pending friends: shown but disabled/greyed
- No new component file; logic stays in GroupView.jsx
- No new API endpoints needed

