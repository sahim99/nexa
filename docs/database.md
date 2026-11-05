# Database schema

The canonical Prisma schema is `packages/database/prisma/schema.prisma`.

`DatabaseService` in `@nexa/database` constructs `PrismaClient` from that package. Agent tasks, execution plans, approvals, audit events, and memory records are defined there. Generate the client with:

```bash
npm run db:generate --workspace=@nexa/database
```

Apply it with:

```bash
npm run db:push --workspace=@nexa/database
```

Do not pass `--accept-data-loss`. `scripts/run-docker.sh` pushes this schema without that flag.

`apps/api/prisma/schema.prisma` is an older stub (User, Agent, a Task without budget, MemoryRecord). The API runtime does not use it. Do not `db push` that file over a database created from the canonical schema.

There is no Job or UserProfile model in the canonical schema. Collected jobs and the settings profile are stored in API process memory and disappear on restart.
