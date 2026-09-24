import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { createDocumentPdf } from '../src/pdf/generateDocument.js'
import { documentSections, validateAnswers } from '../src/documentFields.js'
import { addPreviewWatermark } from './watermark.js'

const PRICE = '50.00'
const CURRENCY = 'USD'
const MAX_BODY_BYTES = 16_384

class CheckoutError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function config() {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV = 'sandbox' } = process.env
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new CheckoutError('PayPal checkout is not configured yet. Please contact the site owner.', 503)
  }
  if (!['sandbox', 'live'].includes(PAYPAL_ENV)) throw new CheckoutError('Invalid PayPal environment.', 503)
  return {
    clientId: PAYPAL_CLIENT_ID,
    secret: PAYPAL_CLIENT_SECRET,
    base: PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com',
    merchantId: process.env.PAYPAL_MERCHANT_ID || '',
  }
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

async function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body
  let body = ''
  for await (const chunk of req) {
    body += chunk
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) throw new CheckoutError('Form data is too large.', 413)
  }
  try { return JSON.parse(body) } catch { throw new CheckoutError('Invalid request.') }
}

function checkedAnswers(type, data) {
  if (!Object.hasOwn(documentSections, type) || !data || typeof data !== 'object') {
    throw new CheckoutError('Choose a valid document.')
  }
  const keys = documentSections[type].flatMap(section => section.fields.map(field => field.key))
  if (type === 'motion-to-dismiss') keys.push('deliveryOther')
  const answers = {}
  for (const key of keys) {
    if (typeof data[key] !== 'string' || data[key].length > (key === 'circumstances' ? 3000 : 500)) {
      throw new CheckoutError(`Invalid answer for ${key}.`)
    }
    answers[key] = data[key].trim()
  }
  const validationError = validateAnswers(type, answers)
  if (validationError) throw new CheckoutError(validationError)
  if (!['Magistrate', 'State', 'Superior'].includes(answers.courtType)) throw new CheckoutError('Choose a valid court.')
  if (type === 'motion-to-dismiss' && !['Hand delivery', 'U.S. Mail', 'Other'].includes(answers.deliveryMethod)) {
    throw new CheckoutError('Choose a valid delivery method.')
  }
  return answers
}

function answerHash(type, answers) {
  return createHash('sha256').update(JSON.stringify({ type, answers })).digest('hex')
}

function makeToken(orderId, type, answers, secret) {
  const payload = Buffer.from(JSON.stringify({ orderId, type, hash: answerHash(type, answers), exp: Date.now() + 6 * 60 * 60 * 1000 })).toString('base64url')
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function verifyToken(token, orderId, type, answers, secret) {
  if (typeof token !== 'string' || !/^[\w-]+\.[\w-]+$/.test(token)) throw new CheckoutError('Checkout session is invalid.')
  const [payload, signature] = token.split('.')
  const expected = createHmac('sha256', secret).update(payload).digest('base64url')
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new CheckoutError('Checkout session is invalid.')
  let data
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) } catch { throw new CheckoutError('Checkout session is invalid.') }
  if (data.orderId !== orderId || data.type !== type || data.hash !== answerHash(type, answers) || data.exp < Date.now()) {
    throw new CheckoutError('Checkout session is invalid or has expired.')
  }
}

async function accessToken(settings) {
  const response = await fetch(`${settings.base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${settings.clientId}:${settings.secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!response.ok) throw new CheckoutError('Unable to connect to PayPal. Please try again.', 502)
  const data = await response.json()
  if (!data.access_token) throw new CheckoutError('Unable to connect to PayPal. Please try again.', 502)
  return data.access_token
}

async function paypalRequest(settings, token, path, method = 'GET', body) {
  const response = await fetch(`${settings.base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(method === 'POST' && path.endsWith('/capture') ? { 'PayPal-Request-Id': `tenant-document-${path.split('/')[4]}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new CheckoutError('PayPal could not process this payment. Please review your payment method.', 502)
  return data
}

function validPurchase(order, type, settings, captured = false) {
  const unit = order.purchase_units?.[0]
  const amount = captured ? unit?.payments?.captures?.[0]?.amount : unit?.amount
  if (order.purchase_units?.length !== 1 || unit?.custom_id !== type ||
      amount?.currency_code !== CURRENCY || amount?.value !== PRICE ||
      (settings.merchantId && unit?.payee?.merchant_id !== settings.merchantId)) return false
  if (!captured) return order.status === 'APPROVED'
  return order.status === 'COMPLETED' && unit.payments.captures.length === 1 && unit.payments.captures[0].status === 'COMPLETED'
}

async function run(res, action) {
  try { await action() } catch (error) {
    if (!(error instanceof CheckoutError)) console.error('Checkout error:', error)
    sendJson(res, error instanceof CheckoutError ? error.status : 500,
      { error: error instanceof CheckoutError ? error.message : 'Checkout is temporarily unavailable. Please try again.' })
  }
}

export function checkoutConfig(req, res) {
  return run(res, async () => {
    if (req.method !== 'GET') throw new CheckoutError('Method not allowed.', 405)
    const settings = config()
    sendJson(res, 200, { clientId: settings.clientId, sandbox: settings.base.includes('sandbox') })
  })
}

export function createOrder(req, res) {
  return run(res, async () => {
    if (req.method !== 'POST') throw new CheckoutError('Method not allowed.', 405)
    const settings = config()
    const { type, data } = await bodyOf(req)
    const answers = checkedAnswers(type, data)
    // Check that the PDF can be built before requesting payment.
    createDocumentPdf(type, answers)
    const token = await accessToken(settings)
    const unit = {
      custom_id: type,
      description: type === 'motion-to-quash' ? 'Motion to Quash PDF' : 'Motion to Dismiss PDF',
      amount: { currency_code: CURRENCY, value: PRICE },
      ...(settings.merchantId ? { payee: { merchant_id: settings.merchantId } } : {}),
    }
    const order = await paypalRequest(settings, token, '/v2/checkout/orders', 'POST', {
      intent: 'CAPTURE', purchase_units: [unit],
    })
    if (!order.id) throw new CheckoutError('Unable to create the PayPal order.', 502)
    sendJson(res, 200, { orderId: order.id, checkoutToken: makeToken(order.id, type, answers, settings.secret) })
  })
}

export function previewDocument(req, res) {
  return run(res, async () => {
    if (req.method !== 'POST') throw new CheckoutError('Method not allowed.', 405)
    const { type, data } = await bodyOf(req)
    const answers = checkedAnswers(type, data)
    const pdf = addPreviewWatermark(createDocumentPdf(type, answers))
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${type}-preview.pdf"`)
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.end(Buffer.from(pdf.output('arraybuffer')))
  })
}

export function captureOrder(req, res) {
  return run(res, async () => {
    if (req.method !== 'POST') throw new CheckoutError('Method not allowed.', 405)
    const settings = config()
    const { orderId, type, data, checkoutToken } = await bodyOf(req)
    if (typeof orderId !== 'string' || !/^[A-Z0-9]{10,30}$/.test(orderId)) throw new CheckoutError('Invalid PayPal order.')
    const answers = checkedAnswers(type, data)
    verifyToken(checkoutToken, orderId, type, answers, settings.secret)
    const pdf = createDocumentPdf(type, answers)
    const token = await accessToken(settings)
    const order = await paypalRequest(settings, token, `/v2/checkout/orders/${orderId}`)
    const paid = order.status === 'COMPLETED'
      ? order
      : validPurchase(order, type, settings)
        ? await paypalRequest(settings, token, `/v2/checkout/orders/${orderId}/capture`, 'POST', {})
        : null
    if (!paid || paid.id !== orderId || !validPurchase(paid, type, settings, true)) {
      throw new CheckoutError('Payment has not completed. The PDF is not available yet.', 409)
    }
    const safeName = answers.fullName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'customer'
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${type}-${safeName}.pdf"`)
    res.setHeader('Cache-Control', 'no-store')
    res.end(Buffer.from(pdf.output('arraybuffer')))
  })
}
