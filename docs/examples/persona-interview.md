# Deep persona interview

Run a structured interview with one persona: start with a probing question, then continue in a workspace with follow-up questions. Use the same workspace to keep context, or fork at a message to try a different line of questioning without losing the original thread.

## Scenario

You want to understand how one specific persona thinks about a topic (e.g. switching banks, remote work, or a product category). You will send an opening question, then ask follow-ups that refer to what they said. If you want to explore an alternative angle, you fork the workspace at a message and branch the conversation.

## Step 1: One-off opening question

Start with a single message to see how the persona responds. This gives you a first answer and creates a workspace so you can continue later.

```bash
mass chat -p 28ff0d93-e6e5-435f-b930-77c2c5031c07 -m "How do you usually decide which bank or current account to use? What matters most to you?"
```

**What you see:** The persona replies. After the exchange, the CLI prints a line like:

```
Workspace ID (save for later): <workspace-id>
```

Copy that workspace ID. You will use it in the next step so the persona sees this message and their own reply when you send follow-ups.

**Why one-off first:** You get a clear, single-turn response. If you went straight into interactive mode, you could still continue, but having the workspace ID printed once makes it easy to paste into the next command.

---

## Step 2: Continue in the same workspace

Ask a follow-up that builds on what they said. Pass the workspace ID with `-w` so the full thread is sent as context to the LLM.

```bash
mass chat -w <workspace-id> -p 28ff0d93-e6e5-435f-b930-77c2c5031c07 -m "You mentioned X. Would you switch for that alone, or would you need more than one benefit?"
```

Replace `<workspace-id>` with the value from step 1. Replace "X" with something they actually said (e.g. "fees" or "app quality").

**What you see:** The persona replies with the full conversation in context. They can refer back to their earlier answer. You can repeat this as many times as you like: same `-w` and `-p`, new `-m` each time.

**Interactive mode:** If you prefer to type follow-ups one by one instead of passing `-m`, run:

```bash
mass chat -w <workspace-id> -p 28ff0d93-e6e5-435f-b930-77c2c5031c07
```

You get a prompt; type your message and press Enter. The persona replies. Repeat. Exit with Ctrl+D or by ending the process. The workspace is updated with each exchange.

---

## Step 3: Fork the conversation to try another angle

Sometimes you want to explore a different line of questioning without losing the original thread. Fork the workspace at a specific message: the new workspace contains the conversation up to and including that message, and you can then diverge.

You need the message ID to fork at. Workspace data is stored under the data root (e.g. `data/workspaces/<workspace-id>.json`). Open that JSON file and find the `messages` array; each message has an `id`. Use one of those IDs.

```bash
mass workspace fork <workspace-id> -m <message-id>
```

The CLI creates a new workspace and prints its ID. Use that new ID with `mass chat -w <new-workspace-id> -p 28ff0d93-e6e5-435f-b930-77c2c5031c07` to continue from that point with a different question. The original workspace is unchanged.

**When to fork:** Use it when you want to ask "What if I had asked this instead?" without losing the original branch. For example, after three exchanges you fork at message two and ask a more provocative follow-up in the new workspace.

---

## Step 4: List and manage workspaces

To see all workspaces (id, name, description, created_at):

```bash
mass workspace list
```

To rename a workspace so you can recognise it later:

```bash
mass workspace rename <workspace-id> "Banking interview - Persona X"
```

To delete a workspace you no longer need:

```bash
mass workspace delete <workspace-id>
```

---

## Summary

| Step | Command |
|------|--------|
| Opening question (creates workspace) | `mass chat -p <persona-id> -m "How do you...?"` |
| Follow-up (same thread) | `mass chat -w <workspace-id> -p <persona-id> -m "You mentioned X. Would you...?"` |
| Interactive follow-up | `mass chat -w <workspace-id> -p <persona-id>` |
| Fork at message | `mass workspace fork <workspace-id> -m <message-id>` |
| List workspaces | `mass workspace list` |

Next: [Product feedback](product-feedback.md) (cohort + report + chat), or [Debate report](debate-report.md) for polarising topics.
