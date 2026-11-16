# Contributing to TeamSync

**Document status:** Initial draft for review; not a lawyer-reviewed agreement. Have contributor terms reviewed by a qualified intellectual property lawyer in India before formal commercial use.

TeamSync is intended to be proprietary commercial software. Repository access or an invitation to contribute does not grant a general right to reuse or redistribute TeamSync materials.

## Prerequisites and local setup

- Node.js and npm. The package manifests do not pin a supported Node.js version; use a version compatible with the installed dependencies.
- MongoDB. Auth and transaction integration tests require a disposable replica-set-capable database.
- Git.

Install and run the backend from `backend/`:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Set the required `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `CSRF_SECRET` in the ignored local `.env`. Never include their values in an issue or pull request. The backend has no `test` npm script; after confirming a disposable test database in `MONGO_URI`, run:

```powershell
node --test tests/integration/*.test.js
```

Install and check the frontend from `frontend/`:

```powershell
npm ci
npm run lint
npm run build
```

The frontend is currently a starter and is not integrated with backend authentication or API workflows.

## Approval and workflow

1. Discuss the proposed change with the project maintainer and obtain approval for its scope before starting substantial work.
2. Work from an up-to-date `main` branch on a focused branch, such as `feature/<short-description>`, `fix/<short-description>`, or `docs/<short-description>`. Do not push directly to `main`.
3. Open a pull request against `main`. Describe the problem, proposed behavior, affected modules, risks, exact tests run, documentation changes, and any dependency or data-model changes. Link the related issue or approval where applicable.
4. Respond to review feedback and obtain maintainer approval before merge. A pull request is not permission to merge or deploy.

These instructions describe the intended workflow only; branch protection and review rules are not asserted to be configured in GitHub.

Follow the [Code of Conduct](CODE_OF_CONDUCT.md). Use the repository's issue forms for public bug reports and feature proposals. Security vulnerabilities must use the private process in [SECURITY.md](SECURITY.md), not a public issue. For accessibility barriers, see [ACCESSIBILITY.md](ACCESSIBILITY.md).

## Code quality, testing, and security

- Follow the existing modular-monolith structure, naming, formatting, and error-handling conventions.
- Keep changes focused. Update directly affected documentation and avoid unrelated changes.
- Add or update tests for meaningful behavior, including negative paths. Report commands and results accurately; do not claim unrun tests passed.
- Review authentication, authorization, tenant isolation, input validation, logging, secret handling, and privacy impacts where relevant.
- Do not commit credentials, personal data, production data, private keys, or `.env` files.
- Request additional security review for changes that affect authentication, authorization, sessions, data isolation, file handling, or dependencies.
- Do not claim a security control, supported runtime, accessibility result, or test pass unless it is implemented or verified.

## Ownership and permission to contribute

Do not submit copied proprietary work, unlicensed third-party content, or material you do not have the right to contribute. Identify the origin and license of any external code, assets, fonts, or icons, and obtain approval before adding them.

Submitting a pull request does **not** by itself transfer copyright to the project owner. Before external contributions are accepted for commercial use, the project may require an appropriate written assignment or license agreement. Any such arrangement must be agreed to by the relevant parties in a valid written document; do not assume one exists unless it has been executed.

No contribution policy here grants contributors permission to copy, modify, redistribute, publish, sublicense, or commercially exploit other proprietary TeamSync materials. See [LICENSE](LICENSE), [COPYRIGHT.md](COPYRIGHT.md), and [NOTICE.md](NOTICE.md).

## Third-party dependencies and assets

Before proposing a dependency or external asset:

- Confirm its source, version, license, attribution, and redistribution obligations.
- Check compatibility with the intended commercial distribution and existing dependencies.
- Prefer maintained packages with clear license metadata; avoid adding dependencies without a concrete need.
- Preserve required license and copyright notices and update [NOTICE.md](NOTICE.md) when a verified dependency or attribution changes.
- Do not assume a package's top-level license field is a complete review of transitive dependencies or bundled assets.

The repository's preliminary direct-dependency license inventory is in [NOTICE.md](NOTICE.md); it is not a complete software bill of materials.
