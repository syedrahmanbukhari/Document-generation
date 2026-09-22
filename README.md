# Tenant Resource Document Center

React + Vite website for two guided legal self-help document flows:

- Document #1 — Motion to Dismiss / Quash
- Document #2 — Motion to Dismiss

## Implemented

- Distinct document-selection landing page inspired by the supplied reference without copying it.
- Customer questionnaire numbered sequentially from 1–15, with additional delivery details when "Other" is selected.
- Full legal name and date are reused throughout the PDF without exposing internal template references in the questionnaire.
- Optional "mailing address same as property address" helper.
- Delivery-method choices: Hand delivery / U.S. Mail / Other.
- Client-side PDF generation with jsPDF.
- Both document options use the supplied improper-service motion, requesting dismissal or alternatively quashing service, followed by the existing relief and certificate of service.
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
