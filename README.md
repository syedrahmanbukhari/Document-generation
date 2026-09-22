# Tenant Resource Document Center

React + Vite website for two guided legal self-help document flows:

- Document #1 — Motion to Quash (one-page reference layout)
- Document #2 — Motion to Dismiss (motion and certificate in one two-page PDF)

## Implemented

- Distinct document-selection landing page inspired by the supplied reference without copying it.
- Each document card displays a $50.00 price.
- The required legal disclaimer appears prominently below the site header and again immediately above the final download action.
- Separate questionnaires, numbered 1–6 for Quash and 1–18 for Dismiss, validated independently.
- Quash asks for court type, county, plaintiff, defendant, case number, and first and last name. Its PDF follows the supplied two-column reference, including the procedural-rights notice. Annotation arrows and marker numbers are not printed.
- Dismiss covers the court and case details, service circumstances, document date, motion signature name, contact information, delivery method, recipient details, service date, and certificate signature name.
- Signature names and the service date are prefilled from the full legal name and document date, remain editable, and populate their respective locations. Additional delivery details appear when "Other" is selected.
- Optional "mailing address same as property address" helper.
- Delivery-method choices: Hand delivery / U.S. Mail / Other.
- Client-side PDF generation with jsPDF.
- Each option generates its own complete template. Dismiss includes both the motion and the requested relief/certificate of service. Either questionnaire can be completed independently.
- Long Dismiss answers wrap onto continuation pages rather than being cut off. Quash fields wrap within the reference layout; input that cannot fit the page produces a clear error instead of a clipped PDF.
- Responsive design suitable for Vercel deployment.
- No backend or database required for the current workflow.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Deploy the repository to Vercel as a standard Vite project. No special server configuration is required for this version.
