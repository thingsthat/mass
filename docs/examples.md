# Examples

In-depth walkthroughs for the Mass CLI. Each example is a full scenario: realistic prompts, step-by-step commands, what output to expect, and how to continue the flow.

**Prerequisites:** [Setup](setup.md) done; `GOOGLE_API_KEY` in `.env`.

---

## Walkthroughs

| Scenario | What you get |
|----------|--------------|
| [Product feedback and positioning](examples/product-feedback.md) | Create a cohort, run a feedback report on a product idea, then drill into one persona in chat. |
| [Deep persona interview](examples/persona-interview.md) | One-off probe, then continue in a workspace with follow-up questions; when and how to fork. |
| [Debate report](examples/debate-report.md) | Run a debate on a divisive question, read the output, then probe one side in chat. |
| [Questionnaire report](examples/questionnaire-report.md) | Phrase a survey-style prompt, run the questionnaire report, and inspect aggregated answers. |
| [Ideas report](examples/ideas-report.md) | Brainstorm features or improvements with a cohort; when to use ideas vs feedback. |

---

## Quick reference

| What you want | Command |
|---------------|--------|
| Create cohort and personas | `mass cohort create "Name" -p "Description" -c 5` |
| Add personas to a cohort | `mass persona create -c <cohort-id> -n 3` |
| List cohorts / personas | `mass cohort list` / `mass persona list -c <cohort-id>` |
| One-off chat | `mass chat -p <persona-id> -m "Your message"` |
| Interactive chat | `mass chat -p <persona-id>` |
| Continue a thread | `mass chat -w <workspace-id> -p <persona-id>` |
| Feedback report | `mass report generate -p "Question?" --cohort <id> -t feedback -o out.html` |
| Debate report | `mass report generate -p "Question?" --cohort <id> -t debate -o out.html` |
| Questionnaire report | `mass report generate -p "Survey question?" --cohort <id> -t questionnaire -o out.html` |
| Ideas report | `mass report generate -p "What would you suggest?" --cohort <id> -t ideas -o out.html` |
| List workspaces | `mass workspace list` |

Full option reference: [Creating cohorts and personas](creating-personas.md), [Chat](chat.md), [Reports](reports.md), [Workspaces](workspaces.md).
