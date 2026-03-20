# Workspaces

Workspaces store conversation state (messages). They are used by [chat](chat.md) so you can continue a thread with a persona, and by [report](reports.md) generation so the prompt and report context are stored in one place.

## When workspaces are created

- **Chat:** If you run `mass chat -p <persona-id>` without `-w`, a new workspace is created and its ID is printed after the first exchange. Use that ID with `-w` next time to continue the conversation.
- **Report generate:** If you run `mass report generate` without `-w`, a new workspace is created for that run. You can pass `-w <workspace-id>` to attach the report to an existing workspace instead.

## Commands

**List workspaces:**

```bash
mass workspace list
```

Shows id, name, description, and created_at.

**Delete a workspace:**

```bash
mass workspace delete <id>
```

**Rename a workspace:**

```bash
mass workspace rename <id> <name>
```

**Fork a workspace at a message:**

```bash
mass workspace fork <workspace-id> -m <message-id>
```

Creates a new workspace whose conversation is the same as the original up to and including the given message. Useful to branch a conversation (e.g. try a different reply path without losing the original).

## Next steps

- [Chat](chat.md): using workspaces to continue a conversation.
- [Reports](reports.md): attaching reports to a workspace with `-w`.
