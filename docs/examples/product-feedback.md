# Product feedback and positioning

Get structured feedback from a cohort on a product or feature idea, then drill into one persona in chat to understand their reasoning.

## Scenario

You are considering a meal-planning app aimed at busy parents. You want to know whether a defined demographic would use it, what would make them try it, and what would put them off. You will create a small cohort, run a feedback report, then continue the conversation with one persona to test positioning.

## Step 1: Create a cohort and personas

Create a cohort with a clear demographic prompt. The prompt drives the weighted config (age, location, family situation, etc.) that the LLM uses when generating each persona. Be specific enough that the resulting personas feel like a real segment.

```bash
mass cohort create "UK parents 25-45" -p "UK-based parents, age 25-45, mix of single and dual-income, varied locations (cities and suburbs)" -c 4
```

**What you see:** The CLI prints the new cohort ID (e.g. `a1b2c3d4-...`) and confirms that four personas were created. If you used `--no-personas`, it would instead print the exact `mass persona create` command to run later.

**Why this prompt works:** It gives the LLM concrete dimensions (UK, age band, income mix, location variety) so personas are diverse but still in scope. Vague prompts like "parents" produce vaguer personas.

---

## Step 2: List personas and pick one

List personas for this cohort so you have IDs for the report and for chat.

```bash
mass persona list -c 9355505b-782a-478c-b480-72608536239b
```

The output is tab-separated: persona ID, name, and other fields. Copy one persona ID for the next steps (e.g. `28ff0d93-e6e5-435f-b930-77c2c5031c07`).

**If the list is empty:** You may have created the cohort with `--no-personas`. Run `mass persona create -c 9355505b-782a-478c-b480-72608536239b -n 4` and then list again.

---

## Step 3: Generate a feedback report

Ask the whole cohort one clear question. The feedback report type gives you sentiment, representative quotes, a summary, and a verdict (positive / neutral / negative).

```bash
mass report generate -p "Would you use an app that helps families plan weekly meals and generates a shopping list? What would make you try it or put you off?" --cohort 9355505b-782a-478c-b480-72608536239b -t feedback -o meal-plan-report.html
```

**What you get:** Report JSON is stored under the data root (e.g. `data/reports/<report-id>.json`). The HTML file you passed to `-o` is written to the path you gave (e.g. `meal-plan-report.html`). Open it in a browser to read the summary, verdict, and quotes.

**Prompt tip:** One clear question plus a short "what would make you try or avoid" works better than a long paragraph. The report aggregates answers; keep the prompt focussed so the summary stays interpretable.

---

## Step 4: Follow up with one persona in chat

Use chat to go deeper with a single persona. Start with a one-off message so you see how they respond in character.

```bash
mass chat -p 28ff0d93-e6e5-435f-b930-77c2c5031c07 -m "Would you use an app that helps families plan weekly meals and generates a shopping list? What would make you try it or put you off?"
```

**What you see:** The persona replies once; the process exits. After the first exchange the CLI prints something like `Workspace ID (save for later): <workspace-id>`. Copy that ID.

**Continue the thread:** To ask follow-up questions in the same conversation, use the workspace ID so the persona sees the full history:

```bash
mass chat -w <workspace-id> -p 28ff0d93-e6e5-435f-b930-77c2c5031c07 -m "You mentioned X. Would you pay for that, or would you expect it to be free?"
```

You can also run without `-m` for interactive mode: you type, they reply, repeat. Exit with Ctrl+D or by ending the process.

---

## Step 5: Inspect the report and compare

Open `meal-plan-report.html`. Check the verdict and the quoted responses. Then compare with what your chosen persona said in chat. If the report is lukewarm but one persona was enthusiastic (or the other way around), that is useful signal: you are seeing both aggregate and individual behaviour.

**Optional:** Run the same report prompt with a different cohort (e.g. different age band or location) and compare verdicts. Use `mass report list` to see all reports; use `mass report show <report-id> -o another.html` to re-export one as HTML.

---

## Summary

| Step | Command |
|------|--------|
| Create cohort + personas | `mass cohort create "UK parents 25-45" -p "UK-based parents, 25-45, ..." -c 4` |
| List personas | `mass persona list -c 9355505b-782a-478c-b480-72608536239b` |
| Feedback report | `mass report generate -p "Would you use...?" --cohort 9355505b-782a-478c-b480-72608536239b -t feedback -o meal-plan-report.html` |
| One-off chat | `mass chat -p 28ff0d93-e6e5-435f-b930-77c2c5031c07 -m "Would you use...?"` |
| Continue in workspace | `mass chat -w <workspace-id> -p 28ff0d93-e6e5-435f-b930-77c2c5031c07` (optionally with `-m "..."`) |

Next: [Deep persona interview](persona-interview.md) (workspaces and follow-up flow), or [Debate report](debate-report.md) for polarising questions.
