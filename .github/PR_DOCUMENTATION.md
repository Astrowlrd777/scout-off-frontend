# Pull Request Documentation

This document explains the ScoutOff frontend PR expectations and the information reviewers need.
Use `.github/PULL_REQUEST_TEMPLATE.md` for every PR, and update this guide if the process changes.

## What to Include in Every PR

### Summary

- Provide a concise overview of what changed and why.
- Mention the user problem, bug, feature, or documentation update.
- Keep it short and clear.

### Related Issue

- Reference the issue number, e.g. `Fixes #123` or `Refs #123`.
- If there is no issue, explain the motivation and why this work is needed.

### Testing

- Describe the manual and automated validation performed.
- Include commands run locally and any environment setup.
- Examples:
  - `npm run lint`
  - `npm run test`
  - `node scripts/validate-env.js`
  - `cd ../scout-off-contracts && cargo test`

### Checklist

- [ ] I followed the repository contribution guidelines in `CONTRIBUTING.md`
- [ ] My code is formatted and linted
- [ ] New or updated tests are included where applicable
- [ ] All tests pass locally
- [ ] Environment validation passes
- [ ] No secrets, credentials, or private keys are included
- [ ] Documentation is updated if needed

### Notes for Reviewers

- Mention any important context or tradeoffs.
- Call out UI changes, contract integration impacts, or edge cases.
- Add links to screenshots, designs, or relevant test stories.
- Note follow-up work if the PR is intentionally partial.

## PR Quality Guidelines

- Keep PRs small and focused where possible.
- Prefer one primary change per PR.
- If a PR touches multiple areas, clearly explain the scope and reasoning.
- Avoid large refactors without a supporting issue or design note.

## Review Expectations

### Code Review

- Confirm the implementation matches the summary.
- Check that tests and lints were run.
- Verify no security-sensitive values or secrets are added.
- Validate that the PR includes documentation updates when behavior changes.

### Documentation

- Update `README.md`, `CONTRIBUTING.md`, or other docs for new features.
- Add missing environment variables to `.env.example` when source code requires them.
- Document any new contract calls, public APIs, or UX flows.

### Contracts and On-Chain Integration

- For smart contract integration, include contract IDs, network notes, or testnet setup steps if relevant.
- Verify that `node scripts/validate-env.js` passes and that the frontend code matches the contract ABI or flow.
- When backend/API or contract changes are required, note the repo or service impacted.

## Branch and Label Guidance

- Use a descriptive branch name, such as `feat/player-profile-ipfs-upload` or `fix/validator-approval-modal`.
- Avoid generic branch names like `feature`, `bugfix`, or `temp`.
- Add PR labels when available: `feature`, `bug`, `docs`, `test`, `chore`, `security`.

## When to Update This Guide

Update this document whenever the PR workflow changes, the template is revised, or the repository adds new validation steps.
