# Tenant Resource Document Center

Motion to Quash has six questions and a one-page PDF. Motion to Dismiss has 18 questions and normally a two-page PDF. Each document costs **$50.00 USD**.

## PayPal HTML checkout and return page

Checkout uses the supplied PayPal HostedButtons integration, loaded once per page:

- Motion to Quash: `GHDTG49B6VS5N`
- Motion to Dismiss: `SZLCKPWK2ZUEL`

The public SDK client ID is included in `src/paypalHosted.js`. No SMTP, PayPal REST client secret, PDT token, or third-party database is used. Confirm in your PayPal account that both buttons charge **$50.00 USD**; the website's price label does not set PayPal's price.

Before displaying payment buttons, checkout saves only the selected document's answers in this browser's local storage. The request expires after 24 hours. Use the same browser on return. Each document has a separate saved request, with the latest checkout for that document replacing its previous request. Customers can clear saved details on the return page.

**Current download behavior:** the return page downloads a watermarked PDF preview. Unwatermarked browser downloads were blocked by automatic approval review because a public return URL does not prove payment. Approval for that direct-download behavior is still pending. The website does not verify payment or claim payment success from URL parameters. Resolve clean-download delivery before launching this as instant paid delivery.

## PayPal return URLs

After deploying, set each saved PayPal button's Confirmation / Auto-return URL:

- Motion to Quash: `https://document-generation-brown.vercel.app/download?document=motion-to-quash`
- Motion to Dismiss: `https://document-generation-brown.vercel.app/download?document=motion-to-dismiss`

Replace the domain if your Vercel deployment uses another domain. Enable Auto-return and save the settings in PayPal. These pages become available after this code is deployed. `vercel.json` serves the application on direct visits to `/download`; the preview API remains separate. This project does not change your PayPal account settings.

[PayPal button and Auto-return instructions](https://developer.paypal.com/payment-links-buttons/create-buy-button/).

## Local and Vercel setup

```bash
npm install
npm run dev
npm run build
```

Vercel: choose Vite, build command `npm run build`, output directory `dist`. The HTML checkout has no required environment variables. The watermarked preview API runs as a Vercel Function.

These are live PayPal buttons. Do not complete a purchase just to test the layout.

## Manual fallback

The existing owner-only command remains available for an already verified payment:

```bash
node scripts/fulfill-document.mjs "C:/path/to/request.json" PAYPAL_TRANSACTION_ID --payment-verified
```

First verify a completed $50.00 USD payment, the recipient, document, and duplicate fulfillment in your own PayPal Activity. This command creates a clean PDF locally and records your verification; it does not check PayPal itself. The updated checkout no longer asks customers to download and email questionnaire files.

## Checks

```bash
node --test tests/checkout.test.js
npm run build
```

Customer questionnaires, PDFs, and screenshots belong outside Git. `output/` and `tmp/` are ignored.
