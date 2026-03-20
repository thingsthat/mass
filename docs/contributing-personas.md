# Contributing personas back to the project

If you have created cohorts or personas that you think would be useful for others, you can contribute them back to the Mass project. This guide explains the format and how to submit.

## What you can contribute

- **Cohorts** – A cohort definition (name, description, cohort config) that others can use to generate or understand a persona set.
- **Personas** – One or more persona JSON files (with optional validation or improvement sidecars) that fit a described cohort or theme.

Contributions might be a single cohort and its personas, a themed set (e.g. "UK parents", "tech workers in Berlin"), or a bundle that showcases a particular use case or demographic.

## Format

Persona and cohort data must match the layout and shape the CLI uses:

- **Personas:** One folder per persona, `personas/<id>/`, containing at least `<id>.json`. The main JSON must match the persona schema (name, metadata, username, optional `details.persona` narrative, etc.). See [Creating cohorts and personas](creating-personas.md) and [Data layout](data-layout.md).
- **Cohorts:** A cohort record that references your persona IDs (e.g. in `persona_ids`). Each cohort is a single file `cohorts/<id>.json`; the CLI discovers cohorts by listing that directory. When contributing, provide the `cohorts/<id>.json` file(s) and the persona folders.

If you created the personas with the Mass CLI, your `data/personas/` and `data/cohorts/` output is already in the right format. You can zip or tar the relevant folders and files to share.

## What to include

When contributing:

1. **A short description** – What the cohort represents (e.g. "UK-based parents, 25–45, mixed locations"), how many personas, and any theme or use case.
2. **The cohort prompt** – The exact prompt you used for `mass cohort create` (or equivalent) so others can reproduce or adapt it.
3. **The data** – The cohort JSON and the persona folders (`personas/<id>/` with `<id>.json` inside each).
4. **Licensing** – Confirm that you are contributing under the project’s licence (AGPL-3.0). By submitting, you grant the project the right to use, modify, and redistribute the contributed personas and cohorts under that licence.

Do not include workspace or report data unless it is specifically needed for a documented example; keep the contribution to cohorts and personas.

## How to submit

Open a pull request and add your cohort and persona JSON files. Include a short description in the PR (what the cohort is, the prompt you used, and how many personas).

## Quality and appropriateness

- Personas should be suitable for use in social simulation and testing (e.g. product feedback, debates, surveys). Avoid contributing offensive, illegal, or personally identifiable real-world data.
- The project may reject or request changes to contributions that do not fit the schema, are incomplete, or do not meet community standards.

## Related docs

- [Creating cohorts and personas](creating-personas.md) – How to create cohorts and personas with the CLI
- [Data layout](data-layout.md) – Where persona and cohort files live and how they are structured
