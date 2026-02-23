# MambaSplit Web

React + Vite frontend extracted from the API static tester UI.

## Run

1. Install dependencies
```powershell
npm install
```

2. Start API (`mambasplit-api`) on `http://localhost:8080`

3. Start web app
```powershell
npm run dev
```

Vite runs on `http://localhost:5173` and proxies `/api/*` to `http://localhost:8080`.

## Features

- Signup/Login/Logout
- Profile dashboard
- Groups list + create group
- Create invite for selected group
- Accept invite by token
