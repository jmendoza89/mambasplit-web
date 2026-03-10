# MambaSplit
*Web App Documentation*

**Last updated:** March 7, 2026  
**Owner:** MambaSplit Web Team  
**Stack:** React + Vite

---

## Overview
MambaSplit is a shared-expense web app focused on simple group flows: create groups, invite members, add expenses, and track splits.

## Quick Facts
| Area | Details |
|---|---|
| Frontend | React 18 + Vite |
| Animations | Motion |
| Auth | Email/password + Google Sign-In |
| API | `mambasplit-api` (`http://localhost:8080`) |
| Dev URL | `http://localhost:5173` |

---

## Screenshot Gallery
**Desktop**
![Desktop login](https://raw.githubusercontent.com/jmendoza89/mambasplit-web/develop/docs/notion-assets/01-auth-desktop.png)

**Mobile**
![Mobile login](https://raw.githubusercontent.com/jmendoza89/mambasplit-web/develop/docs/notion-assets/02-auth-mobile.png)

---

## Core Features
- Signup, login, logout
- Google Sign-In (`VITE_GOOGLE_CLIENT_ID`)
- Dashboard summary
- Group create/select/delete
- Invite create/delete/accept
- Group details with members
- Expense create/delete
- Split display per participant

---

## Primary User Flow
1. Authenticate (email/password or Google).
2. Create or select a group.
3. Invite members.
4. Accept invites.
5. Add expenses.
6. Review totals and split details.

---

## Frontend Architecture
- `src/controllers` - state orchestration and actions
- `src/models` - payload normalization and domain shaping
- `src/services` - API-facing service layer
- `src/views` - presentational components
- `src/utils` - formatting, validation, API error helpers
- `src/App.jsx` - composition shell wiring views + controllers

---

## API Surface Used
**Auth**
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/google`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

**User**
- `GET /api/v1/me`

**Groups**
- `GET /api/v1/groups`
- `POST /api/v1/groups`
- `DELETE /api/v1/groups/{groupId}`
- `GET /api/v1/groups/{groupId}/details` (fallback: `/api/v1/groups/{groupId}`)

**Expenses**
- `POST /api/v1/groups/{groupId}/expenses/equal`
- `DELETE /api/v1/groups/{groupId}/expenses/{expenseId}`

**Invites**
- `POST /api/v1/groups/{groupId}/invites`
- `DELETE /api/v1/groups/{groupId}/invites/{token}`
- `POST /api/v1/invites/accept`
- `GET /api/v1/invites?email={email}`
- `POST /api/v1/invites/{inviteId}/accept`

---

## Local Setup
```bash
npm install
npm run dev
```

Optional env var:
- `VITE_GOOGLE_CLIENT_ID`

---

## Backlog / Tech Debt
See `REFACTORING_ROADMAP.md` for:
- refresh token race hardening
- controller state race cleanup
- granular loading/error states
- effect cleanup
- test coverage improvements
