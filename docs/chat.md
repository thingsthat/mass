# Chat

Chat lets you talk to a single persona so you can test how they respond in character. You can run one-off messages or an interactive session, and optionally attach the conversation to a workspace so you can continue the thread later.

## Requirements

- A **persona ID**. Get one from `mass persona list` or `mass persona list -c <cohort-id>`.

## Commands

**Interactive (TTY):**

```bash
mass chat -p <persona-id>
```

You get a prompt; type your message and press Enter. The persona replies. Repeat. Exit with your shell's EOF (e.g. Ctrl+D) or by ending the process.

**One-off message:**

```bash
mass chat -p <persona-id> -m "Your message here"
```

The persona replies once; output is printed and the process exits.

**Continue in a workspace:**

```bash
mass chat -w <workspace-id> -p <persona-id>
```

Or with a one-off message:

```bash
mass chat -w <workspace-id> -p <persona-id> -m "Your message here"
```

All messages in that workspace are sent as context to the LLM, so the persona sees the full thread.

**Stdin (non-TTY):**

If you do not pass `-m` and stdin is not a TTY (e.g. you pipe input), the first line or block of stdin is read as the message and the persona replies once.

## Workspace behaviour

- If you **do not** pass `-w`, the CLI creates a new workspace for the conversation and prints its ID after the first exchange, for example:

  ```
  Workspace ID (save for later): <workspace-id>
  ```

  Use that ID with `-w` next time to continue the same thread.

- If you **do** pass `-w`, the conversation is appended to that workspace. The persona receives the full message history for context.

## Options summary

| Option | Description |
|--------|-------------|
| `-p, --persona <id>` | (Required.) Persona ID to chat with. |
| `-w, --workspace <id>` | Workspace ID. If omitted, a new workspace is created and its ID printed. |
| `-m, --message <text>` | Message to send. If omitted and stdin is a TTY, interactive mode; otherwise stdin is read as the message. |

## Global option

- **`-d, --data-dir <path>`** – Data directory for personas and workspaces (default: `data`). Same as setting `MASS_DATA_DIR`.

## Example: one-off probe, then continue in a workspace

Send a single message to see how the persona responds; the CLI creates a workspace and prints its ID after the first exchange:

```bash
mass chat -p <persona-id> -m "How do you usually decide which bank or current account to use?"
```

Copy the printed workspace ID. Ask a follow-up that refers to their answer (the full thread is sent as context):

```bash
mass chat -w <workspace-id> -p <persona-id> -m "You mentioned X. Would you switch for that alone?"
```

Or run without `-m` for interactive mode: type messages in turn, exit with Ctrl+D. For a full interview-style flow and when to fork a workspace, see [Examples: deep persona interview](examples/persona-interview.md).

## Next steps

- [Examples](examples.md): in-depth walkthroughs (persona interview, product feedback).
- [Workspaces](workspaces.md): list, rename, delete, fork.
- [Testing personas](testing-personas.md): how to test personas with chat and reports.
