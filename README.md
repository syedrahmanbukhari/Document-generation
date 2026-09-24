# Tenant Resource Document Center

Two guided document flows: Motion to Quash (six questions, one-page PDF) and Motion to Dismiss (18 questions, two-page PDF). Each document costs **$50.00 USD**.

## PayPal setup

The site creates a $50.00 order on the server, shows PayPal checkout after the form is completed, and releases the generated PDF only after the server captures and verifies the payment. The PayPal client secret stays on the server. The site has no database; a signed checkout token binds the approved order to the selected document and answers. An already completed order can be used to retry its PDF download while that token is valid.

1. Create a PayPal Business account and a REST app in the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications/sandbox). For testing, use the sandbox client ID and secret; for production, use live credentials for the Business account that should receive payments.
2. Copy `.env.example` to `.env.local`, add `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`, and leave `PAYPAL_ENV=sandbox` while testing. Optionally set `PAYPAL_MERCHANT_ID` to the receiving Business account's merchant ID for an additional payee check. Never put the client secret in a `VITE_` variable or commit it.
3. Run `npm install` and `npm run dev`. Vite serves the checkout API locally. Use a sandbox buyer account to test a complete purchase and PDF download.
4. Deploy to Vercel as a Vite project. Set the same variables in the project's server-side Environment Variables. Set `PAYPAL_ENV=live` and use live credentials when ready to take real payments. The `api/` routes run as Vercel Functions; the Vite static build alone cannot process payments.

The site fails closed when credentials are absent: customers cannot download PDFs for free. PayPal determines which funding methods are available to each buyer.

## Build and test

```bash
npm run build
node --test tests/paypal.test.js
```

The server uses PayPal Orders v2 to create and capture orders. See the [PayPal Standard Checkout integration guide](https://developer.paypal.com/platforms/checkout/standard/integrate/) for the merchant account and REST app setup.
