# MambaSplit Friends Feature — Full Implementation

## Context

- **Frontend repo**: mambasplit-web (React + Vite + Vitest)
- **Backend repo**: MambaSplit.Api (C# / .NET / EF Core / PostgreSQL)
- **Branch**: feature/48-redesign-dashboard-layout-d-mobile-views-and-group-hero
- **Current state**: The friends UI is mocked out with hardcoded data in
  `src/views/friendsMockData.js`. There are NO backend friends endpoints.
  The mock data field names do NOT match the finalized API contract below.
  `DashboardView.jsx` contains a dead `FriendDetailContent` component
  (lines ~91-170) that was replaced by the accordion pattern and is never
  rendered.

---

## Step 0 — Audit the current state

Before doing anything, read the following files from the current branch and
produce a brief status table (`Component | Wired / Mocked | Notes`):

- `src/views/friendsMockData.js`
- `src/views/DashboardView.jsx`
- `src/App.jsx` (lines 1-80, friend-related state and callbacks)
- `src/views/GroupView.jsx` (invite form + `onCreateMockFriendInvite`)
- `src/controllers/useDashboardController.js` (`onCreateInvite` around line 441)
- `src/api.js` (`groupsApi.createInvite` around line 185)
- `src/services/groupService.js`

Catalog:
1. Which UI sections render friend data from `friendsMockData.js`
2. Which callbacks are mock-only (`onCreateMockFriendInvite` in `App.jsx`)
3. Which API calls will need a new or updated contract
4. The field name mismatches between `friendsMockData.js` and the API
   contract defined in Step 3

---

## Step 1 — Frontend review (Expert React Frontend Engineer)

Review the React mock-up changes on this branch. review all commits
Evaluate:

1. **Component structure**: Is the accordion-based friend list in
   `DashboardView.jsx` the right pattern, or would a side-panel detail
   view be better for this app?
2. **Dead code**: `FriendDetailContent` (lines ~91-170 in DashboardView.jsx)
   is declared but never rendered. Flag it for removal.
3. **Balance helpers**: `friendBalanceTone()`, `friendBalanceLabel()`, and
   `expenseBalanceTone()` currently derive display text from raw cents on
   the frontend. These must be replaced with API-provided labels. The
   frontend may only use `netBalanceCents` for CSS tone (positive / negative
   / neutral classes), never for deriving text.
4. **Sort logic**: `filteredFriends` in DashboardView.jsx currently sorts
   client-side (connected before pending, then by balanceCents). This sort
   must be removed — the API will return friends in the correct order.
   Client-side search filtering is fine.
5. **Mock wiring**: `onCreateMockFriendInvite` in App.jsx is a local mock
   that manipulates `friendDirectory` state with fake data. This must be
   replaced with a real API refresh after invite creation.
6. **Accessibility**: Verify keyboard nav and ARIA on the accordion.
7. **Motion/animation**: Are the Framer Motion transitions appropriate?

Offer concrete recommendations with code-level specifics.

---

## Step 2 — Backend spec review (C#/.NET Janitor perspective)

Review `docs/temp-friends-backend-spec.md` against the actual backend
codebase in `C:\MambaSplit\MambaSplit.Api`. Evaluate:

1. **Entity design**: Is the proposed `FriendConnections` table the right
   shape given the existing `InviteEntity`, `GroupMemberEntity`, and
   `UserEntity` patterns?
2. **Owner-scoped vs. symmetric**: The spec proposes one row per direction
   (Julio→Mina and Mina→Julio are separate rows). Confirm this is the
   simplest correct approach.
3. **Balance computation**: Verify the cross-group netting logic is feasible
   given existing `ExpenseSplitEntity` and `SettlementEntity` data. All
   balance computation MUST happen in the API — the frontend is display-only.
4. **Invite flow integration**: The spec says to upsert `FriendConnections`
   inside the existing invite-create and invite-accept flows. Verify this
   won't break the current `GroupService` and `InviteController` code paths.
5. **Migration strategy**: We use EF Core with PostgreSQL. The implementation
   needs an EF migration, not raw SQL.
6. **Sorting**: The API must return the friend list pre-sorted: Connected
   friends first (ordered by `LastUsedAtUtc` descending), then Pending
   friends (ordered by `CreatedAtUtc` descending). The frontend must NOT
   re-sort the list.

Recommend changes to the spec if the current design has gaps.

---

## Step 3 — Finalize the API contract

Update or create `docs/friends-backend-spec.md` and
`docs/friends-frontend-spec.md` incorporating the audit and review findings.

### Canonical friend list item contract (GET /api/v1/friends)

```json
{
  "id": "guid",
  "displayName": "string",
  "email": "string",
  "status": "Pending | Connected",
  "friendUserId": "guid | null",
  "netBalanceCents": 0,
  "netBalanceLabel": "string",
  "sharedGroupCount": 0,
  "hasActiveSharedBalances": false,
  "lastUsedAtUtc": "ISO8601"
}
```

Sort order returned by API: Connected first by `lastUsedAtUtc` desc,
then Pending by `createdAtUtc` desc. Frontend does NOT re-sort.

### Canonical friend detail contract (GET /api/v1/friends/{friendConnectionId})

```json
{
  "id": "guid",
  "displayName": "string",
  "email": "string",
  "status": "Pending | Connected",
  "friendUserId": "guid | null",
  "netBalanceCents": 0,
  "netBalanceLabel": "string",
  "summary": "string",
  "sharedGroups": [
    {
      "groupId": "guid",
      "groupName": "string",
      "balanceCents": 0,
      "balanceLabel": "string",
      "hasUnsettledExpenses": false
    }
  ]
}
```

### Updated invite create contract (POST /api/v1/groups/{groupId}/invites)

```json
{
  "email": "string (required)",
  "displayName": "string (optional)"
}
```

Existing clients sending only `{ "email": "..." }` must continue to work.

### Calculation rules (backend-only, frontend MUST NOT replicate)

- `netBalanceCents`: signed integer. Positive = friend owes current user.
  Negative = current user owes friend. Zero = settled.
- `netBalanceLabel`: human-readable string. Examples: "Doug owes you $5.00",
  "You owe Mina $2.30", "All settled".
- Per-group `balanceCents` and `balanceLabel`: same rules scoped to one group.
- `hasActiveSharedBalances`: true if any shared group has non-zero balance.
- The frontend may use `netBalanceCents` sign ONLY for CSS class selection
  (positive / negative / neutral tone). It must NEVER derive display text,
  sum balances, determine owe-direction, or format dollar amounts.

---

## Step 4 — Frontend implementation file

Write a complete implementation specification. Every file that changes must
have the EXACT code to write, with before/after where applicable. Another
agent will transcribe this verbatim — leave zero ambiguity or TODOs.

### Files to create

1. `src/services/friendService.js`
   - `list()` → `GET /api/v1/friends`
   - `detail(friendConnectionId)` → `GET /api/v1/friends/{friendConnectionId}`

2. `src/services/__tests__/friendService.test.js`
   - Mock API responses for list and detail
   - Error handling (network, 401, 404, 500)

### Files to modify

3. `src/api.js`
   - Add `friendsApi` namespace with `list` and `detail` methods
   - Update `groupsApi.createInvite` to accept `(groupId, email, displayName)`
     sending `{ email, displayName }`. When displayName is falsy, send
     `{ email }` for backward compatibility.

4. `src/services/groupService.js`
   - Re-export `friendsApi.list` and `friendsApi.detail` under `friendService`
   - Update `createInvite` passthrough to include displayName

5. `src/services/index.js`
   - Export `friendService`

6. `src/controllers/useDashboardController.js`
   - Add `friendDirectory` state (initially `[]`)
   - Add `friendsLoading` state
   - Add `friendsError` state
   - Add `selectedFriendId` state
   - Add `loadFriends()` that calls `friendService.list()` and sets state
   - Call `loadFriends()` on mount and after invite accept
   - Remove any client-side friend sort logic
   - Export `friendDirectory`, `friendsLoading`, `friendsError`,
     `selectedFriendId`, `onSelectFriend`, `loadFriends` in the return

7. `src/controllers/useDashboardController.js` — `onCreateInvite`
   - Update to accept `{ email, name }` or `{ email, displayName }` and
     pass displayName to `groupService.createInvite`
   - After successful invite create, call `loadFriends()` to refresh

8. `src/App.jsx`
   - Remove `import { initialFriendDirectory }` and all mock friend state
   - Remove `onCreateMockFriendInvite` callback
   - Pass `friendDirectory`, `friendsLoading`, `friendsError`,
     `selectedFriendId`, `onSelectFriend` from dashboardController to
     DashboardView
   - Remove `onCreateMockFriendInvite` prop from GroupView

9. `src/views/DashboardView.jsx`
   - Remove dead `FriendDetailContent` component
   - Remove `friendBalanceLabel()` function — use API-provided labels instead
   - Keep `friendBalanceTone()` for CSS class only (rename to `balanceTone`
     for clarity)
   - Remove client-side sort in `filteredFriends` — only filter by search
   - Add `friendsLoading` and `friendsError` props with appropriate
     loading/error empty states
   - Update all field references: `name` → `displayName`,
     `balanceCents` → `netBalanceCents`, `summary` → `netBalanceLabel`,
     `statusLabel` → derive from `status` ("Invite pending" / "Friend"),
     `sharedGroups` → `sharedGroupCount` (for the count display)
   - In the accordion body: call `friendService.detail(friend.id)` to load
     per-group breakdown, or accept it from a prop/callback
   - Handle graceful degradation: if friends endpoint returns 404 (feature
     not yet deployed), show empty state without error

10. `src/views/GroupView.jsx`
    - Remove `onCreateMockFriendInvite` prop and its usage
    - `handleCreateGroupInvite` should pass `displayName` to `onCreateInvite`

11. `src/views/friendsMockData.js`
    - DELETE this file entirely (mock data replaced by API)

### Test files to create or update

12. `src/controllers/__tests__/useDashboardController.test.jsx`
    - Add tests for `loadFriends()` happy path, error, and empty
    - Add test for friend list refresh after invite accept
    - Add test for friend list refresh after invite create
    - Update existing `onCreateInvite` tests for displayName passthrough

13. `src/views/__tests__/DashboardView.test.jsx`
    - Add tests for friend list rendering with API contract shape
    - Test search filtering (client-side)
    - Test accordion expand/collapse
    - Test empty states: no friends, friends loading, friends error
    - Test pending vs connected display
    - Test that no client-side sort is applied (order matches input)

14. `src/views/__tests__/GroupView.test.jsx`
    - Update invite creation tests to verify displayName is passed
    - Remove any references to `onCreateMockFriendInvite`

---

## Step 5 — Backend implementation file

Write a complete implementation specification for the .NET backend. Every
file that changes must have the EXACT code. Another agent will transcribe
this verbatim.

### Files to create

1. `src/MambaSplit.Api/Domain/FriendConnectionEntity.cs`
   - Table: `friend_connections`
   - Columns: `id` (Guid PK), `owner_user_id` (Guid), `friend_user_id`
     (Guid nullable), `display_name` (string 120), `normalized_email`
     (string 320), `original_email` (string 320), `status` (string 20),
     `created_at_utc` (DateTimeOffset), `connected_at_utc`
     (DateTimeOffset nullable), `last_used_at_utc` (DateTimeOffset nullable)

2. `src/MambaSplit.Api/Services/FriendService.cs`
   - `UpsertOnInviteSentAsync(ownerUserId, email, displayName)`
   - `UpsertOnInviteAcceptedAsync(inviterUserId, acceptingUserId, email, displayName)`
   - `ListForUserAsync(ownerUserId)` — returns pre-sorted list with computed
     balances. Sort: Connected first by `last_used_at_utc` desc, then
     Pending by `created_at_utc` desc.
   - `GetDetailAsync(ownerUserId, friendConnectionId)` — returns detail with
     per-group breakdown
   - Private helper: `ComputeNetBalanceBetweenUsersAsync(userA, userB)` —
     queries all shared groups, sums expense splits and settlements, returns
     per-group and net balances
   - Private helper: `FormatBalanceLabel(cents, friendDisplayName)` — returns
     human-readable label

3. `src/MambaSplit.Api/Controllers/FriendController.cs`
   - `GET /api/v1/friends` → `ListForUserAsync`
   - `GET /api/v1/friends/{friendConnectionId}` → `GetDetailAsync`
   - Both require authentication, scoped to current user

4. EF Migration for `friend_connections` table
   - Unique index on `(owner_user_id, normalized_email)`
   - Index on `owner_user_id` for list queries
   - Foreign key to `users.id` on `owner_user_id`
   - Optional foreign key to `users.id` on `friend_user_id`

### Files to modify

5. `src/MambaSplit.Api/Data/AppDbContext.cs`
   - Add `DbSet<FriendConnectionEntity> FriendConnections`
   - Add model configuration in `OnModelCreating` for indexes and FKs

6. `src/MambaSplit.Api/Services/GroupService.cs`
   - In `CreateInviteAsync` (or equivalent): after creating the invite,
     call `FriendService.UpsertOnInviteSentAsync`
   - Accept optional `displayName` parameter in the invite creation method

7. `src/MambaSplit.Api/Controllers/GroupController.cs`
   - Update the invite creation endpoint request body to accept optional
     `displayName` field. Existing clients sending only `email` must not
     break.

8. `src/MambaSplit.Api/Services/GroupMembershipService.cs` or wherever
   invite acceptance is handled:
   - After accepting an invite, call
     `FriendService.UpsertOnInviteAcceptedAsync` for both directions

9. `src/MambaSplit.Api/Program.cs`
   - Register `FriendService` in DI

### Test files to create

10. `tests/MambaSplit.Api.Tests/Services/FriendServiceTests.cs`
    - Upsert on invite sent: creates new row, reuses existing row
    - Upsert on invite accepted: sets FriendUserId, status Connected,
      creates reverse row
    - Balance computation: single group, multiple groups, cross-group netting
    - Zero balance → "All settled" label
    - Positive → "X owes you $Y" label
    - Negative → "You owe X $Y" label
    - Friend detail with no shared groups → empty breakdown, zero balance
    - Owner-scoping: user A cannot see user B's friend rows
    - Sort order: Connected before Pending, within each group ordered by
      respective timestamp descending

11. `tests/MambaSplit.Api.Tests/Controllers/FriendControllerTests.cs`
    - Auth required (401 without token)
    - List returns only current user's friends
    - Detail returns 404 for wrong owner
    - Detail returns 404 for nonexistent ID

12. `tests/MambaSplit.Api.Tests/Integration/FriendLifecycleTests.cs`
    - End-to-end: create group → send invite → verify Pending friend row →
      accept invite → verify Connected friend rows (both directions) →
      add expense → verify balance computation → delete group → verify
      friend persists with zero balance

---

## Step 6 — Cross-cutting requirements

1. **No frontend balance computation**: The frontend must NEVER sum balances,
   determine owe-direction, format currency for balance display, or derive
   status from balance values. It may only use `netBalanceCents` sign for
   CSS class selection.

2. **Backward compatibility**: The invite create endpoint must continue to
   work with `{ "email": "..." }` only. `displayName` is optional.

3. **Sort order is API-owned**: The `GET /api/v1/friends` endpoint returns
   results in the canonical sort order (Connected by lastUsedAtUtc desc,
   then Pending by createdAtUtc desc). The frontend renders in the order
   received and MUST NOT re-sort. Client-side search filtering is allowed.

4. **Graceful degradation**: If the friends endpoints are not yet deployed,
   the frontend should catch 404 and show an empty friends panel without an
   error message.

5. **Mock data removal**: `src/views/friendsMockData.js` must be deleted.
   All references to `initialFriendDirectory` and `onCreateMockFriendInvite`
   must be removed.

6. **Error and loading states**: The friends panel must show a loading
   skeleton while `GET /api/v1/friends` is in flight, and an error state
   with retry if it fails.

7. **Existing tests must pass**: All current passing tests must continue to
   pass after changes. Run `npm test` for frontend and `dotnet test` for
   backend to verify.