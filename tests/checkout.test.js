import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, mkdtemp, readFile, readdir, rmdir, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { previewDocument } from '../server/documents.js'
import { fulfillDocument } from '../scripts/fulfill-document.mjs'
import { HOSTED_BUTTONS, loadHostedPayPal, PAYPAL_SDK_URL } from '../src/paypalHosted.js'
import { saveDownloadRequest, readDownloadRequest, clearDownloadRequest } from '../src/downloadRequest.js'

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

test('return pages restore only the selected document and reject missing, expired or invalid saved answers', () => {
  const values = new Map()
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
  assert.equal(readDownloadRequest('motion-to-quash', storage), null)
  saveDownloadRequest('motion-to-quash', { ...answers, email: 'not part of this document' }, storage)
  saveDownloadRequest('motion-to-dismiss', dismissAnswers, storage)
  assert.deepEqual(readDownloadRequest('motion-to-quash', storage).data, answers)
  assert.deepEqual(readDownloadRequest(null, storage).data, dismissAnswers)
  assert.equal(readDownloadRequest('unknown', storage), null)
  clearDownloadRequest('motion-to-dismiss', storage)
  assert.equal(readDownloadRequest(null, storage), null)
  assert.ok(readDownloadRequest('motion-to-quash', storage))
  const expired = { type: 'motion-to-quash', data: answers, expiresAt: Date.now() - 1 }
  storage.setItem('trc:download:motion-to-quash', JSON.stringify(expired))
  assert.equal(readDownloadRequest('motion-to-quash', storage), null)
  assert.equal(storage.getItem('trc:download:motion-to-quash'), null)
  storage.setItem('trc:download:motion-to-quash', '{broken')
  assert.equal(readDownloadRequest('motion-to-quash', storage), null)
  assert.throws(() => saveDownloadRequest('motion-to-quash', { ...answers, fullName: '' }, storage), /Please complete/)
})

async function preview(body, method = 'POST') {
  const response = {
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value },
    end(content) { this.body = content },
  }
  await previewDocument({ method, body }, response)
  return response
}

test('both public previews retain the watermark; invalid answers cannot be previewed', async () => {
  for (const [type, data, pages] of [
    ['motion-to-quash', answers, 1], ['motion-to-dismiss', dismissAnswers, 2],
  ]) {
    const result = await preview({ type, data })
    assert.equal(result.statusCode, 200)
    assert.equal(result.headers['cache-control'], 'no-store')
    const pdf = Buffer.from(result.body).toString('latin1')
    assert.ok(pdf.startsWith('%PDF'))
    assert.equal((pdf.match(/TENANT RESOURCE CENTER/g) || []).length, pages * 3)
    assert.equal((pdf.match(/\/Type \/Page\b/g) || []).length, pages)
  }
  assert.equal((await preview({ type: 'motion-to-quash', data: { ...answers, county: '' } })).statusCode, 400)
  assert.equal((await preview({ type: 'invalid', data: answers })).statusCode, 400)
  assert.equal((await preview({ type: 'motion-to-quash', data: answers }, 'GET')).statusCode, 405)
})

test('the supplied hosted buttons load one SDK and recover from a failed load', async () => {
  const previousWindow = global.window
  const previousDocument = global.document
  const scripts = []
  let removed = 0
  global.window = {}
  global.document = {
    createElement() { return { remove() { removed += 1 } } },
    head: { appendChild(script) { scripts.push(script) } },
  }
  try {
    assert.deepEqual(HOSTED_BUTTONS, { 'motion-to-quash': 'GHDTG49B6VS5N', 'motion-to-dismiss': 'SZLCKPWK2ZUEL' })
    const first = loadHostedPayPal()
    assert.equal(loadHostedPayPal(), first)
    assert.equal(scripts.length, 1)
    assert.equal(scripts[0].src, PAYPAL_SDK_URL)
    assert.equal(new URL(PAYPAL_SDK_URL).searchParams.get('components'), 'hosted-buttons')
    const rejected = assert.rejects(first, /did not load/)
    scripts[0].onerror()
    await rejected
    assert.equal(removed, 1)
    const retry = loadHostedPayPal()
    assert.equal(scripts.length, 2)
    global.window.paypal = { HostedButtons() {} }
    scripts[1].onload()
    assert.equal(await retry, global.window.paypal)
    assert.equal(await loadHostedPayPal(), global.window.paypal)
    assert.equal(scripts.length, 2)
  } finally {
    global.window = previousWindow
    global.document = previousDocument
  }
})

test('manual fulfillment requires owner verification, validates answers and prevents transaction reuse', async () => {
  await mkdir(resolve('tmp'), { recursive: true })
  const directory = await mkdtemp(resolve('tmp', 'hosted-checkout-test-'))
  const requestPath = resolve(directory, 'request.json')
  const output = resolve(directory, 'pdf')
  try {
    const request = { requestId: '12345678-1234-4321-9876-123456789abc', type: 'motion-to-quash', data: answers }
    await writeFile(requestPath, JSON.stringify(request))
    await assert.rejects(fulfillDocument(requestPath, 'ABC123456789', false, output), /First verify/)
    await writeFile(requestPath, JSON.stringify({ ...request, data: { ...answers, fullName: '' } }))
    await assert.rejects(fulfillDocument(requestPath, 'ABC123456789', true, output), /Please complete/)
    for (const [type, data, pages, transactionId] of [
      ['motion-to-quash', answers, 1, 'ABC123456789'], ['motion-to-dismiss', dismissAnswers, 2, 'DEF123456789'],
    ]) {
      await writeFile(requestPath, JSON.stringify({ ...request, type, data }))
      const path = await fulfillDocument(requestPath, transactionId, true, output)
      const pdf = (await readFile(path)).toString('latin1')
      assert.ok(pdf.startsWith('%PDF'))
      assert.ok(!pdf.includes('TENANT RESOURCE CENTER'))
      assert.equal((pdf.match(/\/Type \/Page\b/g) || []).length, pages)
      const record = JSON.parse(await readFile(resolve(output, `payment-${transactionId}.json`), 'utf8'))
      assert.equal(record.type, type)
      assert.equal(record.requestId, request.requestId)
      await assert.rejects(fulfillDocument(requestPath, transactionId, true, output), { code: 'EEXIST' })
    }
    // A reused payment cannot fulfill a different document request either.
    await writeFile(requestPath, JSON.stringify({ ...request, requestId: '12345678-1234-4321-9876-123456789abd' }))
    await assert.rejects(fulfillDocument(requestPath, 'ABC123456789', true, output), { code: 'EEXIST' })
  } finally {
    for (const name of await readdir(output).catch(() => [])) await unlink(resolve(output, name))
    await rmdir(output).catch(() => {})
    await unlink(requestPath)
    await rmdir(directory)
  }
})
