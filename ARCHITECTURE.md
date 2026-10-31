# Architecture Notes

## Wizard pattern
The app uses a single parent wizard (`App.jsx`) so values survive when a step changes. `getVisibleSteps()` recalculates the step sequence from loan type and amount, avoiding a hard-coded assumption that every applicant needs the co-applicant step.

## Validation flow
`validateStep()` validates only the current step when Continue is clicked. Error messages are rendered adjacent to fields and use `role="alert"`. For final submission, the final-step consents and EMI affordability check are evaluated again.

## Draft flow
`useAutoSave()` waits for 30 seconds of inactivity and writes an AES-GCM encrypted draft to LocalStorage. The payload has a version, timestamp, loan type and step. On load, the app checks for a draft within 72 hours and offers Resume or Start fresh.

## Conditional requirements
- Co-applicant: every Home Loan; Personal Loan amount > ₹5,00,000; Business Loan amount > ₹20,00,000.
- Employment: salaried fields vs self-employed/business owner fields.
- Documents: requirements are derived from loan type and employment type.
- EMI: indicative annual rate is 10.5% Personal, 8.5% Home, 14% Business.

## Production cautions
This is a frontend-only simulation. Client-side validation can be bypassed; identity checks, consent records, upload scanning, application persistence, authorization and lending decisions must be enforced by trusted backend services in a real application.
