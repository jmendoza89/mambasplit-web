# MambaSplit Web

React + Vite frontend extracted from the API static tester UI.

## Run 🚀

1. Install dependencies
`powershell
npm install
`
2. Start API (mambasplit-api) on http://localhost:8080
3. Start web app
`powershell
npm run dev
`

Vite runs on http://localhost:5173 and proxies /api/* to http://localhost:8080.

Optional environment variable for Google Sign-In:

- `VITE_GOOGLE_CLIENT_ID`: OAuth client ID from Google Cloud Console

## Features ✨

- Signup/Login/Logout
- Google Sign-In (requires backend `POST /api/v1/auth/google`)
- Profile dashboard
- Groups list + create group
- Create invite for selected group
- Accept invite by token
- Group details + expense tracking

## Project Structure 🧱

The app now follows a lightweight MVC-style frontend structure:

- src/controllers/: orchestration and stateful UI logic (useAppController)
- src/models/: domain shaping and normalization (groupModel)
- src/services/: API-facing service layer (ppService)
- src/views/: presentational UI components (Auth, Dashboard, Group, Modal)
- src/utils/: formatting and validation helpers

src/App.jsx is now the composition shell that wires controller state/actions to view components.
