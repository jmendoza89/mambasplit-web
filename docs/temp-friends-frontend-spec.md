# Friends Frontend Spec

Temporary working draft for the dashboard-first friends experience.

## Goal

Keep friend management simple and derived from group invites and shared groups.

The frontend is display-only for balances:
- all friend balance computation happens in the API
- the frontend never recomputes totals, direction, or netting
- the frontend only renders amounts and labels returned by the backend

## Integration Constraint

This feature must integrate cleanly with the existing API shape.

The current group and invite routes remain the main path for group functionality:
- `GET /api/v1/me`
- `GET /api/v1/groups`
- `GET /api/v1/groups/{groupId}/details`
- `POST /api/v1/groups/{groupId}/invites`
- `GET /api/v1/groups/{groupId}/invites`
- `POST /api/v1/invites/{inviteId}/accept`
- `POST /api/v1/invites/{inviteId}/decline`

Friends should be an additive feature surface, not a replacement for the current group flow.

## Core UX

### Dashboard

The dashboard has two separate relationship sections:
- `Group invites`
  - shows incoming invites sent to the current user
  - supports `Accept` and `Decline`
- `Friends`
  - shows people the user has invited to a group or already shares a group with
  - supports viewing status and balances only

There is no separate `Add Friend` flow on the dashboard.

### Group Details

The group details page owns outgoing invite management:
- `Add Someone`
  - inputs: `Name`, `Email Address`
  - action: `Add person`
- `Pending for this group`
  - shows outgoing invites for that specific group
  - supports `Remove/Delete`
  - supports `Refresh`

The frontend should continue to create outgoing invites through the existing group invite route.
For MVP, that route can be extended to accept an optional display name while preserving the route itself.

## Friend States

Each friend has only two user-facing states:
- `Pending`
  - the user invited this person to at least one group
  - the person has not yet accepted any group invite that creates a shared group relationship
- `Connected`
  - the person has accepted at least one group invite and shares at least one group with the user
  - once connected, the relationship persists even if all shared groups are later deleted

The frontend displays the returned status and does not infer state on its own.

## Friend List Rules

A person appears in the friend list when either:
- the user has invited them to a group
- the user already shares a group with them

The frontend should expect the API to return a persistent friend list independent of current group existence.

## Dashboard Friend Row Contract

Each friend row should render using API-provided values such as:
- `id`
- `displayName`
- `email`
- `status`
- `netBalanceCents`
- `netBalanceLabel`
- `sharedGroupCount`
- `hasActiveSharedBalances`

Example row display patterns:
- `Pending`
- `Doug owes you $5.00`
- `You owe Mina $2.30`
- `All settled`

The frontend may style positive, negative, and neutral states from raw cents, but it must not derive amounts.

## Friend Detail Panel

Clicking a friend opens a detail panel that shows:
- display name
- email
- status badge
- overall net balance label
- per-group balance rows
- empty state if no active shared balances exist

The detail panel must render:
- one net summary returned by the API
- one row per shared group returned by the API

The frontend must not roll up or net group balances itself.

## Cross-Group Netting Display

The API returns both:
- a net friend balance across all active shared groups
- a per-group breakdown

Example:
- `Summer Euro Trip` -> `Mina owes you $10.50`
- `Lake House Weekend` -> `You owe Mina $12.80`
- summary -> `You owe Mina $2.30`

Frontend display rule:
- main panel shows the per-group breakdown
- summary card or side rail shows the net relationship

This keeps the net total visible while still explaining where it came from.

## Required API Shapes

### Existing routes that remain primary

These routes stay responsible for the current group experience:
- `GET /api/v1/me`
  - dashboard identity
  - incoming invites
  - sent invites
- `GET /api/v1/groups`
  - dashboard group list
- `GET /api/v1/groups/{groupId}/details`
  - group details page
- `POST /api/v1/groups/{groupId}/invites`
  - create outgoing invite for a group
- `GET /api/v1/groups/{groupId}/invites`
  - list outgoing invites for a group
- `POST /api/v1/invites/{inviteId}/accept`
- `POST /api/v1/invites/{inviteId}/decline`

Friends should supplement these routes, not replace them.

### Friend list

`GET /api/v1/friends`

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

### Group invite create request

Keep the existing route:

`POST /api/v1/groups/{groupId}/invites`

Preferred request shape for MVP:
- `email` required
- `displayName` optional

This keeps the current route stable while allowing the friend list to display the inviter-provided name for pending relationships.

### Friend detail

`GET /api/v1/friends/{friendConnectionId}`

The detail payload should include:
- `id`
- `displayName`
- `email`
- `status`
- `friendUserId` nullable
- `netBalanceCents`
- `netBalanceLabel`
- `summary`
- `sharedGroups`

Each `sharedGroups` item should include:
- `groupId`
- `groupName`
- `balanceCents`
- `balanceLabel`
- `hasUnsettledExpenses`

## Frontend State Rules

1. The dashboard loads the friend list from the API.
2. Clicking a friend loads or hydrates the friend detail from the API.
3. Sending a group invite should continue using the existing group invite route, then refresh or optimistically update the friend list entry as `Pending`.
4. Accepting or declining an incoming group invite should refresh dashboard relationship data.
5. Deleting a group should remove that group from the friend detail breakdown after refresh, but should not remove the friend row if the backend still persists the relationship.

## Empty States

If a friend exists but has no active shared balances:
- show `You are all settled up`
- show a detail message like `No active shared expenses right now.`
- keep the friend in the list for future reuse

If a friend is still pending and has no accepted shared groups:
- show `Invite pending`
- show a detail message like `They will appear as connected once they accept a group invite.`

## Search

If search is present in MVP, it searches only the current user's friend list:
- `displayName`
- `email`

There is no global user search in MVP.

## Out Of Scope For MVP

- standalone friend requests
- social discovery or global people search
- unfriend or block management
- frontend-side balance recomputation
- frontend-side derivation of balance direction or summary wording
