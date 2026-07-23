# Self Checkout Admin

React/Vite admin panel for the self-checkout backend. It is based on `full-stack-fastapi-template/frontend` and currently exposes catalog management only:

- Products
- Categories

Authentication, user settings and superuser user management are kept from the template because the backend protects catalog mutations with the existing auth flow.

## Requirements

- Node.js 24.18.0 LTS
- npm 12.0.1

## Local Development

```bash
npm install
npm run dev
```

The default API URL is configured in `.env`:

```env
VITE_API_URL=http://localhost:8000
```

Create it from the tracked template with `cp .env.example .env`; local `.env`
files are intentionally ignored.

## Build And Checks

```bash
npm run lint
npm run build
```

## Regenerate API Client

The generated client lives in `src/client` and is generated from `openapi.json`.

From the backend virtual environment, regenerate `openapi.json` from the local FastAPI app, then run:

```bash
npm run generate-client
```
