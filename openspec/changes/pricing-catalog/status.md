status: proposed
change: pricing-catalog
artifact_store: openspec
strict_tdd: true

## SDD / testing configuration summary

- Schema: spec-driven
- Workflow: hybrid
- Review budget: 600 lines
- Required gates: RDD allow -> verify -> archive
- Test runner: pnpm test
- Validation runner: pnpm check
- Build runner: pnpm build
- Coverage expectation: 0 for this new planning change until implementation exists

## Current scope summary

This change is scoped to a local JSON pricing catalog, typed loaders, deterministic quote
calculations, migration of current hardcoded data, and visible source/image metadata.

## Explicit non-goals

No cloud DB, no scraping automation, no checkout/payment system, no automatic price refresh,
and no committing secrets.
