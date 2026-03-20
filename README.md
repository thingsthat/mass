<p align="center">
  <img src="./static/logo.png" alt="Mass Logo" width="70%"/>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="License: AGPL-3.0"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/node-%3E%3D20.10-brightgreen.svg" alt="Node 20.10+"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/pnpm-9+-orange.svg" alt="pnpm"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/TypeScript-5.9-blue.svg" alt="TypeScript"></a>
</p>

# Mass Studio - AI-powered social simulation engine

Mass is for testing ideas against synthetic crowds. It lets you rehearse messaging, concepts, products, pitches, and social experiments against hundreds of diverse AI personas from the command line before you inflict them on real people.

Inspired by the hosted Mass platform on `holdmass.com`, this repository is the open source version. A local, inspectable engine for running persona-driven simulations, debates, and reports. Instead of a black-box dashboard, you get files, code, and a workflow you can trace, fork, and break.

Under the hood, Mass treats personas as agents with memory, context, and roles inside a small synthetic society. Reports, debates, and chats orchestrate multi-step interactions between these agents so you can see not just what a single model says, but how a crowd of simulated people might react.

## What Mass does

- You define cohorts and personas that roughly match the audiences you care about (demographics, attitudes, behaviours).
- Mass spins up those personas as agents and runs structured conversations, debates, and workflows between them around your prompts.
- It turns the resulting mess of interactions into structured outputs: reports, debates, chat transcripts, and workspace state you can inspect and diff.
- Everything runs locally against your filesystem and environment, so you can pin data directories, version scenarios, and wire it into your own tools.

### Example use cases

- **Message and positioning tests**: Run a cohort of synthetic customers through your new tagline or landing page copy and get a report of sentiment, objections, and suggested alternatives before you spend on ads.
- **Crisis and comms rehearsal**: Simulate a rough announcement or crisis scenario and see how different persona groups react, argue, and polarise.
- **Product and feature exploration**: Ask cohorts to pick between feature sets, pricing options, or product directions and read the reasoning, not just the upvotes.
- **Research prototyping**: Sketch out survey questions or interview prompts and see how diverse synthetic respondents interpret and answer them before you run a real study.

## Table of contents

- [Quick start](#quick-start)
- [CLI](#cli)
- [About the author](#about-the-author)
- [This repo vs holdmass.com](#this-repo-vs-holdmasscom)
- [Run your own instance](#run-your-own-instance)
- [Project structure](#project-structure)
- [Technology stack](#technology-stack)
- [Documentation](#documentation)

## Mass as an agent-driven engine

Mass is deliberately built as an agent engine rather than a collection of one-off prompts. Each persona behaves like a small agent with its own configuration, backstory, and memory, and simulations are about how these agents interact over time, not just what one model blurts out.

- `personas/` defines personas and cohorts that act as agents with different perspectives and constraints.
- `reports/` and `workflows/` coordinate multi-step simulations, debates, and analysis over those agents.
- `workspace/` tracks conversation state, inputs, and outputs across runs so you can revisit, fork, and compare scenarios.
- `llm/` manages the underlying models and routing, so you can plug in different providers without rewriting everything.

## Why this is open source

Mass is open sourced under AGPL because simulations that shape decisions should be inspectable. You should be able to see how personas are built, how workflows run, and how reports are stitched together, instead of trusting an opaque hosted tool that hands you a glossy PDF.

By keeping the core engine open:

- You can run it locally, wire it into your own data and environments, and keep sensitive scenarios off third party servers.
- Teams can fork, extend, and abuse it for their own workflows, from CI checks on copy changes to internal research tools.
- Contributions to personas, reports, workflows, and storage backends flow back into a shared engine, while AGPL ensures improvements are shared when the engine is used as a service.

If you want the hosted, managed version with APIs, pricing, and a nicer front end, use `holdmass.com`. If you want a small, aggressive, CLI-first engine you can read and modify, this repo is for you.

## This repo vs holdmass.com

This CLI is a slightly scaled-down version of the full Mass platform on [holdmass.com](https://holdmass.com). The hosted product offers more surface area: APIs, managed personas, billing, and a web UI. We're aiming to put everything on the CLI, so you can inspect it, and own the data. We are porting the rest over into this codebase so the open source version and the hosted platform stay aligned.

Expect the gap between this repo and the full platform to narrow over time. If you need the full stack today, reach out to us at holdmass.com; if you want to run, hack, and contribute to the engine, you are in the right place.

## Quick start

After cloning the repo:

**Prerequisites:** Node.js 20.10+ and pnpm (e.g. `npm install -g pnpm`).

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Environment setup**

   Copy [.env.example](.env.example) to `.env` and fill in your values. The app supports environment-specific files (`.env.development`, `.env.production`, `.env.test`) loaded automatically based on the `ENVIRONMENT` variable.

   **Required:** At least one LLM API key (e.g. `GOOGLE_API_KEY` for Google Gemini).

   **Optional:** `SQLITE_DB_PATH` (default `:memory:`; set to a path like `./data/mass.db` for a persistent database). See [.env.example](.env.example) for the full list and comments.

3. **Data and database**

   SQLite is used for app state (optional; in-memory by default). Persona, cohort, workspace, and report data live in a local JSON store under `data/` by default. See the CLI section below.

4. **Run the CLI**

   ```bash
   pnpm cli -- --help
   ```

## CLI

All behaviour (cohorts, personas, chat, reports, workspaces) runs against a local file-based store. Data is stored under `data/` by default (override with `MASS_DATA_DIR` or `mass -d <path>`).

**Main commands:** `cohort` (create, list, delete), `persona` (create, list, delete), `chat` (with `-p <persona-id>`), `report` (generate, list, show, delete), `workspace` (list, delete, rename, fork). Full CLI reference, workflows, and data layout: see [docs/](docs/).

```bash
pnpm cli -- --help
pnpm build:cli   # then node dist/cli.js or mass from bin
```

## Run your own instance

1. Clone the repo and install dependencies (`pnpm install`).
2. Copy [.env.example](.env.example) to `.env` and set at least one LLM API key (e.g. `GOOGLE_API_KEY` for Google Gemini).
3. Run the CLI: `pnpm cli` or build with `pnpm build:cli` and run `node dist/cli.js`. No server or web app.

## Project structure

```
cli/
├── cli.ts                   # CLI entry (commander)
└── commands/                # Commands by domain
    ├── cohort/              # create, list, delete
    ├── persona/             # create, list, delete
    ├── report/              # generate, list, show, delete
    ├── workspace/           # list, delete, rename, fork
    ├── chat.ts              # Chat with persona
    └── prompts.ts           # Interactive prompts (select, input)

core/
├── tasks/        # Background task controller (report/persona flows)
├── database/                # DB client (JSON store implementation)
├── helpers/                 # Utility functions
├── llm/                     # LLM routing, providers, models, schemas
├── storage/                 # JSON store paths
├── types/                   # Shared types
├── reports/                 # Report generation (functions, llm, types)
├── personas/                # Personas and cohorts (controllers, functions, llm, data)
├── workflows/               # Workflow engine, modules (used by report/chat)
└── workspace/               # Workspace (conversation state, messages)
```

## Technology stack

| Layer | Technology |
|-------|------------|
| Interface | CLI only (commander) |
| Language | TypeScript |
| Database | SQLite (better-sqlite3) and local JSON store |
| LLM services | OpenRouter, Google Gemini, OpenAI |

## Documentation

- [docs/concepts.md](docs/concepts.md) – Cohorts, personas, workspaces, reports
- [docs/examples.md](docs/examples.md) – In-depth walkthroughs (product feedback, persona interview, debate, questionnaire, ideas)
- [docs/setup.md](docs/setup.md) – Install and environment
- [docs/creating-personas.md](docs/creating-personas.md) – Create and manage cohorts and personas
- [docs/chat.md](docs/chat.md) – Chat with a persona
- [docs/reports.md](docs/reports.md) – Generate and view reports
- [docs/workspaces.md](docs/workspaces.md) – Workspace commands
- [docs/testing-personas.md](docs/testing-personas.md) – Testing personas (chat and reports)
- [docs/data-layout.md](docs/data-layout.md) – Data directory structure
- [docs/serve.md](docs/serve.md) – Serve view reports

## Running a fork

If you run your own fork and need to track upstream: create a branch from the upstream default (e.g. `git checkout -b upstream-main upstream/main`) and reset or merge as needed. The default clone is unbranded; set env vars for your own domain and project name.

---

<p align="center">
  <sub>Licensed under <a href="LICENSE">AGPL-3.0</a></sub>
</p>

## About the author

I'm Jack. I built Mass because I got tired of how slow and expensive it is to test audiences, and how opaque most tools are when they do it. This is my attempt at something you can run locally, read, and tweak. I develop Mass alone; you can find more about what I do at [thingsthat.com](https://thingsthat.com) and [jackprosser.com](https://jackprosser.com).