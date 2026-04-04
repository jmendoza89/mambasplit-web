# Friends Backend Spec

Temporary working draft for the API-backed friends model.

## Goal

Persist friend relationships independently from groups while keeping all balance computation in the API.

The API is the single source of truth for:
- friend status
- shared-group relationships
- per-group balances
- net balance across groups
- human-readable balance labels

The frontend is display-only and must not recompute these values.

## Integration Constraint

This design must integrate cleanly with the current API code and preserve the main group routes as they are.

Existing routes remain the primary surface for current group functionality:
- `GET /api/v1/me`
- `GET /api/v1/groups`
- `GET /api/v1/groups/{groupId}/details`
- `POST /api/v1/groups/{groupId}/invites`
- `GET /api/v1/groups/{groupId}/invites`
- `POST /api/v1/invites/{inviteId}/accept`
- `POST /api/v1/invites/{inviteId}/decline`

Friends should be added as an additive route surface:
- `GET /api/v1/friends`
- `GET /api/v1/friends/{friendConnectionId}`

The goal is to preserve existing group workflows instead of redesigning them.

## Product Model

Friends are not created through a separate friend-request workflow.

A friend relationship is derived from:
- inviting someone to a group
- sharing a group with someone

This keeps the product model simple:
- one invite system
- one acceptance path
- one persistent contact relationship

## Persistence Rule

Friend relationships must persist independently from groups.

Deleting a group removes:
- group memberships tied to that group
- group invites tied to that group
- expenses and settlements tied to that group

Deleting a group does not remove:
- the persisted friend relationship

This allows future group creation with someone the user already knows.

## Data Model

### Table: `FriendConnections`

Suggested columns:
- `Id`
- `OwnerUserId`
- `FriendUserId` nullable
- `DisplayName`
- `NormalizedEmail`
- `OriginalEmail`
- `Status`
- `CreatedAtUtc`
- `ConnectedAtUtc` nullable
- `LastUsedAtUtc` nullable

### Status values

- `Pending`
- `Connected`

### Suggested uniqueness

Primary uniqueness for MVP:
- `OwnerUserId + NormalizedEmail`

This avoids duplicate friend rows before the invited person is tied to a real user account.

## Relationship Semantics

`FriendConnections` is an owner-scoped relationship record.

That means:
- one row belongs to one user's friend list
- the reverse direction should be stored separately when needed

Example:
- Julio can have a friend row for Mina
- Mina can have a separate friend row for Julio

This makes dashboard retrieval simple and avoids coupling the model too tightly to symmetric friendship rules.

## Lifecycle Rules

### When sending a group invite

1. Create or refresh the `GroupInvite`
2. Keep using the existing `POST /api/v1/groups/{groupId}/invites` route
3. Extend that request contract in a backward-compatible way to support an optional display name
4. Upsert a `FriendConnections` row for the inviter using:
   - `OwnerUserId`
   - `DisplayName`
   - `NormalizedEmail`
   - `OriginalEmail`
   - `Status = Pending`
   - `LastUsedAtUtc`

Suggested request contract update:
- `email` required
- `displayName` optional

Current clients that send only email must continue to work.

### When loading the dashboard

1. Keep `GET /api/v1/me` as the source for:
   - identity
   - received invites
   - sent invites
2. Load `GET /api/v1/friends` separately for the friend list
3. Do not move current dashboard invite behavior into the friends endpoint

### When loading the group details page

1. Keep `GET /api/v1/groups/{groupId}/details` unchanged as the main source for group details
2. Keep `GET /api/v1/groups/{groupId}/invites` as the source for outgoing invites for that group
3. Group details should not need to compute or infer friend balances

### When a group invite is accepted

1. Resolve the accepting user account
2. Keep using the existing invite accept flow under `api/v1/invites`
3. Update the inviter's matching `FriendConnections` row:
   - set `FriendUserId`
   - set `Status = Connected`
   - set `ConnectedAtUtc` if empty
   - update `LastUsedAtUtc`
4. Upsert the reverse `FriendConnections` row for the accepting user
5. Do not create duplicate rows if the relationship already exists

### When inviting the same person again

1. Reuse the existing `FriendConnections` row
2. Update `DisplayName` if you want the latest entered value to win
3. Update `LastUsedAtUtc`
4. Keep status as `Connected` if already connected

### When a group is deleted

1. Remove group-scoped data as normal
2. Recompute any friend balance views from remaining active shared groups
3. Keep the `FriendConnections` row

## Balance Computation Rule

All balance computations happen in the API.

The API must compute:
- shared active groups between current user and friend
- per-group net balance between the two users
- cross-group net balance between the two users
- human-readable labels for each amount

The API must not require the frontend to:
- sum group balances
- infer who owes whom
- decide whether the relationship is settled
- rebuild labels from raw cents

## Cross-Group Netting Rule

Friend balances are netted across all active shared groups.

Example:
- `Summer Euro Trip`: friend owes user `1050` cents
- `Lake House Weekend`: user owes friend `1280` cents
- returned net balance: `-230` cents
- returned net label: `You owe Mina $2.30`

At the same time, the API must still return the per-group breakdown so the client can explain the net result.

## API Endpoints

### `GET /api/v1/friends`

Returns the current user's persisted friend list with precomputed summaries.

Each item should include:
- `id`
- `displayName`
- `email`
- `status`
- `friendUserId` nullable
- `netBalanceCents`
- `netBalanceLabel`
- `sharedGroupCount`
- `hasActiveSharedBalances`
- `lastUsedAtUtc`

### `GET /api/v1/friends/{friendConnectionId}`

Returns one friend relationship with a precomputed breakdown.

Response should include:
- `id`
- `displayName`
- `email`
- `status`
- `friendUserId` nullable
- `netBalanceCents`
- `netBalanceLabel`
- `summary`
- `sharedGroups`

Each shared-group item should include:
- `groupId`
- `groupName`
- `balanceCents`
- `balanceLabel`
- `hasUnsettledExpenses`

### Existing group invite endpoints

Existing invite endpoints remain responsible for:
- create invite
- accept invite
- decline invite
- delete outgoing invite
- refresh outgoing invite

Those endpoints should also trigger the appropriate `FriendConnections` upsert/update behavior.

### Compatibility guidance

To integrate cleanly with the current API code:
- keep `GroupController` as the owner of group-scoped invite creation and listing
- keep `InviteController` as the owner of accept and decline actions
- keep `MeController` as the owner of dashboard invite summaries
- add a dedicated friends controller or equivalent additive endpoint set for friend list and friend detail reads

This keeps the current application flow intact while adding a reusable friend domain behind the scenes.

## Status Rules

### `Pending`

Use `Pending` when:
- the user has invited the person to at least one group
- there is not yet an accepted shared group relationship

### `Connected`

Use `Connected` when:
- the person has accepted at least one group invite and shares a group with the user
- or the relationship was previously connected and should remain persisted for future reuse

If a connected friend currently has zero active shared groups, the relationship can remain `Connected` while returning zero balances.

## Query Rules

Friend list queries should be owner-scoped:
- return only relationships for the authenticated user
- include persisted pending and connected rows
- include computed balance summaries from currently active shared groups only

Friend detail queries should:
- validate the row belongs to the authenticated user
- compute current balances from active shared groups only
- return zero balance and empty shared-group breakdown when no active groups remain

## Recommended Response Behavior

Return both:
- raw cents for logic-light UI display and styling
- human-readable labels for exact wording consistency across clients

This keeps all business wording centralized in the API and avoids duplicate formatting logic in multiple frontends.

## Out Of Scope For MVP

- standalone friend requests
- unfriend or block flows
- global user directory search
- storing friend balances in `FriendConnections`
- letting clients compute their own relationship balances
