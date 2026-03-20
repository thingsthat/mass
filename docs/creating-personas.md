# Creating cohorts and personas

Personas are always created from a cohort. You first create a cohort (with an optional prompt and optional persona count), then create or add personas for that cohort.

## Creating a cohort

```bash
mass cohort create "<name>" -p "<prompt>" -c <count>
```

- **`<name>`** – Cohort name (e.g. "UK parents").
- **`-p, --prompt <text>`** – Cohort description for the LLM. If omitted, the cohort name is used. This prompt drives the weighted config (demographics, locations, etc.) that the LLM uses when generating personas.
- **`-c, --count <n>`** – Number of personas to create in this run (1-10). Default is 5.
- **`--no-personas`** – Only create the cohort config; do not create any personas. You can add personas later with `mass persona create`.

Example:

```bash
mass cohort create "UK parents" -p "UK parents, 25-45, mixed locations" -c 5
```

The CLI prints the new cohort ID. If you used `--no-personas`, it also prints the exact `mass persona create` command to run later.

## Creating personas for an existing cohort

If you created a cohort with `--no-personas`, or you want to add more personas:

```bash
mass persona create -c <cohort-id> -n <count>
```

- **`-c, --cohort <id>`** – (Required.) Cohort ID from `mass cohort list`.
- **`-n, --count <n>`** – Number of personas to create (1-10). Default is 5.

The LLM generates each persona from the cohort config. Names are deduplicated within the run, and a username is generated from each persona's name. New persona IDs are appended to the cohort's `persona_ids`.

## Listing cohorts and personas

- List all cohorts (id, name, description, persona count):

  ```bash
  mass cohort list
  ```

- List all personas:

  ```bash
  mass persona list
  ```

- List only personas belonging to a cohort:

  ```bash
  mass persona list -c <cohort-id>
  ```

Use the printed persona IDs for [chat](chat.md) (`-p <persona-id>`) and [reports](reports.md) (`--personas` or via cohort).

## Deleting cohorts and personas

- **Delete a cohort:**

  ```bash
  mass cohort delete <id>
  ```

  This removes the cohort record only. Persona files under `data/personas/` are **not** deleted; they remain and can still be used in chat or reports. To remove personas from disk you must delete them explicitly.

- **Delete a persona:**

  ```bash
  mass persona delete <id>
  ```

  This removes the persona from the store (the folder `data/personas/<id>/` and its contents).

## Persona data layout

Each persona is stored under the data root (default `data/`, or `MASS_DATA_DIR`):

- **`personas/<id>/<id>.json`** – The persona record (name, metadata, username, connections, and optional narrative backstory in `details.persona`).

See [Data layout](data-layout.md) for the full directory structure.

## Example: create cohort, list personas, use in chat or reports

Create a cohort with a clear demographic prompt and four personas:

```bash
mass cohort create "UK parents 25-45" -p "UK-based parents, age 25-45, mix of single and dual-income, varied locations" -c 4
```

The CLI prints the new cohort ID. List personas for that cohort:

```bash
mass persona list -c <cohort-id>
```

Use a persona ID from the output for chat (`mass chat -p <persona-id> -m "..."`) or use the cohort ID for reports (`mass report generate -p "..." --cohort <cohort-id> -t feedback -o out.html`). For a full walkthrough see [Examples: product feedback](examples/product-feedback.md).

## Next steps

- [Examples](examples.md): in-depth walkthroughs (product feedback, persona interview, report types).
- [Chat](chat.md): talk to a single persona.
- [Reports](reports.md): run feedback, debate, questionnaire, or ideas reports over a cohort or persona list.
- [Testing personas](testing-personas.md): how to test personas in practice.
