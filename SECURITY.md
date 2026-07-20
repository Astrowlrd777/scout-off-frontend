# Security Policy

ScoutOff handles wallet authentication, signs and submits real-value transactions, and proxies file uploads server-side — making security a top priority.

## Supported Versions

Only the **latest published release** of the frontend (this repository) receives security patches. Older versions should be upgraded promptly.

| Version | Supported          |
|---------|--------------------|
| latest  | ✅                |
| < latest| ❌                |

## Scope

| Component                        | In scope | Notes                                           |
|----------------------------------|----------|-------------------------------------------------|
| This frontend repository         | ✅       | Next.js app, API routes, components, config     |
| Smart-contract repository        | ❌       | Separate repo — report there directly           |
| Third-party services (Pinata,    | ❌       | Report to the respective vendor                 |
| Stellar RPC, Sentry, etc.)       |          |                                                 |

If you are unsure whether a vulnerability is in scope, report it anyway. We prefer over-reporting to a missed disclosure.

## Reporting a Vulnerability

### Preferred channel: GitHub Private Vulnerability Reporting

GitHub's built-in private vulnerability reporting is enabled for this repository:

➡ **https://github.com/scout-off/scout-off-frontend/security/advisories/new**

This creates a private advisory that is visible only to the repository maintainers and you. It allows for secure, tracked communication without exposing the issue publicly.

### Alternative channel

If you cannot use GitHub's private reporting for any reason, send an email to **security@scoutoff.app** with the following details:

- **Subject**: `[ScoutOff Security] <brief description>`
- **Description**: What the vulnerability is, where it occurs, and the potential impact
- **Steps to reproduce**: Minimal proof-of-concept or steps to trigger the issue
- **Environment**: Browser, OS, device details if applicable
- **Attachments**: Screenshots, logs, or HAR files (avoid sharing private keys or session tokens)

### What to expect

| Stage              | Expected time |
|--------------------|---------------|
| Acknowledgment     | Within **48 hours** of submission |
| Triage & assessment| Within **5 business days** |
| Fix & release      | Timelines vary by severity — critical issues are prioritised over general ones |
| Public disclosure  | Coordinated with you after a fix is released |

We will work with you to understand the impact, develop a fix, and coordinate a disclosure date. We ask that you do not disclose the vulnerability publicly until we have released a fix and given you the go-ahead.

## Hall of Fame

We maintain a private hall of fame for researchers who responsibly disclose valid security issues. If you would like public credit instead, we are happy to add your name to a publicly maintained list with your consent.

## Security.txt

This policy is also published in machine-readable format at `/.well-known/security.txt` (per [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116)).

## Additional resources

- [GitHub private vulnerability reporting docs](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities)
- [OWASP Cheat Sheet: Vulnerability Disclosure](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerability_Disclosure_Cheat_Sheet.html)
