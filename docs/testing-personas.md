# Testing personas

"Testing" personas here means: (1) checking that a persona responds in character, and (2) getting structured feedback from many personas for an idea or question. You do both with the same CLI: chat for single-persona checks, reports for cohort-scale feedback.

## Single-persona testing (chat)

Use chat to see how one persona reacts to a prompt. You can run a one-off message or an interactive session and optionally reuse a workspace to build a thread.

**One-off:**

```bash
mass chat -p <persona-id> -m "What do you think about remote work?"
```

**Interactive:** run without `-m` in a TTY and type messages in turn. Save the workspace ID printed after the first exchange so you can continue later:

```bash
mass chat -w <workspace-id> -p <persona-id>
```

**Example prompts:**

- Opinion on a product or feature: "Would you use an app that does X? Why or why not?"
- Personal preference: "How do you usually decide what to buy?"
- Scenario: "Your friend asks you to try Y. How do you respond?"

If the persona stays in character, uses their backstory and metadata consistently, and answers in a way that fits their profile, the persona is behaving as intended. If not, you may want to create a new cohort or adjust the cohort prompt and regenerate personas.

## Cohort-scale testing (reports)

Use reports to get structured, aggregate answers from a whole cohort (or a chosen list of personas). Pick the report type that fits your question:

- **feedback** – Overall sentiment, quotes, and verdict. Best for "what do people think about X?"
- **debate** – For/against positions and a verdict. Best for polarising or opinion-driven topics.
- **questionnaire** – Extract questions from your prompt; each persona answers; view aggregated results. Best for structured surveys.
- **ideas** – Idea generation and aggregation. Best for "what would you suggest?" or brainstorming.

Example:

```bash
mass report generate -p "What would make you switch to a new bank?" --cohort <cohort-id> -t feedback -o report.html
```

Open `report.html` in a browser to read the summary, verdict, and quotes. You can also run `mass report show <report-id> -o report.html` for an existing report.

Use the same cohort (or persona list) with different prompts or report types to test multiple ideas or question phrasings.

## Example: test a persona properly (chat then report)

1. **Check one persona in character:** Run a one-off chat with a concrete question. Note the workspace ID printed after the first exchange.
   ```bash
   mass chat -p <persona-id> -m "Would you use an app that helps families plan weekly meals? Why or why not?"
   ```
2. **Continue the thread:** Use the workspace ID to ask a follow-up that builds on their answer (e.g. "You said X. Would you pay for that?"). If their replies stay consistent with their backstory and metadata, the persona is behaving as intended.
3. **Test at cohort scale:** Run a feedback report with the same or a related prompt so you see both individual and aggregate behaviour.
   ```bash
   mass report generate -p "Would you use an app that helps families plan weekly meals?" --cohort <cohort-id> -t feedback -o report.html
   ```
4. Compare the report verdict and quotes with what your single persona said; use that to decide whether to refine the cohort prompt or add more personas. Full walkthroughs: [Examples](examples.md).

## Validation artefacts (optional)

Some deployments or tooling may produce extra files next to a persona's JSON:

- **`<id>_validation.json`** – Contains plausibility and consistency scores (e.g. overall, demographic, personality, lifestyle), strengths, minor concerns, and improvement suggestions. Useful to see how coherent and realistic the persona is. The current Mass CLI does not generate this file; it may come from external or legacy scripts.
- **`<id>_improvement_log.json`** – Log of improvements applied (e.g. after a validation run). The current CLI does not generate this file.

If you have these files, you can use them to decide which personas to keep or to drive manual edits. They are optional; chat and reports work without them.

## Next steps

- [Examples](examples.md): in-depth walkthroughs (product feedback, persona interview, report types).
- [Chat](chat.md): full chat options and workspace behaviour.
- [Reports](reports.md): report types and generate/list/show/delete.
- [Creating cohorts and personas](creating-personas.md): creating and listing personas.
