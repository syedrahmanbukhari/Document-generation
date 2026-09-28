import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { checkedAnswers } from '../server/documents.js'
import { createDocumentPdf } from '../src/pdf/generateDocument.js'

export async function fulfillDocument(requestPath, transactionId, paymentVerified, outputDirectory = 'output/pdf') {
  if (!paymentVerified || !/^[A-Z0-9]{10,30}$/.test(transactionId || '')) {
    throw new Error('First verify a completed $50.00 USD payment in your own PayPal account, then pass --payment-verified and its transaction ID.')
  }
  const raw = await readFile(requestPath, 'utf8')
  if (Buffer.byteLength(raw) > 16_384) throw new Error('Questionnaire file is too large.')
  const request = JSON.parse(raw.replace(/^\uFEFF/, ''))
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(request.requestId || '')) {
    throw new Error('Invalid document request reference.')
  }
  const answers = checkedAnswers(request.type, request.data)
  const pdf = createDocumentPdf(request.type, answers)
  const outputPath = resolve(outputDirectory, `${request.type}-${request.requestId}.pdf`)
  await mkdir(resolve(outputDirectory), { recursive: true })
  // Records are exclusive: the same transaction cannot fulfill another request.
  const recordPath = resolve(outputDirectory, `payment-${transactionId}.json`)
  await writeFile(recordPath, JSON.stringify({
    transactionId, requestId: request.requestId, type: request.type,
    verifiedManuallyAt: new Date().toISOString(), outputPath,
  }, null, 2), { flag: 'wx' })
  try {
    await writeFile(outputPath, Buffer.from(pdf.output('arraybuffer')), { flag: 'wx' })
  } catch (error) {
    await unlink(recordPath)
    throw error
  }
  return outputPath
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [requestPath, transactionId, confirmation] = process.argv.slice(2)
  try {
    if (!requestPath) throw new Error('Usage: node scripts/fulfill-document.mjs "request.json" PAYPAL_TRANSACTION_ID --payment-verified')
    console.log(await fulfillDocument(requestPath, transactionId, confirmation === '--payment-verified'))
  } catch (error) {
    console.error(error.code === 'EEXIST' ? 'This payment or request has already been fulfilled. Use the existing PDF; do not reuse a transaction for a different purchase.' : error.message)
    process.exitCode = 1
  }
}
