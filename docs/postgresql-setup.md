# PostgreSQL setup

The application uses PostgreSQL through Prisma. For Prisma Postgres, use two connection strings:

- `DATABASE_URL`: pooled endpoint for Next.js runtime queries, using host `pooled.db.prisma.io` and database path `/postgres`.
- `DIRECT_URL`: direct endpoint for Prisma migrations and administration, using host `db.prisma.io` and database path `/postgres`.

Set both variables in local `.env` and in the Vercel project environments used for builds and deployments. Keep the generated credentials private. The local `.env` is not committed.

Run schema changes with `npx prisma migrate dev --name <change>` during development and `npx prisma migrate deploy` for deployment. The initial PostgreSQL schema is recorded under `prisma/migrations/20261002120000_init`.

Prisma Postgres provides the database named `postgres` in its generated connection strings. The project/store name does not need to match the database name; use a separate database resource in Prisma Console if a separate database is needed.

Application order and abandoned-checkout realtime uses a five-second PostgreSQL polling feed because MongoDB Change Streams are no longer available.
