# Security Policy

## Supported Versions

This project supports security fixes for the latest released version and the current `main` branch.

| Version        | Supported |
| -------------- | --------- |
| Latest release | Yes       |
| `main`         | Yes       |
| Older releases | No        |

## Reporting a Vulnerability

Do not report security issues in public GitHub issues, discussions, or pull requests.

Use GitHub's private vulnerability reporting for this repository if it is enabled.
In the repository UI, open the `Security` tab and use `Report a vulnerability`.

If private reporting is not available yet, contact the maintainer privately before disclosing details publicly. Include:

- A short description of the issue and affected component.
- The version, commit, or container tag you tested.
- Reproduction steps or a proof of concept.
- Expected impact, including whether credentials, message contents, or proxy controls are involved.

You should expect an initial response within 5 business days for acknowledged reports.

## Scope

Please report issues that could affect:

- Proxy allowlist enforcement and request routing.
- Authentication token handling.
- Exposure of message content, attachments, or local profile data.
- Container or server misconfiguration that weakens expected defaults.
