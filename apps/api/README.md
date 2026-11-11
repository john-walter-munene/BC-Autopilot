# @alchemy365/api

Backend API Gateway and Orchestration service for the Autonomous Business Central Agent.

## Endpoints
- `POST /api/agent/explore-docs` — Semantic search and RAG retrieval over Microsoft Learn Business Central docs.
- `POST /api/agent/parse-frd` — Intelligent extraction of tables, custom fields, and acceptance rules from FRD text.
- `POST /api/agent/generate-al-custom` — Synthesizes complete AL extension packages with AST syntax checks.
- `POST /api/agent/learn-from-doc` — Live doc crawler that extracts new episodic development rules.
- `POST /api/agent/reflect-and-improve` — Automated self-reflection comparing failed compilation/tests against docs.
- `POST /api/agent/chat` — Conversational assistant powered by Gemini 2.5 Flash for Business Central guidance.
- `GET /api/health` — Service readiness and health probe.
