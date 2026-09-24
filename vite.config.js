import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { checkoutConfig, createOrder, captureOrder, previewDocument } from './server/paypal.js'

function localCheckoutApi() {
  const handlers = { '/config': checkoutConfig, '/create-order': createOrder, '/capture-order': captureOrder, '/preview': previewDocument }
  return {
    name: 'local-checkout-api',
    configureServer(server) {
      server.middlewares.use('/api', (req, res, next) => {
        const handler = handlers[req.url.split('?')[0]]
        if (handler) handler(req, res)
        else next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), 'PAYPAL_'))
  return { plugins: [react(), localCheckoutApi()] }
})
