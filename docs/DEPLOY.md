# Deployment

## API

`Dockerfile` and `render.yaml` deploy the API workspace. The API listens on `PORT` (3000 by default) and exposes `GET /api/health`.

The only optional model integration environment variable currently used by the API is `GEMINI_API_KEY`. Business Central credentials are needed only when enabling a separately implemented authenticated integration; PostgreSQL and Redis are not required by the current in-memory API.

### Docker

```powershell
docker build -t bc-agent .
docker run --rm -p 3000:3000 -e GEMINI_API_KEY=your-key bc-agent
```

The image starts `@bc-agent/api`. It does not contain `alc.exe`, PowerShell, BcContainerHelper, or a Docker host for nested container provisioning; run `compile`, `publish` and `sandbox` from a suitable developer environment.

### Render

Create a Render Blueprint from `render.yaml`. It provisions only the Node web service. Configure `GEMINI_API_KEY` if live model responses are required.

## Web console

The React/Vite web app is built independently with `npm run build -w @bc-agent/web`. Host the generated `apps/web/dist` static bundle and configure the host or reverse proxy to route `/api` requests to the API service.

For local development, `npm run dev:api` starts the API and `npm run dev` starts Vite. The Vite `/api` proxy defaults to `http://127.0.0.1:3000`; set `API_PROXY_TARGET` to use a different local API URL.

## Smoke check

```powershell
curl http://localhost:3000/api/health
```

The optional live Business Central Playwright suite additionally requires an authenticated environment configured through `BC_WEB_URL`. See [the browser automation guide](./04-PLAYWRIGHT-BROWSER-AUTOMATION.md).
