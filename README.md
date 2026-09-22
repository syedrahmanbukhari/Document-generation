# Tenant Resource Document Center

React + Vite website for two guided legal self-help document flows:

- Document #1 — Motion to Dismiss / Quash
- Document #2 — Motion to Dismiss

## Implemented

- Distinct document-selection landing page inspired by the supplied reference without copying it.
- Guided form for all 18 requested fields.
- Duplicate values are entered once and reused:
  - Full legal name -> questions 6, 10 and 18.
  - Date -> questions 9 and 17.
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
