# Tenant Resource Document Center

Motion to Quash has six questions and a one-page PDF. Motion to Dismiss has 18 questions and normally a two-page PDF. Each document costs **$50.00 USD**. Customers review a watermarked preview before paying and receive the clean PDF by email after the site owner manually verifies payment.

## Hosted PayPal checkout

The checkout uses the supplied PayPal HostedButtons HTML integration, loaded once per page:

- Motion to Quash: `GHDTG49B6VS5N`
- Motion to Dismiss: `SZLCKPWK2ZUEL`

The supplied SDK client ID is public and already included in `src/paypalHosted.js`. No PayPal client secret, REST app credentials, order creation, or capture API is used. Confirm in your PayPal dashboard that **both hosted buttons charge $50.00 USD**; their amount is managed by PayPal, not by the website's price label. PayPal decides which funding methods each customer can use.

Hosted buttons do not expose a supported approval callback to this integration. A PayPal return URL or a customer's receipt cannot unlock an automatic clean download. This project therefore uses the manual delivery flow you selected.

## Local and Vercel setup

1. Copy `.env.example` to `.env.local` and set `VITE_SUPPORT_EMAIL` to the real inbox that receives questionnaire files and PayPal receipts. This is a public email address, not a secret. Payments stay unavailable until a valid support email is configured.
2. Run `npm install`, then `npm run dev`.
3. In Vercel, select the Vite framework and add `VITE_SUPPORT_EMAIL` in the project's Environment Variables for the appropriate deployment environments. Redeploy after changing it; Vite includes it at build time. The preview API in `api/preview.js` runs as a Vercel Function.
4. Old `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, and `PAYPAL_MERCHANT_ID` environment variables can be removed; this version does not read them.

These buttons are **live PayPal buttons**. Do not complete a purchase just to test the layout.

## Customer flow

1. Complete the questionnaire and review the watermarked PDF.
2. Use **Save completed questionnaire** to save the document request file. It includes only the selected document's answers and a request reference.
3. Pay with the hosted PayPal button.
4. Email the saved file and PayPal receipt to the support address displayed on checkout. The email link opens a prepared message; the customer must attach the files and send it.
5. The owner verifies the payment and replies with the clean PDF. The website does not send email or store questionnaires, and it does not claim payment success from a redirect. There is no automatic download.

## Manually prepare a paid PDF

Open **your own PayPal Activity** and verify that the transaction completed, the gross amount is **$50.00 USD**, the payment was received by your account, and the document matches the customer's request. Do not rely on a screenshot or receipt alone. Confirm it has not already been fulfilled.

Save the customer's questionnaire file locally. From the project folder, run:

```bash
node scripts/fulfill-document.mjs "C:/path/to/motion-to-quash-request.json" PAYPAL_TRANSACTION_ID --payment-verified
```

The command validates all answers and creates the PDF without a watermark in `output/pdf/`. Email that PDF back to the customer. It also records the manually verified transaction locally and refuses to reuse the same transaction ID. This command records **your verification**; it does not check PayPal itself. Keep the fulfillment records together and consult them before delivery. A failed PDF write releases its payment record so it can be retried.

Customer questionnaires and fulfillment output contain personal information. `output/` and `tmp/` are ignored by Git; keep received questionnaire files outside the repository or in `tmp/`.

## Build and test

```bash
npm run build
node --test tests/checkout.test.js
```

Official references: [PayPal hosted-button integration](https://developer.paypal.com/upgrade/wps/guide/Customer%20Set%20Price/), [SDK loading and button troubleshooting](https://developer.paypal.com/payment-links-buttons/troubleshooting/).
