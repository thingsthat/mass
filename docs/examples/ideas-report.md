# Ideas report

Run an ideas-style report to collect and aggregate suggestions from a cohort: feature ideas, campaign concepts, or improvements. Use it when you want generative, open-ended input rather than sentiment or for/against positions.

## Scenario

You want to brainstorm with a defined demographic: "What features would make you use this product?", "What would make this campaign resonate?", or "What would you improve about X?" The ideas report type asks each persona for suggestions and aggregates them so you see common themes and outliers.

## When to use ideas vs feedback

- **Feedback:** You have a concrete proposition or question and want sentiment, quotes, and a verdict (positive / neutral / negative). Example: "Would you use an app that does X?"
- **Ideas:** You want suggestions, not a verdict. Example: "What features would make you use a meal-planning app?" or "What would make our brand feel more trustworthy?"

Use ideas when the goal is to generate and cluster ideas; use feedback when the goal is to gauge reaction to something specific.

## Step 1: Phrase an open-ended idea prompt

Ask for suggestions, not yes/no. Be specific about the domain so answers are comparable.

Good:

- "What features would make you use a meal-planning app? List 3–5 ideas."
- "What would make a banking app feel more trustworthy to you? Give concrete suggestions."
- "If you could change one thing about how you shop for groceries, what would it be and why?"

Weaker:

- "What do you think?" (too vague; ideas will be scattered)
- "Would you prefer A or B?" (that is feedback or debate, not idea generation)

---

## Step 2: Run the ideas report

Pass your prompt and use report type `ideas`. Write the output to an HTML file.

```bash
mass report generate -p "What features would make you use a meal-planning app? List 3-5 ideas." --cohort 9355505b-782a-478c-b480-72608536239b -t ideas -o ideas-meal-plan.html
```

**What you get:** The report collects ideas from each persona and aggregates them (themes, frequency, outliers). Report JSON is stored under the data root (e.g. `data/reports/<report-id>.json`). The HTML at the path you gave to `-o` contains the structured ideas output. Open it to see aggregated ideas and how they cluster.

---

## Step 3: Use the ideas in a second round

Take the aggregated ideas and test them. For example:

- Run a **feedback** report on the top 2–3 ideas: "Would you use an app that does X and Y?" to see which resonates.
- Use **chat** with one persona to go deeper: "You suggested X. Can you describe how that would work in practice?"

That gives you both breadth (ideas from many personas) and depth (reaction and detail from follow-up).

---

## Step 4: List or re-export reports

To see all reports:

```bash
mass report list
```

To re-export a report as HTML (and JSON):

```bash
mass report show <report-id> -o ideas-meal-plan.html
```

---

## Summary

| Step | Command |
|------|--------|
| Run ideas report | `mass report generate -p "What features would...? List 3-5." --cohort 9355505b-782a-478c-b480-72608536239b -t ideas -o ideas-meal-plan.html` |
| Follow up with feedback | `mass report generate -p "Would you use an app that does X?" --cohort 9355505b-782a-478c-b480-72608536239b -t feedback -o feedback-on-idea.html` |
| Probe one persona | `mass chat -p 28ff0d93-e6e5-435f-b930-77c2c5031c07 -m "You suggested X. How would that work in practice?"` |
| List / show reports | `mass report list` / `mass report show <report-id> -o out.html` |

Next: [Product feedback](product-feedback.md) for sentiment and verdicts, or [Questionnaire report](questionnaire-report.md) for structured surveys.
