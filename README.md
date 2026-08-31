# RAG AI Assistant Frontend

Standalone React/Vite web UI for the sibling `ai-assistance-api` service. The
frontend has its own dependencies, environment, Docker image, and Compose
project; it does not need to live inside or build from the API repository.

## Local development

```bash
cp .env.example .env
# Set VITE_RAG_API_KEY to the API's SERVICE_API_KEY.
npm install
npm run dev
```

Open <http://localhost:9090>. The API must be available at the configured
`VITE_RAG_API_URL` and allow this frontend origin through
`CORS_ALLOWED_ORIGINS`.

## Docker

```bash
cp .env.example .env
# Configure the API URL/key and optional tenant/user defaults.
docker compose up --build -d
```

Open <http://localhost:9090>. Runtime values are written to `/env.js` when the
container starts, so the same image can be promoted between environments
without rebuilding it.

All `VITE_*` settings are delivered to the browser and are therefore visible
to users. This UI is intended for trusted/admin use; do not treat the service
API key as a browser-held secret on a public deployment. Put an authenticated
backend-for-frontend or gateway in front of the API for public access.

## Vercel deployment

This repo includes:

- `vercel.json` - Vite build/output settings plus SPA fallback.
- `.env.production.example` - production env var checklist.

Create a Vercel project from this repository and set:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

Environment variables:

```text
VITE_RAG_API_URL=https://your-render-service.onrender.com
VITE_RAG_API_KEY=<same value as API SERVICE_API_KEY>
VITE_RAG_TENANT_ID=jobbazaar
VITE_RAG_USER_ID=user-1
```

After Vercel deploys, add the Vercel production origin to the API service's
`CORS_ALLOWED_ORIGINS` on Render and redeploy/restart the API.
