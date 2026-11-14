# TeamSync Notices and Attributions

**Document status:** Initial draft for review. The dependency list below is a preliminary inventory, not a complete legal or software-composition review. Have this notice reviewed by a qualified intellectual property lawyer in India before formal commercial use.

## TeamSync proprietary ownership notice

Copyright (c) [CURRENT COPYRIGHT YEAR] [LEGAL COPYRIGHT OWNER]. All rights reserved in original TeamSync materials to the extent the designated owner holds or has validly acquired those rights. No general license to original TeamSync materials is granted by this notice. See [LICENSE](LICENSE) and [COPYRIGHT.md](COPYRIGHT.md).

TeamSync's proprietary notice does not apply to third-party components and does not override their licenses or applicable law.

## Third-party software license inventory

The following identifiers were read from locally installed package metadata for direct dependencies declared by `backend/package.json` and `frontend/package.json` on 2026-11-14. This is a point-in-time preliminary inventory, not independent legal verification and not an inventory of transitive packages, bundled code, or complete copyright notices.

| Project area | Declared direct package(s) | License identifier in installed package metadata |
|---|---|---|
| Backend runtime | `bcrypt`, `cookie-parser`, `cors`, `express`, `helmet`, `jsonwebtoken`, `mongoose`, `zod` | MIT |
| Backend runtime | `dotenv` | BSD-2-Clause |
| Backend development | `nodemon` | MIT |
| Frontend runtime | `@tailwindcss/vite`, `@tanstack/react-query`, `axios`, `react`, `react-dom`, `react-router-dom`, `tailwindcss`, `zustand` | MIT |
| Frontend runtime | `lucide-react` | ISC |
| Frontend development | `@eslint/js`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `vite` | MIT |

Package names and SPDX-style identifiers are included for identification only. Retain the applicable package copyright and license notices when distributing those packages, and consult each package's full license text and notices for the exact obligations. Transitive dependency licenses and notice text have not been inventoried here.

## External assets and other attributions

The repository includes frontend visual assets and starter-template files. Their provenance and license/permission status have not been independently verified for this notice. Verify each asset's source, owner, and usage terms before commercial distribution, and add verified attribution here where required. No third-party attribution is invented in this document.

## Maintenance

When adding or changing a dependency or external asset, verify its actual license and required notices, preserve upstream notices, and update this inventory. A package's metadata alone may be incomplete; review the distributed license files and relevant bundled materials.
