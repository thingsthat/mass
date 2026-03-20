# Debate report

Run a debate-style report on a divisive or opinion-driven question. The report aggregates for/against positions, which personas take which side, and a verdict. Use it when you care about disagreement and positioning, not just overall sentiment.

## Scenario

You want to see how a cohort splits on a policy or product decision (e.g. remote work as default, subscription pricing, or a contentious feature). The debate report type is built for that: it surfaces opposing views and which personas align with each side, so you can then probe one side in chat if needed.

## Step 1: Choose a question that has two sides

Debate works best when the question has a clear for/against. Avoid vague or multi-part questions; one clear proposition gives a cleaner report.

Good:

- "Should remote work be the default for office jobs?"
- "Should streaming services show ads in exchange for a lower price?"
- "Is it acceptable for employers to monitor staff activity on work devices?"

Weaker:

- "What do you think about work?" (too broad)
- "Tell me about remote work and also about your commute." (two topics, no clear stance)

---

## Step 2: Run the debate report

Pass the question as the prompt and use report type `debate`. Attach the report to a workspace if you want to keep it with other conversation or reports; otherwise omit `-w` and a new workspace is created for this run.

```bash
mass report generate -p "Should remote work be the default for office jobs?" --cohort 9355505b-782a-478c-b480-72608536239b -t debate -o debate-remote-work.html
```

By default the debate runs for up to 20 persona speaking turns and stops after 2 minutes (whichever comes first). To control length:

- `--debate-rounds <n>`: max number of persona turns (default 20). Use a higher number for a longer debate.
- `--debate-duration <minutes>`: stop after this many minutes; use `0` for no time limit (only the round limit applies).

Example: run a longer debate with 50 turns and no time cap:

```bash
mass report generate -p "Should remote work be the default?" --cohort 9355505b-782a-478c-b480-72608536239b -t debate --debate-rounds 50 --debate-duration 0 -o debate-long.html
```

**What you get:** Report JSON is stored under the data root (e.g. `data/reports/<report-id>.json`). The HTML file at `debate-remote-work.html` (or whatever path you gave to `-o`) contains the structured output: for/against positions, which personas took which side, and a verdict. Open it in a browser.

---

## Step 3: Read the output and pick a side to probe

In the HTML report you will see something like:

- A summary of the "for" and "against" positions.
- Which personas aligned with which side (or neither).
- A verdict or synthesis.

Use that to choose one persona to interview further. For example, pick someone who was strongly "for" or "against" and use chat to understand their reasoning in their own words.

```bash
mass persona list -c 9355505b-782a-478c-b480-72608536239b
mass chat -p 28ff0d93-e6e5-435f-b930-77c2c5031c07 -m "In a recent discussion, you were on the [for/against] side of making remote work the default. What would need to be true for you to change your view?"
```

If you already have a workspace from a previous report or chat, you can attach the next report to it with `-w <workspace-id>` so all context lives in one place.

---

## Step 4: List or re-export reports later

To see all reports:

```bash
mass report list
```

To filter by workspace:

```bash
mass report list -w <workspace-id>
```

To re-export a report as HTML (and JSON):

```bash
mass report show <report-id> -o debate-remote-work.html
```

---

## Summary

| Step | Command |
|------|--------|
| Run debate report | `mass report generate -p "Should...?" --cohort 9355505b-782a-478c-b480-72608536239b -t debate -o debate-remote-work.html` |
| Longer debate (e.g. 50 rounds, no time limit) | `mass report generate -p "Should...?" --cohort <id> -t debate --debate-rounds 50 --debate-duration 0 -o out.html` |
| List personas | `mass persona list -c 9355505b-782a-478c-b480-72608536239b` |
| Probe one persona | `mass chat -p 28ff0d93-e6e5-435f-b930-77c2c5031c07 -m "You were on the X side. What would change your view?"` |
| List reports | `mass report list` |
| Re-export report | `mass report show <report-id> -o out.html` |

Next: [Questionnaire report](questionnaire-report.md) for structured surveys, or [Ideas report](ideas-report.md) for brainstorming.
