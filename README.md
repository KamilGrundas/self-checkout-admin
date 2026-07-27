# Self Checkout Admin

React/Vite admin panel for the self-checkout platform. It is based on
`full-stack-fastapi-template/frontend` and exposes:

- Products
- Categories
- Checkout counters, active sessions, and per-counter camera/mode settings
- Machine Learning datasets, models, training, Label Studio, and scale images
- Superuser-managed local VLM configuration and scale-image autolabel batches

Authentication, user settings, and superuser user management are kept from the
template. Camera inventory, inference configuration, thumbnails, and
autolabeling actions are restricted by the backend/ML superuser checks.

The checkout-counter page polls for the latest camera inventory reported by the
native client. Camera selections and mode/language edits are stored on the
counter and take effect from the next checkout session.

`Machine Learning → Images` currently supports only `scale` images. It loads
thumbnails as authenticated blobs through ML, keeps manual labels separate from
LLM results, requires confirmation before relabeling manually labeled images,
and polls durable RQ batch progress. Batch creation uses an idempotency key that
works even when `crypto.randomUUID` is unavailable on a non-secure development
origin.

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
VITE_ML_API_URL=http://localhost:8001
```

Create it from the tracked template with `cp .env.example .env`; local `.env`
files are intentionally ignored.

## Build And Checks

```bash
npm run lint
npm run build
npm test
```

`npm run lint` writes formatting changes. Use the non-mutating Biome command
from `AGENTS.md` for review-only validation. Browser tests and Docker builds run
through the workspace-controlled dev workflow.

## Regenerate API Client

The generated client lives in `src/client` and is generated from `openapi.json`.

From the backend virtual environment, regenerate `openapi.json` from the local FastAPI app, then run:

```bash
npm run generate-client
```
