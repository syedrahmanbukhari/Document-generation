import { createDocumentPdf } from '../src/pdf/generateDocument.js'
import { documentSections, validateAnswers } from '../src/documentFields.js'
import { addPreviewWatermark } from './watermark.js'

class DocumentError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

export function checkedAnswers(type, data) {
  if (!Object.hasOwn(documentSections, type) || !data || typeof data !== 'object') {
    throw new DocumentError('Choose a valid document.')
  }
  const keys = documentSections[type].flatMap(section => section.fields.map(field => field.key))
  if (type === 'motion-to-dismiss') keys.push('deliveryOther')
  const answers = {}
  for (const key of keys) {
    if (typeof data[key] !== 'string' || data[key].length > (key === 'circumstances' ? 3000 : 500)) {
      throw new DocumentError(`Invalid answer for ${key}.`)
    }
    answers[key] = data[key].trim()
  }
  const validationError = validateAnswers(type, answers)
  if (validationError) throw new DocumentError(validationError)
  if (!['Magistrate', 'State', 'Superior'].includes(answers.courtType)) throw new DocumentError('Choose a valid court.')
  if (type === 'motion-to-dismiss' && !['Hand delivery', 'U.S. Mail', 'Other'].includes(answers.deliveryMethod)) {
    throw new DocumentError('Choose a valid delivery method.')
  }
  return answers
}

export async function previewDocument(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    if (req.method !== 'POST') throw new DocumentError('Method not allowed.', 405)
    let body = req.body
    if (!body || typeof body !== 'object') {
      let raw = ''
      for await (const chunk of req) {
        raw += chunk
        if (Buffer.byteLength(raw) > 16_384) throw new DocumentError('Form data is too large.', 413)
      }
      try { body = JSON.parse(raw) } catch { throw new DocumentError('Invalid request.') }
    }
    const answers = checkedAnswers(body.type, body.data)
    const pdf = addPreviewWatermark(createDocumentPdf(body.type, answers))
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${body.type}-preview.pdf"`)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.end(Buffer.from(pdf.output('arraybuffer')))
  } catch (error) {
    if (!(error instanceof DocumentError)) console.error('Preview error:', error)
    res.statusCode = error instanceof DocumentError ? error.status : 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: error instanceof DocumentError ? error.message : 'Unable to prepare the preview. Please try again.' }))
  }
}
