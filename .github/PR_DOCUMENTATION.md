# Pull Request Guide

This guide describes the ScoutOff frontend PR workflow and review expectations.
Use `.github/PULL_REQUEST_TEMPLATE.md` to add structured PR details and this guide for process clarity.

## Before opening a PR

- Sync your branch with `main`.
- Keep the PR focused and scoped to a single goal.
- Run local validation before creating a PR:
  - `npm install`
  - `npm run lint`
  - `npm run test`
  - `node scripts/validate-env.js`
- Add tests and documentation for new behavior.

## What to include

### Summary

- What changed?
- Why is this change needed?
- Keep it short, clear, and outcome-focused.

### Type

- `feat`, `fix`, `docs`, `test`, `chore`, or `refactor`

### Scope

- What is included in this PR?
- Does it affect frontend only, contracts, backend, or docs?

### Related issue

- Reference an issue: `Fixes #123` or `Refs #123`.
- If no issue exists, explain the motivation.

### Validation

Document how you validated the change locally.

Examples:

- `npm run lint`
- `npm run test`
- `node scripts/validate-env.js`
- `cd ../scout-off-contracts && cargo test`

### Review notes

- Highlight important context or tradeoffs.
- Mention UI changes, contract impact, or edge cases.
- Include screenshots or links when helpful.
- List follow-up tasks for partial work.

## Reviewer expectations

- Confirm the PR summary matches the code.
- Verify tests, linting, and environment validation were run.
- Ensure documentation is updated when behavior changes.
- Check that no secrets or credentials were added.
- Validate branch naming and PR scope.

## Branch naming and labels

- Use descriptive branch names:
  - `feat/player-profile-ipfs-upload`
  - `fix/validator-approval-modal`
  - `docs/update-readme`
- Avoid generic names:
  - `feature`, `bugfix`, `work`, `temp`
- Add labels when available: `feature`, `bug`, `docs`, `test`, `chore`, `security`.

## Smart contract or on-chain PRs

- Include contract IDs, network notes, and testnet assumptions if relevant.
- Confirm `node scripts/validate-env.js` passes.
- Document any ABI or workflow changes and the impacted repository.

## Docs-only PRs

- Keep docs-only PRs small and focused.
- Ensure content reflects current behavior.
- Use `docs/` branch prefix when appropriate.

## Guide updates

Update this document whenever the PR workflow changes or new validation steps are introduced.
