# Changelog

## [0.2.0] - 2026-03-17

### Added

- **Web app.** A browser-based interface so you can run Mass without the CLI. Open the app, get a workspace, and start asking questions. Workspaces are created automatically if you have none.
- **Chat with personas and cohorts.** In a workspace you choose which personas or cohorts are in the conversation. Ask a question and see replies from each persona as they arrive. You can target a specific persona or cohort, or send to everyone in the workspace.
- **Attachments and modes.** Attach files to your prompt. Switch between chat (conversation), feedback, debate, and questionnaire modes so the same workspace can do free-form chat or structured reports.
- **Reports in the conversation.** When you pick a report mode (feedback, debate, questionnaire), the app starts the report in the background. The thread shows a placeholder until the report is ready, then the full result appears inline with a dedicated layout for that report type.
- **Multiple workspaces.** Create, switch, rename, and delete workspaces. Each keeps its own conversation history and membership. You can fork a workspace to copy it and continue from the same point elsewhere.
- **Workspace membership filters.** When adding personas or cohorts to a workspace you can filter by age, location, relationship status, and other attributes so the conversation is aimed at the audience you care about.
- **CLI and app in sync.** The CLI (chat, report generate, workspace and persona commands) now uses the same workspaces, personas, and reports as the web app. Data is shared so you can mix CLI and browser use.
- **Simulations.** Run multi-step scenarios with a cohort: set a core issue and initial world variables, optionally add interventions (e.g. announcements) at specific steps, and inspect or branch the run to test policy, opinion, or other what-if outcomes.

### Changed

- **How workspaces decide who answers.** Workspaces no longer use a single "type" flag. Instead each workspace has a list of personas and cohorts attached to it. That list is what drives who responds in chat and reports. If you had a database with a workspace `type` column, see the migration note in the docs; the app no longer reads or writes it.

### Docs

- Migration note for the move from workspace type to persona and cohort membership (including optional database column drop).
- Data layout and contributing docs updated for the current structure.

### Removed

- Sample debate files and committed build/editor config that no longer belong in the repo. Repository ignore rules updated so generated and editor files stay untracked.

## [0.1.0] - 2026-03-15

Release of Mass, a CLI-based AI-powered social simulation platform. 