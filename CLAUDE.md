# Bloom Backend

NestJS/TypeScript REST API for a trauma-healing support platform. PostgreSQL via TypeORM, deployed on Render.

## Tech Stack

- **Runtime:** Node.js 22.x, TypeScript
- **Framework:** NestJS
- **Database:** PostgreSQL 17 + TypeORM 0.3.x
- **Package manager:** Yarn 1.x
- **Tests:** Jest (unit `*.spec.ts`, e2e in `test/`)

## Development

```bash
# Start (Docker recommended)
docker-compose up

# Or manually
yarn
yarn start:dev          # hot reload on localhost:35001

# Lint / format
yarn lint
yarn format
```

## Testing

```bash
yarn test                          # unit tests
yarn test:watch                    # watch mode
yarn test:cov                      # with coverage
yarn test:e2e                      # end-to-end

# Run a specific test file
yarn jest src/path/to/file.spec.ts --no-coverage
```

## Database / Migrations

```bash
yarn migration:generate            # generate migration from entity changes
yarn migration:run                 # apply pending migrations
yarn migration:revert              # revert last migration
yarn migration:show                # show migration status
```

Entities live in `src/entities/`. Migrations in `src/migrations/`.

## Project Structure

```
src/
  auth/                  authentication
  user/                  user management
  partner/               partner orgs + access control
  course/                courses & user progress
  session/               therapy sessions & feedback
  resource/              learning resources
  subscription/          subscription management
  reporting/             analytics & Slack reporting
  webhooks/              inbound webhooks (Slack, Zapier, Mailchimp, SimplyBook)
  api/                   outbound API clients (GA4, Mailchimp, SimplyBook, Slack, Zapier)
  event-logger/          event tracking
  firebase/              Firebase integration
  front-chat/            Front (chat) integration
  entities/              TypeORM entity definitions
  migrations/            TypeORM migration files
  utils/                 shared utilities
  main.ts                app entry point
  typeorm.config.ts      DB connection config
```

## Key Integrations

Firebase (auth), Storyblok (CMS), SimplyBook (appointments), Mailchimp (email), Slack, Front (chat/support), GA4, Rollbar (errors), New Relic (APM), Render (hosting)

## CI

GitHub Actions (`.github/workflows/.ci.yml`): Prettier → ESLint → Jest → build. Runs on PRs and pushes to `develop`.

## Branch Strategy

- `develop` — main integration branch; open PRs against this
- `main` — production
