# @bc-agent/web

Frontend web console for the Autonomous Dynamics 365 Business Central Engineering Agent.

## Overview
Built with **React 19**, **Tailwind CSS**, and **Motion**, this application provides:
- **Autonomous Workflow Console**: Visual step-by-step pipeline view.
- **FRD Studio**: Interactive functional requirement document editor with instant entity extraction.
- **AL Studio**: AL code explorer with Monaco-style syntax views and live AST linter diagnostics.
- **Playwright Testbench**: Visual assertion logs and live browser DOM automation controls.
- **Next.js Bridge**: Real-time TypeScript types and OData v4 client Route Handlers.
- **Continuous Learning View**: Live Microsoft Learn doc crawler and self-reflection engine.
- **Settlement & Audit View**: Cryptographic SHA-256 build certificates and dispute detection.

## Development
```bash
npm run dev
```

Run the API separately with `npm run dev:api` in the repository root. Vite proxies `/api` requests to `http://127.0.0.1:3000` by default; set `API_PROXY_TARGET` to override the target.
