# Self Checkout Admin

React/Vite admin panel for the self-checkout backend. It is based on `full-stack-fastapi-template/frontend` and currently exposes catalog management only:

- Products
- Categories

Authentication, user settings and superuser user management are kept from the template because the backend protects catalog mutations with the existing auth flow.

## Requirements

- Node.js

## Local Development

```bash
npm install
npm run dev
```

The default API URL is configured in `.env`:

```env
VITE_API_URL=http://localhost:8000
```

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
