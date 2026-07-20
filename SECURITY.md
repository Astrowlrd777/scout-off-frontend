# Security Policy

## Our Commitment

ScoutOff is committed to ensuring the security of our platform and protecting the data of our players, scouts, validators, and administrators. We take security vulnerabilities seriously and appreciate the efforts of security researchers who help us maintain a safe platform.

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities through one of the following channels:

### GitHub Security Advisory (Preferred)

1. Go to [Security Advisories](https://github.com/rahimatonize/scout-off-frontend/security/advisories/new)
2. Click "Report a vulnerability"
3. Provide a detailed description of the vulnerability

### What to Include

When reporting a vulnerability, please include:

- **Description**: A clear description of the vulnerability
- **Impact**: The potential impact and severity of the issue
- **Reproduction Steps**: Detailed steps to reproduce the vulnerability
- **Affected Components**: Which parts of the system are affected (frontend, smart contracts, backend API, etc.)
- **Suggested Fix**: If you have ideas on how to fix the issue (optional)
- **Your Contact Information**: So we can follow up with you (optional)

## Response Timeline

- **Initial Response**: Within 48 hours of receiving your report
- **Status Update**: We will provide regular updates on the status of your report
- **Resolution**: We aim to resolve critical vulnerabilities within 7 days, and other vulnerabilities within 30 days

## Disclosure Policy

- We follow coordinated vulnerability disclosure
- Please allow us reasonable time to investigate and remediate the issue before public disclosure
- We will credit researchers who responsibly disclose vulnerabilities (unless you prefer to remain anonymous)

## Scope

### In Scope

The following are within the scope of our security program:

- **Frontend Application**: All code in this repository
- **Smart Contracts**: Soroban contracts in the scout-off-contracts repository
- **Backend API**: Server-side endpoints and authentication flows
- **Wallet Integration**: SEP-10 authentication and transaction flows
- **IPFS Integration**: Media upload and storage mechanisms

### Security Concerns We Care About

- Authentication and authorization bypasses
- SQL injection or smart contract vulnerabilities
- Cross-site scripting (XSS) or cross-site request forgery (CSRF)
- Server-side request forgery (SSRF)
- Wallet private key exposure or transaction manipulation
- Unauthorized access to player, scout, or validator data
- Payment flow vulnerabilities affecting XLM transactions
- Denial of service vulnerabilities that could impact availability
- Data leakage or privacy violations

### Out of Scope

- Issues in third-party dependencies (please report these to the respective maintainers)
- Social engineering attacks
- Denial of service attacks requiring excessive resources
- Issues that require physical access to a user's device
- Issues affecting outdated browsers or unsupported platforms
- Rate limiting or anti-automation issues (unless they lead to data exposure)

## Security Best Practices

### For Users

- **Never share your wallet private keys or seed phrases** with anyone
- Use official wallet applications (Freighter, Albedo, LOBSTR)
- Verify transaction details before signing
- Keep your wallet software up to date
- Be cautious of phishing attempts

### For Developers

- Follow secure coding practices outlined in [CONTRIBUTING.md](CONTRIBUTING.md)
- Never commit secrets, API keys, or private keys to the repository
- Use environment variables for sensitive configuration
- Run security linters and tests before submitting PRs
- Keep dependencies up to date and monitor for vulnerabilities

## Security Features

ScoutOff implements several security measures:

- **Validator Authorization**: Restricts milestone writes to approved validators
- **Immutable Audit Trail**: All progress history and timestamps stored on-chain
- **Strict Authorization Checks**: Every state-changing action is verified
- **Safe Arithmetic**: Protects fee and subscription logic from overflow/underflow
- **Anti-Spam Gating**: Subscriptions and pay-to-contact fees prevent abuse
- **Circuit Breaker**: Admin can pause contract activity during incidents
- **Server-Side IPFS Proxy**: Keeps Pinata keys secure and off the client
- **SEP-10 Wallet Authentication**: Secure, challenge-based wallet login
- **Content Security Policy (CSP)**: Protects against XSS attacks
- **Input Sanitization**: All user inputs are sanitized using DOMPurify

## Hall of Fame

We would like to thank the following security researchers for responsibly disclosing vulnerabilities:

*No reports yet - be the first!*

---

Thank you for helping keep ScoutOff and our community safe!
