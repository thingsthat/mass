# Simulations

This guide walks through running a **Public Opinion and Policy Testing** scenario: a cohort of personas (e.g. left-wing voters), initial world variables, an optional intervention (e.g. a Twitter-style announcement at a specific step), and how to inspect or branch the run.

## Prerequisites

- Use the CLI with the local JSON store. Either:
  - Run commands via `pnpm run cli` (which sets the store for you), or
  - Set `MASS_CLI=true` or `MASS_USE_JSON_STORE=true` and use `mass` from your path.
- A **cohort** with at least one persona. If you do not have one:

```bash
# Create a cohort and add personas (see cohort/persona docs)
mass cohort create -n "Left-wing voters" -p "5 left-wing voters, concerned about inequality"
# Note the cohort ID from the output, then create personas into it
mass persona create -c <cohort-id> --count 3
```

## Scenario config examples

The `--config` value is JSON with:

- **core_issue** (string): The topic or question personas react to (e.g. a policy, a product, a crisis).
- **initial_variables** (object): World state at step 0. Use numeric (or string/boolean) keys your interventions and persona actions can update.
- **stances** (array, optional): Stance axes to track per persona (1–10 scale). Omit to use a single default stance.

Below are example configs you can pass as `--config '...'` for different use cases.

**Public opinion / policy testing**

```json
{
  "core_issue": "The new wealth tax proposal and its impact on public services and inequality.",
  "initial_variables": {
    "public_approval": 50,
    "polarisation_index": 30,
    "issue_salience": 40
  }
}
```

**Financial / market**

```json
{
  "core_issue": "How the latest interest rate decision and earnings reports affect your investment stance.",
  "initial_variables": {
    "asset_price": 100,
    "market_volatility": 25,
    "liquidity": 70
  },
  "stances": ["buy_intent", "risk_aversion"]
}
```

**PR / crisis / brand risk**

```json
{
  "core_issue": "A data breach has been reported; the company is preparing a response.",
  "initial_variables": {
    "brand_trust": 60,
    "media_scrutiny": 40
  },
  "stances": ["trust_in_brand", "forgiveness"]
}
```

**Product / launch**

```json
{
  "core_issue": "A new subscription tier is launching; early adopters and peers are discussing it.",
  "initial_variables": {
    "market_penetration": 5,
    "competitor_response": 20
  },
  "stances": ["adoption_intent", "price_sensitivity"]
}
```

**Organisational / macro**

```json
{
  "core_issue": "The new remote-work policy and how it affects morale and compliance.",
  "initial_variables": {
    "institutional_trust": 55,
    "compliance_rate": 70,
    "operational_efficiency": 60
  },
  "stances": ["support_for_policy", "compliance_willingness"]
}
```

## Step 1: Create the scenario and run (or create only)

Use `simulation run` with `--config` and `-n` to create a scenario workspace and run it. Attach personas either with `-c <cohort-id>` or, when not using a cohort, with `--persona-count <number>` to pick that many personas at random from the database.

**Create and run in one go (policy-style example):**

```bash
mass simulation run \
  --config '{"core_issue":"The new wealth tax proposal and its impact on public services and inequality.","initial_variables":{"public_approval":50,"polarisation_index":30,"issue_salience":40}}' \
  -n "Left-wing voters policy test" \
  --max-steps 10 \
  -c <your-cohort-id>
```

**Example output:**

```
Scenario created.
Workspace ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Variables: {"public_approval":50,"polarisation_index":30,"issue_salience":40}
Running simulation loop for task t9f8e7d6-...
Task status: completed
...
```

If you want to **inject an intervention before the first run** (Step 2), create the workspace without running steps by using `--max-steps 0`. You will get the workspace ID from the output, then inject, then run with `-w <workspace-id>` in Step 3.

```bash
mass simulation run --config '{"core_issue":"The new wealth tax proposal and its impact on public services and inequality.","initial_variables":{"public_approval":50,"polarisation_index":30,"issue_salience":40}}' -n "Left-wing voters policy test" -c <your-cohort-id> --max-steps 0
```

Copy the **Workspace ID** from the output; you will use it for inject and for `simulation run -w <id>`.

## Step 2 (optional): Schedule an intervention

Inject an event that changes world variables. You can apply it **on the next step** (omit `--at-step`) or **at a specific step** (e.g. step 5).

Example: a "Twitter announcement" at step 5 that drops public approval and raises polarisation.

```bash
mass simulation inject a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  --type social \
  --title "Twitter announcement" \
  --description "Major party announces new tax policy on social media" \
  --effects '{"public_approval":45,"polarisation_index":55}' \
  --at-step 5
```

**Example output:**

```
Intervention injected: Twitter announcement
Scheduled at step 5
```

Effects are JSON: keys are workflow variable names, values are numbers (or strings/booleans). In the example above the variables are `public_approval`, `polarisation_index`, `issue_salience`; use whatever keys you defined in your scenario config's `initial_variables`.

To apply the same event **immediately on the next step** instead of at step 5, omit `--at-step 5`.

## Step 3: Run the simulation (if not already run in Step 1)

If you created the workspace with `--max-steps 0` so you could inject first, run the simulation now. One command creates a task for the workspace (if needed) and runs until `max_steps` or pause.

```bash
mass simulation run -w a1b2c3d4-e5f6-7890-abcd-ef1234567890 --max-steps 10
```

If the workspace has no runnable task (or the latest run is already completed or failed), a new task is created and then run. If there is a pending or running task, that task is resumed.

**Example output:**

```
Running simulation loop for task t9f8e7d6-c5b4-3210-fedc-ba0987654321...
Task status: completed
Result: {"workspace_id":"a1b2c3d4-...","final_step":10,"variables":{"public_approval":45,"polarisation_index":55,"issue_salience":40}}
```

Variables in the result reflect the state after all steps, including any interventions (e.g. the one at step 5).

## Step 4: Inspect status and variables

At any time (before, during, or after a run) you can show the current workflow state:

```bash
mass simulation status a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Example output:**

```
Step: 10 / 10
Status: completed
Variables: {
  "public_approval": 45,
  "polarisation_index": 55,
  "issue_salience": 40
}
Scheduled events: (none, or list of title + step)
```

## Command reference

| Command | Purpose |
|--------|--------|
| `simulation run --config '<json>' -n <name> [-d desc] [--max-steps N] [-c cohort-id] [--persona-count N] [--persona id...]` | Create scenario workspace and run. Use `-c` for a cohort or `--persona-count N` for N random personas. |
| `simulation run -w <workspace-id> [--max-steps N]` | Run existing workspace (creates a task if needed, then runs until completion or pause). |
| `simulation run -t <task-id>` | Run an existing task only (no auto-create). |
| `simulation inject <workspace-id> --type <type> --title <t> --description <d> --effects '<json>' [--at-step N]` | Inject an intervention (immediate or at step N). |
| `simulation branch <workspace-id> [-n name]` | Duplicate workspace for A/B. |
| `simulation status <workspace-id>` | Show step, status, and variables. |

Event types for `--type`: `news`, `policy`, `market`, `product`, `social`, `incident`.

## A/B testing: branching and comparing variants

To compare two variants (e.g. different messaging or interventions), duplicate the workspace at a given point, then run each branch with different interventions.

1. Create and start the scenario as in Steps 1 and 2.
2. Run a few steps (e.g. run to step 5 by setting `--max-steps 5` when starting, or run fully then branch from a copy you make earlier). For a simple A/B test, you can branch **before** running:
3. Branch the workspace (creates a full copy of conversation and workflow):

```bash
mass simulation branch a1b2c3d4-e5f6-7890-abcd-ef1234567890 -n "Variant A: no intervention"
# Note the new workspace ID from output, e.g. b2c3d4e5-...
```

4. On the **original** workspace, inject one intervention (e.g. positive message); on the **branch**, inject another (e.g. negative message).
5. Run the simulation on each workspace (e.g. `mass simulation run -w <id>` for each).
6. Compare outcomes with `mass simulation status <workspace-id>` for each.

**Example:**

```bash
# Branch
mass simulation branch a1b2c3d4-e5f6-7890-abcd-ef1234567890 -n "Variant B"
# New workspace ID: b2c3d4e5-f6a7-8901-bcde-f12345678901

# Variant A: inject positive framing
mass simulation inject a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  --type policy --title "Positive framing" --description "Policy framed as fair" \
  --effects '{"public_approval":60,"polarisation_index":35}'

# Variant B: inject negative framing
mass simulation inject b2c3d4e5-f6a7-8901-bcde-f12345678901 \
  --type policy --title "Negative framing" --description "Policy framed as punitive" \
  --effects '{"public_approval":35,"polarisation_index":65}'

# Run both (creates task and runs if needed)
mass simulation run -w a1b2c3d4-e5f6-7890-abcd-ef1234567890
mass simulation run -w b2c3d4e5-f6a7-8901-bcde-f12345678901

# Compare
mass simulation status a1b2c3d4-e5f6-7890-abcd-ef1234567890
mass simulation status b2c3d4e5-f6a7-8901-bcde-f12345678901
```

## Data location

With the default data directory, scenario workspaces and tasks are stored under `data/workspaces/` and `data/tasks/` as JSON files. Use `-d <path>` or `MASS_DATA_DIR` to override.
