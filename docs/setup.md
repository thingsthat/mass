# Setup

## Prerequisites

- **Node.js** 20.10 or newer.
- **pnpm** (e.g. `npm install -g pnpm`).

## Install

From the project root:

```bash
pnpm install
```

## Environment

1. Copy the example env file and edit it:

   ```bash
   cp .env.example .env
   ```

2. Set at least one LLM API key. The app supports environment-specific files (`.env.development`, `.env.production`, `.env.test`) loaded automatically based on the `ENVIRONMENT` variable.

   **Required for cohort/persona creation, chat, and reports:** at least one of:

   - `GOOGLE_API_KEY` (Google Gemini).
   - Other providers (e.g. OpenRouter, OpenAI) if configured; see the codebase and `.env.example` for supported keys.

3. **Optional:**

   - `MASS_DATA_DIR` – directory for personas, cohorts, workspaces, and reports. Default is `data` under the current working directory. You can also pass `-d <path>` to the CLI.
   - `SQLITE_DB_PATH` – path for SQLite app state (default `:memory:`). Set to something like `./data/mass.db` for a persistent database. Persona, cohort, workspace, and report data live in the local JSON store under `data/`, not in SQLite.

## Running the CLI

- Show help:

  ```bash
  pnpm cli -- --help
  ```

- Run any command by passing it after `--`, e.g.:

  ```bash
  pnpm cli cohort list
  pnpm cli persona list
  ```

Optional: build a standalone CLI and run it directly:

```bash
pnpm build:cli
node dist/cli.js
```

You can also link the `mass` bin from `package.json` and run `mass` if configured.

## Running the web app and API

The open-source workspace includes a **Vue 3** front end (`frontend/`) and an **HTTP API** (`backend/`) used by that UI. The API is a small **Hono** app on Node; routes include GraphQL (`POST /graphql`) and JSON endpoints such as `/prompt-ask` and `/report-start`.

From the **repository root**:

| Command | What it does |
|---------|----------------|
| `pnpm dev` | Starts **both** the API and the Vite dev server in parallel. |
| `pnpm backend` | API only (`mass-backend`, default **http://localhost:3000**). |
| `pnpm frontend` | Vite only (default **http://localhost:5173**). |

- **`PORT`** – API listen port (default `3000`). Set in `.env` or the shell if something else already uses 3000.
- **Local API base URL** – For `localhost`, `127.0.0.1`, or typical `192.168.*` hosts, the front end targets `http://localhost:<PORT>` for API calls (see `frontend/src/api/helpers.ts`). Other hosts use relative `/api` (for hosted or reverse-proxy setups).

You still need the same **`.env`** LLM keys and optional `MASS_DATA_DIR` / `SQLITE_DB_PATH` as for the CLI.

## Next steps

- [Frontend](frontend.md): UI stack and how it talks to the API.
- [Concepts](concepts.md): cohorts, personas, workspaces, reports.
- [Creating cohorts and personas](creating-personas.md): create and list cohorts and personas.
