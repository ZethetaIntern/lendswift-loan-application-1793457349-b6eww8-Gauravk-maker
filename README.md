# LendSwift — Multi-Step Loan Application

A React/Vite frontend simulation for the Front-End Developer internship brief. It demonstrates an 8-step wizard, conditional loan paths, validation, mock KYC verification, document previews, image compression, drawn signature, indicative EMI calculation, consent checks, and encrypted local draft persistence.

## Run locally

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`).

## Build and test

```bash
npm run build
npm run test:e2e
```

For Cypress, start the dev server in one terminal (`npm run dev`) and run `npm run test:e2e` in another. `npm run test:e2e:open` opens the Cypress UI.

## Architecture

- `src/App.jsx`: wizard orchestration, step navigation, step validation, draft restore, uploads and submission simulation.
- `src/components/steps/StepFields.jsx`: field UI for steps 1–8.
- `src/components/common/Field.jsx`: reusable accessible labelled input.
- `src/components/common/SignaturePad.jsx`: pointer/touch signature canvas.
- `src/hooks/useAutoSave.js`: debounced auto-save hook.
- `src/utils/encryption.js`: AES-GCM encryption/decryption for local drafts.
- `src/utils/loan.js`: loan limits, EMI, PAN/Aadhaar format/checksum, co-applicant rules and document requirements.
- `cypress/e2e/loan-wizard.cy.js`: starter end-to-end tests.

## Implemented demo behaviours

- Personal/Home/Business loan options and loan-specific amount/tenure ranges.
- Step-specific required field checks and conditional employment/document fields.
- Simulated PAN/Aadhaar verification with a 1.5-second delay.
- Sample PIN lookup entries for a few PIN codes; unknown codes require manual entry.
- Conditional co-applicant step.
- PDF/image file type and size checks, image resizing/compression, preview and removal.
- Pointer/touch signature captured as a PNG data URL.
- Indicative EMI, total interest and capped processing fee calculation.
- Four independent final consents and a simulated reference number.
- Encrypted browser-local draft saved after a 30-second quiet period, with a 72-hour resume window.

## Important limitations — complete before internship submission

This is a starter implementation, not a production lending platform or a claim of full compliance. Before submission, finish and verify every item in the PDF:

1. Add all 50+ fields and robust Zod schemas per step; use React Hook Form with resolver (dependencies are installed but this starter's form state is currently orchestrated in React state).
2. Complete 100+ Indian PIN records and validate PIN-derived state; add address autocomplete.
3. Add upload counts, drag/drop, persistence-safe file recovery, progress UI, and validate each required document against backend storage. Browser object URLs cannot survive a reload.
4. Replace demo passphrase encryption with a user/session-specific key and server-side secure storage for any real PII. A hardcoded client-side passphrase is not secure against a determined user.
5. Complete all 15+ E2E user journeys, unit tests, axe-core checks, keyboard/screen-reader testing and Lighthouse audits.
6. Implement true OTP/email mock flows, cross-step age/tenure dependency, spouse defaults, co-applicant validation and all PDF edge cases.
7. Add the terms PDF, cooling-off disclosure, grievance officer details and Key Fact Statement content required by the brief.
8. Run ESLint using the requested Airbnb rules and document any deliberate deviations.

Never use real PAN/Aadhaar, bank statements, signatures or other sensitive personal data in this demo. The mock verification does not verify identity and the application does not make a lending decision.

## 15-day plan from the brief

- Days 1–5: project foundation, reusable fields, steps 1–4 and PIN lookup.
- Days 6–10: employment/co-applicant logic, encrypted auto-save, document upload, signature and review summary.
- Days 11–15: 15+ E2E journeys, accessibility, responsive polish, README, screenshots and deployment.
