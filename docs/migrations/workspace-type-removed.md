# Workspace type removed

Workspace behaviour is now driven by **persona and cohort membership** on the conversation (`conversation.persona_ids`, `conversation.cohort_ids`) instead of a workspace `type` field.

## Application changes (done)

- `Workspace` type and GraphQL no longer include `type` or `WorkspaceTypes`.
- Workspace creation, update, fork, and list no longer read or write `type`.
- Chat and CLI use workspace membership (and optional CLI flags) to resolve target personas.

## Database migration (if you use Postgres/Supabase)

If your `workspaces` table has a `type` column (e.g. from an older schema), you can:

1. **Leave the column in place**  
   The app no longer reads or writes it. Existing rows keep their values; new/updated rows will not set `type`. You can drop the column later when convenient.

2. **Drop the column**  
   When ready, run:

   ```sql
   ALTER TABLE workspaces DROP COLUMN IF EXISTS type;
   ```

If the column is `NOT NULL` and has no default, dropping it is required before inserts that omit `type` (the app now omits it). If you see insert errors, add a default or drop the column as above.
