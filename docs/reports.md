# Reports

Reports let you get structured, aggregate answers from many personas (a cohort or an explicit list) for a prompt. Use them to test ideas, positioning, or questions at scale.

## Generate a report

```bash
mass report generate -p "<prompt>" --cohort <cohort-id> -t <type> [-o report.html]
```

Or use a list of personas instead of a cohort:

```bash
mass report generate -p "<prompt>" --personas <id1>,<id2>,... -t <type> [-o report.html]
```

**Options:**

| Option | Description |
|--------|-------------|
| `-p, --prompt <text>` | The report prompt (e.g. "What do you think about product Y?"). Defaults to "What do you think?" if omitted. |
| `--cohort <id>` | Cohort ID. All personas in the cohort are queried. |
| `--personas <ids>` | Comma-separated persona IDs. Use instead of `--cohort` to target specific personas. |
| `-t, --type <type>` | Report type: `feedback`, `debate`, `questionnaire`, or `ideas`. Default: `feedback`. |
| `--debate-rounds <n>` | Debate only: max persona speaking turns. Default: 20. |
| `--debate-duration <minutes>` | Debate only: stop after N minutes; `0` = no time limit. Default: 2. |
| `-o, --out <path>` | Write report HTML to this path. |
| `-w, --workspace <id>` | Attach the report to an existing workspace. If omitted, a new workspace is created for this run. |

Example:

```bash
mass report generate -p "Views on product Y" --cohort abc-123 -t feedback -o report.html
```

## Report types

- **feedback** – Sentiment, quotes, summary, and verdict (positive / neutral / negative). Good for "what do people think?" style questions.
- **debate** – For/against views, which personas take which side, and a verdict. Good for polarising or opinion-driven topics.
- **questionnaire** – Questions are extracted from the prompt; each persona answers them; results are aggregated. Good for structured surveys.
- **ideas** – Idea generation and aggregation. Good for brainstorming or "what would you suggest?" prompts.

## Scenario examples by type

- **feedback:** One clear question plus what would make them try or avoid. Example: `mass report generate -p "Would you use an app that helps families plan weekly meals? What would make you try it or put you off?" --cohort <id> -t feedback -o report.html`. See [Examples: product feedback](examples/product-feedback.md).
- **debate:** A single proposition with a clear for/against. Example: `mass report generate -p "Should remote work be the default for office jobs?" --cohort <id> -t debate -o report.html`. See [Examples: debate report](examples/debate-report.md).
- **questionnaire:** Numbered or bulleted questions in the prompt so the LLM can extract and aggregate. Example: `mass report generate -p "Please answer: (1) How often do you shop online? (2) What would make you switch?" --cohort <id> -t questionnaire -o report.html`. See [Examples: questionnaire report](examples/questionnaire-report.md).
- **ideas:** Open-ended request for suggestions. Example: `mass report generate -p "What features would make you use a meal-planning app? List 3-5 ideas." --cohort <id> -t ideas -o report.html`. See [Examples: ideas report](examples/ideas-report.md).

## List, show, delete

- **List reports:**

  ```bash
  mass report list
  ```

  Filter by workspace:

  ```bash
  mass report list -w <workspace-id>
  ```

- **Show a report and optionally write HTML/JSON:**

  ```bash
  mass report show <report-id> [-o report.html]
  ```

- **Delete a report:**

  ```bash
  mass report delete <report-id>
  ```

## Output and storage

- Report JSON is stored under the data root in `reports/<report-id>.json`.
- With `-o <path>` on generate or show, HTML is written to that path. You can open it in a browser to read the report.

## Next steps

- [Examples](examples.md): in-depth walkthroughs (feedback, debate, questionnaire, ideas).
- [Workspaces](workspaces.md): reports can be attached to a workspace via `-w`.
- [Testing personas](testing-personas.md): using reports to test ideas at scale.
