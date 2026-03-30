# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in this plugin, please report it 
responsibly by emailing **security@mantissa.io** or **contact@galdoway.sh**.
Please do **not** open a public GitHub issue for security vulnerabilities.
You can expect:
- Acknowledgment within 48 hours
- A fix or mitigation plan within 7 days for critical issues
- Credit in the release notes (unless you prefer anonymity)

## Scope
This plugin handles:
- OAuth 2.0 tokens for the Wompi API (cached in memory, not persisted)
- HMAC-SHA256 webhook signature validation
- Payment session data (stored in Medusa's database)
It does **not** handle or store credit card numbers, CVVs, or any PCI-sensitive 
data - all card processing happens on Wompi's hosted payment page.
