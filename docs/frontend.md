# Frontend

The web UI lives in `frontend/`, wired to **`core/`** for domain logic and importing GraphQL documents from **`backend/src/graphql/`** at build time only (not a runtime dependency on the Node server).

## Stack and notable libraries

- **App shell:** Vue 3, Vite, Pinia, Vue Router, **VueUse**.
- **Styling:** **Tailwind CSS** v4 (Vite plugin), **Reka UI** headless primitives, plus **class-variance-authority**, **clsx**, and **tailwind-merge** for component variants.
- **Chat and “AI” UI:** Most of the assistant-style experience lives under **`frontend/src/components/ai-elements/`** (conversation layout, messages, prompt input with attachments and commands, suggestions, loaders, shimmer). Those pieces align with types from Vercel’s **`ai`** package (AI SDK), even though the UI is Vue, not React.
- **Diagrams and data viz:** **Vue Flow** (`@vue-flow/*`) and **D3** where graphs or quantitative views need more control.
- **Rich content:** **Shiki** for syntax highlighting, **vue-stream-markdown** for streamed markdown, **vue-stick-to-bottom** for chat scroll behaviour.
- **Motion and media:** **motion-v** for animation, **Rive** for vector animation where used, **media-chrome** for video player chrome.
- **Other UX:** **Embla** carousels, **vue-sonner** for toasts, **Lucide** and **Radix** icons.

If you extend the UI, `ai-elements` is the first place to look for patterns (composition, providers, and message branching) before adding one-off chat widgets.

## What this UI is (and is not)

This front end is **not** the Mass product UI from the hosted platform. It is a separate, open-source shell: slimmer, opinionated for **hackability** and **extension**, so other developers can fork the repo, bolt on flows, swap pieces, or wire the same API into their own clients without fighting a closed design. I'm not a huge fan of Tailwind for my own projects, but I made an exception here, as I know the community is. And the LLM coders seem to lean that direction too. Half the point of this stack is to make contribution possible.

## Running locally

From the repo root:

```bash
pnpm dev
```

That runs the API and Vite together. Use `pnpm frontend` or `pnpm backend` if you only need one process.

- **Vite** defaults to port **5173** (`frontend/vite.config.ts`).
- The **API** defaults to **3000** (`PORT` in the environment overrides it).

## How the browser reaches the API

`frontend/src/api/helpers.ts` chooses a base URL:

- **Local development** (`localhost`, `127.0.0.1`, or hostname containing `192.168`): requests go to **`http://localhost:3000`** by default. If you change the API `PORT`, update `frontend/src/api/helpers.ts` (or introduce a shared env-based base URL) so the UI matches.
- **Other hosts**: base URL is `/api`, for deployments that serve the UI and proxy `/api` to the backend.

GraphQL and other HTTP calls are built from that base (see `getEndpointUrl` and `frontend/src/api/graphqlClient.ts`).

## Backend routes the UI uses

The standalone server (`backend/src/server.ts`) exposes at least:

- `POST /graphql` – main data API.
- `POST /prompt-ask` – streamed persona replies (SSE).
- `POST /report-start` – start report generation.

The same paths are also registered under `/.netlify/functions/...` for deployment parity.

## Build

```bash
pnpm -F mass-frontend build
```

Output is `frontend/dist`. Production hosting, env vars, and `/api` proxying are deployment-specific; local work is covered in [setup.md](setup.md).
