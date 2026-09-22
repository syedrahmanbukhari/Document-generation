# Tenant Resource Document Center

React + Vite website for two guided legal self-help document flows:

- Document #1 — Motion to Dismiss / Quash (page 1)
- Document #2 — Relief and Certificate of Service (page 2)

## Implemented

- Distinct document-selection landing page inspired by the supplied reference without copying it.
- Separate questionnaires, each numbered 1–8 and validated independently.
- Document #1 asks for court type, county, plaintiff, defendant, case number, full legal name, property address, and service details.
- Document #2 asks for full legal name, mailing address, phone, email, document date, delivery method, recipient name, and recipient address. Additional delivery details appear when "Other" is selected.
- Full legal name and date are reused throughout the PDF without exposing internal template references in the questionnaire.
- Optional "mailing address same as property address" helper.
- Delivery-method choices: Hand delivery / U.S. Mail / Other.
- Client-side PDF generation with jsPDF.
- Each document option downloads only its own part of the supplied template. The first contains the motion; the second contains the requested relief and certificate of service, with no leading blank page. Either questionnaire can be completed independently.
- Reference markers 1–8 map to court type, county, plaintiff, defendant, case number, full legal name, property address, and service circumstances. Red annotations and placeholder brackets are omitted for completed answers.
- Long answers wrap and continue onto additional pages with automatic page numbering.
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
