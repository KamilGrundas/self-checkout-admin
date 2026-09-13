# Self Checkout Admin

React/Vite admin panel for the self-checkout platform. It is based on
`full-stack-fastapi-template/frontend` and exposes:

- Products
- Categories
- Checkout counters, active sessions, and per-counter camera/mode settings
- Native image labeling, labeled-image import, datasets, model metrics, and training
- Superuser-managed OpenAI-compatible vision inference integrations and
  scale-image autolabel batches

Authentication, user settings, and superuser user management are kept from the
template. Camera inventory, vision inference integrations, thumbnails, and
autolabeling actions are restricted by the backend/ML superuser checks.

The administrator's existing interface-language selector also selects the
catalog language for that browser session. Product and category lists use that
language; creating or editing the regular name field stores it as the English
or Polish translation accordingly. When the selected translation is empty, the
available translation is shown instead. The translation controls on product and
category editing remain available to superusers.

Vision inference providers are configured in **Integrations**, not API Keys or
the ML label tab. Each integration contains a display name, a full
OpenAI-compatible chat-completions endpoint, and a write-only API key. The
integration card lets an administrator select a vision model and shows whether
the provider reports a currently loaded model. Autolabeling is enabled only
after a complete integration has been activated. The backend contract is the
administrator-only `/api/v1/vision-inference-integrations` collection with
model discovery and activation operations; API keys must never be returned to
the browser.

The checkout-counter page polls for the latest camera inventory reported by the
native client. Camera selections and mode/language edits are stored on the
counter and take effect from the next checkout session.

`Machine Learning → Images` currently supports only `scale` images. It loads
thumbnails as authenticated blobs through ML, keeps manual labels separate from
vision-inference results, requires confirmation before relabeling manually labeled images,
and polls durable RQ batch progress. Batch creation uses an idempotency key that
works even when `crypto.randomUUID` is unavailable on a non-secure development
origin.

## Tooling

`Dockerfile.validation` provides the pinned Node.js and npm environment used
for linting, builds, and browser tests. The Compose validation service can run
those checks without installing Node.js or npm on the host. A local Node.js
installation is optional and only needed for direct Vite development.

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
files are intentionally ignored. The browser deployment URL is local operator
configuration. API URLs are compiled into the Vite build and must not use
Compose service names.

## Build And Checks

```bash
npm run lint
npm run build
npm test
```

`npm run lint` writes formatting changes. Use the non-mutating Biome command
from `AGENTS.md` for review-only validation. Browser tests and container builds
use the portable Compose validation service.

## Regenerate API Client

The generated client lives in `src/client` and is generated from `openapi.json`.

From the backend virtual environment, regenerate `openapi.json` from the local FastAPI app, then run:

```bash
npm run generate-client
```
