# Questionnaire report

Run a questionnaire-style report: the LLM extracts questions from your prompt, each persona answers them, and the results are aggregated. Use it for structured surveys where you want comparable answers across personas.

## Scenario

You have a set of questions you want every persona to answer in the same format (e.g. "How often do you X?", "Rate Y from 1 to 5", "Which of A, B, C do you prefer?"). The questionnaire report type extracts questions from your prompt, asks each persona, and aggregates the answers so you can compare across the cohort.

## Step 1: Phrase the prompt so questions are extractable

The LLM derives questions from your prompt. Clear, numbered or bulleted questions work best. Avoid long prose with questions buried in the middle.

Good:

- "Please answer: (1) How often do you shop for groceries online? (2) What would make you switch to a different supermarket? (3) How important is delivery speed vs price?"
- "Answer these: How do you usually discover new apps? What would make you pay for an app you currently use for free?"

Weaker:

- "Tell me about your shopping habits and also what you think about online grocery and delivery." (no clear questions to extract)
- A single very long paragraph with several questions mixed in (harder to aggregate)

Keep the number of questions reasonable (e.g. 3–5) so the report stays readable and each persona has time to answer fully.

---

## Step 2: Run the questionnaire report

Pass your prompt and use report type `questionnaire`. Write the output to an HTML file so you can open it in a browser.

```bash
mass report generate -p "Please answer: (1) How often do you shop for groceries online? (2) What would make you switch to a different supermarket? (3) How important is delivery speed vs price?" --cohort 9355505b-782a-478c-b480-72608536239b -t questionnaire -o questionnaire-groceries.html
```

**What you get:** The report extracts the questions, runs each persona through them, and aggregates the answers. Report JSON is stored under the data root (e.g. `data/reports/<report-id>.json`). The HTML at the path you gave to `-o` contains the structured questionnaire output. Open it to see per-question aggregation and, where relevant, persona-level answers.

---

## Step 3: Inspect the aggregated result

In the HTML you will see something like:

- The extracted questions.
- Aggregated answers (e.g. how many personas said X vs Y).
- Optionally, breakdown by persona or by dimension.

Use this to spot patterns (e.g. "most care about price over speed") and outliers. If one persona's answers are interesting, use chat to dig in:

```bash
mass chat -p <persona-id> -m "In a recent survey you said X. Can you say more about why?"
```

---

## Step 4: List or re-export reports

To see all reports:

```bash
mass report list
```

To re-export a report as HTML (and JSON):

```bash
mass report show <report-id> -o questionnaire-groceries.html
```

---

## Summary

| Step | Command |
|------|--------|
| Run questionnaire report | `mass report generate -p "Please answer: (1) ... (2) ..." --cohort 9355505b-782a-478c-b480-72608536239b -t questionnaire -o questionnaire-groceries.html` |
| Probe one persona | `mass chat -p 28ff0d93-e6e5-435f-b930-77c2c5031c07 -m "You said X. Can you say more?"` |
| List / show reports | `mass report list` / `mass report show <report-id> -o out.html` |

Next: [Ideas report](ideas-report.md) for brainstorming, or [Product feedback](product-feedback.md) for sentiment and verdicts.
