---
name: pgvector setup
description: The DB schema uses the vector type for embeddings; pgvector extension must be enabled before schema push
---

# Rule
Before running `pnpm --filter @workspace/db run push`, ensure the pgvector extension is installed in Postgres.

**Why:** The DB schema uses `vector` columns for embedding storage. Without the extension, drizzle-kit push fails with "type vector does not exist".

**How to apply:** Run `CREATE EXTENSION IF NOT EXISTS vector;` via executeSql in code_execution before the first schema push on any new database.
