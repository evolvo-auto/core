# compose

Local Docker Compose assets for Evolvo development.

Current stack:

- `postgres`
- `adminer`

Environment source:

- create a root `.env` file from `.env.example`
- the compose scripts explicitly read from that root `.env`

Use the root package scripts to operate the stack:

- `pnpm services:validate`
- `pnpm services:up`
- `pnpm services:ps`
- `pnpm services:logs`
- `pnpm services:down`

Default local endpoints:

- Postgres: `postgresql://evolvo:evolvo@localhost:5432/evolvo`
- Adminer: `http://localhost:8080`
