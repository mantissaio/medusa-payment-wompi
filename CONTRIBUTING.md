# Contributing

Thanks for your interest in contributing to `@mantissaio/medusa-payment-wompi`.

## Setup

```bash
git clone git@github.com:mantissaio/medusa-payment-wompi.git
cd medusa-payment-wompi
pnpm install
```

## Development

```bash
pnpm dev     # watch mode
pnpm test    # run tests
pnpm build   # compile
```

## Testing with a Medusa project

Link the plugin locally from your Medusa project:

```bash
cd your-medusa-project
pnpm add ../medusa-payment-wompi
```

To test payments you need a [Wompi account](https://wompi.sv) with a business in development mode. In development mode, all transactions are simulated (use CVV `111` to simulate a rejected payment).

## Commit convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) and [semantic-release](https://github.com/semantic-release/semantic-release) for automated versioning.

```
feat: add tokenization support       -> minor release
fix: correct webhook hash validation  -> patch release
feat!: change WompiOptions schema     -> major release
docs: update README                   -> no release
chore: update dependencies            -> no release
```

## Pull requests

1. Fork the repo and create your branch from `develop`
2. Write tests for any new functionality
3. Make sure `pnpm test` and `pnpm build` pass
4. Use conventional commit messages
5. Open a PR against `develop`

## Project structure

```
src/
  types/          # TypeScript types matching Wompi swagger DTOs
  lib/            # WompiClient HTTP client (OAuth, endpoints)
  providers/      # Payment provider (AbstractPaymentProvider)
  api/            # Store API routes
  workflows/      # Medusa workflows and steps
```

## Reporting bugs

Use [GitHub Issues](https://github.com/mantissaio/medusa-payment-wompi/issues) with the bug report template. Include your Medusa version, Node version, and steps to reproduce.

## Questions

Open a [discussion](https://github.com/mantissaio/medusa-payment-wompi/discussions) or reach out at mantissa.io.
