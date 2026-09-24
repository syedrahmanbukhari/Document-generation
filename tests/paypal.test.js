import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { captureOrder, checkoutConfig, createOrder, previewDocument } from '../server/paypal.js'

const originalFetch = global.fetch
const originalEnv = {
  PAYPAL_ENV: process.env.PAYPAL_ENV,
  PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
  PAYPAL_MERCHANT_ID: process.env.PAYPAL_MERCHANT_ID,
}
const orderId = 'ABC123456789'
const answers = {
  courtType: 'Magistrate', county: 'Fulton', plaintiff: 'Landlord', defendant: 'Tenant',
  caseNumber: '2026-CV-1234', fullName: 'Tenant Person',
}
const dismissAnswers = {
  ...answers,
  propertyAddress: '123 Main St, Atlanta, GA',
  circumstances: 'Papers were posted on my door on September 10, but were not mailed.',
  date: '2026-09-24', signatureName: 'Tenant Person', mailingAddress: '123 Main St, Atlanta, GA',
  phone: '404-555-0100', email: 'tenant@example.com', deliveryMethod: 'U.S. Mail',
  deliveryOther: '', plaintiffAttorneyName: 'Landlord', plaintiffAttorneyAddress: '456 Court St, Atlanta, GA',
  serviceDate: '2026-09-24', serviceSignatureName: 'Tenant Person',
}

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value },
    end(body) { this.body = body },
    json() { return JSON.parse(this.body) },
  }
}

async function call(handler, body, method = 'POST') {
  const response = mockResponse()
  await handler({ method, body }, response)
  return response
}

function paypalJson(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

function purchase(status, amount = '50.00', type = 'motion-to-quash') {
  return {
    id: orderId,
    status,
    purchase_units: [{
      custom_id: type,
      amount: { currency_code: 'USD', value: '50.00' },
      payments: status === 'COMPLETED' ? { captures: [{ status: 'COMPLETED', amount: { currency_code: 'USD', value: amount } }] } : undefined,
    }],
  }
}

before(() => {
  process.env.PAYPAL_ENV = 'sandbox'
  process.env.PAYPAL_CLIENT_ID = 'test-client'
  process.env.PAYPAL_CLIENT_SECRET = 'test-secret'
  delete process.env.PAYPAL_MERCHANT_ID
})

after(() => {
  global.fetch = originalFetch
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

test('checkout configuration fails closed without credentials', async () => {
  delete process.env.PAYPAL_CLIENT_SECRET
  const response = await call(checkoutConfig, undefined, 'GET')
  assert.equal(response.statusCode, 503)
  assert.match(response.json().error, /not configured/)
  process.env.PAYPAL_CLIENT_SECRET = 'test-secret'
})

test('both documents can be previewed with a watermark before PayPal is configured', async () => {
  delete process.env.PAYPAL_CLIENT_SECRET
  for (const [type, data, expectedPages] of [
    ['motion-to-quash', answers, 1],
    ['motion-to-dismiss', dismissAnswers, 2],
  ]) {
    const preview = await call(previewDocument, { type, data })
    assert.equal(preview.statusCode, 200)
    assert.equal(preview.headers['content-type'], 'application/pdf')
    assert.match(preview.headers['content-disposition'], /inline/)
    const content = Buffer.from(preview.body).toString('latin1')
    assert.ok(content.startsWith('%PDF'))
    assert.equal((content.match(/TENANT RESOURCE CENTER/g) || []).length, expectedPages * 3)
    assert.equal((content.match(/PREVIEW/g) || []).length, expectedPages * 3)
  }
  process.env.PAYPAL_CLIENT_SECRET = 'test-secret'
})

test('server creates exactly a $50.00 order and releases a PDF only after verified capture', async () => {
  let captured = false
  global.fetch = async (url, options) => {
    if (url.endsWith('/v1/oauth2/token')) return paypalJson({ access_token: 'token' })
    if (url.endsWith('/v2/checkout/orders') && options.method === 'POST') {
      const payload = JSON.parse(options.body)
      assert.equal(payload.intent, 'CAPTURE')
      assert.deepEqual(payload.purchase_units[0].amount, { currency_code: 'USD', value: '50.00' })
      return paypalJson({ id: orderId })
    }
    if (url.endsWith(`/orders/${orderId}`)) return paypalJson(purchase(captured ? 'COMPLETED' : 'APPROVED'))
    if (url.endsWith(`/orders/${orderId}/capture`)) {
      captured = true
      return paypalJson(purchase('COMPLETED'))
    }
    throw new Error(`Unexpected PayPal request: ${url}`)
  }

  const created = await call(createOrder, { type: 'motion-to-quash', data: answers })
  assert.equal(created.statusCode, 200)
  const { checkoutToken } = created.json()
  assert.equal(created.json().orderId, orderId)

  const changedAnswers = await call(captureOrder, { orderId, checkoutToken, type: 'motion-to-quash', data: { ...answers, plaintiff: 'Someone else' } })
  assert.equal(changedAnswers.statusCode, 400)
  assert.match(changedAnswers.json().error, /session/)
  assert.equal(captured, false)

  const paid = await call(captureOrder, { orderId, checkoutToken, type: 'motion-to-quash', data: answers })
  assert.equal(paid.statusCode, 200)
  assert.equal(paid.headers['content-type'], 'application/pdf')
  assert.equal(Buffer.from(paid.body).subarray(0, 4).toString(), '%PDF')
  assert.ok(!Buffer.from(paid.body).toString('latin1').includes('TENANT RESOURCE CENTER'))
  assert.equal(captured, true)

  const retry = await call(captureOrder, { orderId, checkoutToken, type: 'motion-to-quash', data: answers })
  assert.equal(retry.statusCode, 200)
})

test('unpaid or underpaid PayPal orders cannot download a PDF', async () => {
  let order = purchase('CREATED')
  global.fetch = async (url, options) => {
    if (url.endsWith('/v1/oauth2/token')) return paypalJson({ access_token: 'token' })
    if (url.endsWith('/v2/checkout/orders') && options.method === 'POST') return paypalJson({ id: orderId })
    if (url.endsWith(`/orders/${orderId}`)) return paypalJson(order)
    throw new Error(`Unexpected PayPal request: ${url}`)
  }
  const created = await call(createOrder, { type: 'motion-to-quash', data: answers })
  const params = { orderId, checkoutToken: created.json().checkoutToken, type: 'motion-to-quash', data: answers }
  assert.equal((await call(captureOrder, params)).statusCode, 409)
  order = purchase('COMPLETED', '5.00')
  assert.equal((await call(captureOrder, params)).statusCode, 409)
})

test('the second document uses the same $50.00 gate', async () => {
  global.fetch = async (url, options) => {
    if (url.endsWith('/v1/oauth2/token')) return paypalJson({ access_token: 'token' })
    if (url.endsWith('/v2/checkout/orders') && options.method === 'POST') {
      assert.equal(JSON.parse(options.body).purchase_units[0].amount.value, '50.00')
      return paypalJson({ id: orderId })
    }
    if (url.endsWith(`/orders/${orderId}`)) return paypalJson(purchase('COMPLETED', '50.00', 'motion-to-dismiss'))
    throw new Error(`Unexpected PayPal request: ${url}`)
  }
  const created = await call(createOrder, { type: 'motion-to-dismiss', data: dismissAnswers })
  assert.equal(created.statusCode, 200)
  const paid = await call(captureOrder, {
    orderId, checkoutToken: created.json().checkoutToken, type: 'motion-to-dismiss', data: dismissAnswers,
  })
  assert.equal(paid.statusCode, 200)
  assert.equal(Buffer.from(paid.body).subarray(0, 4).toString(), '%PDF')
  assert.ok(!Buffer.from(paid.body).toString('latin1').includes('TENANT RESOURCE CENTER'))
})
