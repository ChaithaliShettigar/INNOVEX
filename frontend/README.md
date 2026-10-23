# ResQNet

ResQNet is a Vite + React prototype for coordinated disaster response.

## Local setup

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

The current prototype does not require an API configuration. If a backend is
added later, set `VITE_API_BASE_URL` in the local `.env` file. Do not commit
`.env` or any credentials to GitHub; use `.env.example` for shareable
configuration names and defaults.

## Production build

```powershell
npm run build
```
