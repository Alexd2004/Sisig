# Sisig Documentation

This is the index of the developer docs for the Sisig Eh! rewards app monorepo. Start with [LOCAL-DEVELOPMENT.md](./LOCAL-DEVELOPMENT.md) if you are setting up a Mac for the first time, then read [CONTRIBUTING.md](../CONTRIBUTING.md) before your first pull request.

## All Docs

| Doc | What it covers | Who it's for |
|---|---|---|
| [README.md](../README.md) | Repo front page: what is in the repo, quick start, repo map, key commands, known issues | Everyone |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Branch names, commit messages, the PR process, required checks, database changes, data layer rules, releases | Everyone who opens a pull request |
| [docs/LOCAL-DEVELOPMENT.md](./LOCAL-DEVELOPMENT.md) | Mac setup from a clean clone: JDK 17, Android SDK, emulator, dev client, hosted Supabase; the daily routine; troubleshooting | New developers; anyone running the app |
| [docs/ARCHITECTURE.md](./ARCHITECTURE.md) | System design: database, navigation, theme and data layer, and the decisions behind them | Developers changing how parts fit together; reviewers |
| [docs/SUPABASE.md](./SUPABASE.md) | The hosted Supabase dev project: CLI login and link, applying migrations with `supabase db push`, destructive migrations | Anyone who changes the database or applies migrations |
| [docs/DEVOPS-02-CI.md](./DEVOPS-02-CI.md) | The GitHub Actions workflows: triggers, jobs, steps, caches, branch protection, CI failures | Anyone whose PR fails CI; repo admins |
| [supabase/README.md](../supabase/README.md) | The local Supabase stack: `db:*` commands, folder layout, schema, migrations, generated types, tests, Edge Functions | Developers working on the database |
| [supabase/CONVENTIONS.md](../supabase/CONVENTIONS.md) | Rules for migrations, naming, schemas, policies, `SECURITY DEFINER` functions, Edge Functions and database tests | Database authors and reviewers |
| [apps/mobile/README.md](../apps/mobile/README.md) | The Expo mobile app: folder structure, routing, scripts, tests | Mobile developers |
| [packages/claude/README.md](../packages/claude/README.md) | The `@sisig/claude` package: setup, API reference, usage | Developers using the Claude integration |
| [CLAUDE_SKILLS.md](../CLAUDE_SKILLS.md) | The Claude-powered features in the app and packages | Developers working on AI features |

## PDF Versions

PDF copies of the docs live in [docs/pdf/](./pdf/):

| File | Contents |
|---|---|
| `Sisig-Developer-Handbook.pdf` | All of the guides above in one file, with a table of contents |
| `SUPABASE.pdf` | docs/SUPABASE.md |
| `ARCHITECTURE.pdf` | docs/ARCHITECTURE.md |
| `LOCAL-DEVELOPMENT.pdf` | docs/LOCAL-DEVELOPMENT.md |
| `DEVOPS-02-CI.pdf` | docs/DEVOPS-02-CI.md |
| `CONTRIBUTING.pdf` | CONTRIBUTING.md |

The Markdown files are the source of truth. The PDFs are generated from them by `scripts/docs-pdf.mjs`:

```bash
pnpm docs:pdf
```

The script needs Google Chrome (or Chromium) installed and network access, because it loads the Markdown and Mermaid renderers from jsDelivr. Set `CHROME_PATH` if your browser is not in a standard location. To check that every diagram renders without writing any PDFs:

```bash
pnpm docs:pdf --check
```

When a PR changes a doc, regenerate the PDFs in the same PR so they never drift from the Markdown.

## Keeping Docs Current

Pull requests are squash merged. The squash commit on `main` keeps the PR title (or the commit title, for a single-commit PR) and the messages of the PR's commits. The PR description is not kept. Anything decided in a PR description or review thread is lost from the history unless someone writes it down.

So write rules and decisions into these docs, in the same PR that makes them:

- A new rule or convention goes into the doc that owns the topic (see the table above).
- A decision with a reason ("we drop the legacy tables instead of migrating them") goes into the doc or into the migration or code comment next to the change.
- A doc that no longer matches the code is a bug. Fix it in the PR that changes the code.
