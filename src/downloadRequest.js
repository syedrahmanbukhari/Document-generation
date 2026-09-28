import { documentSections, validateAnswers } from './documentFields.js'

const prefix = 'trc:download:'

function selectedAnswers(type, answers) {
  if (!Object.hasOwn(documentSections, type) || !answers || typeof answers !== 'object') throw new Error('Choose a valid document.')
  const keys = documentSections[type].flatMap(section => section.fields.map(field => field.key))
  if (type === 'motion-to-dismiss') keys.push('deliveryOther')
  const data = {}
  for (const key of keys) {
    if (typeof answers[key] !== 'string' || answers[key].length > (key === 'circumstances' ? 3000 : 500)) throw new Error('Please review your questionnaire and try again.')
    data[key] = answers[key].trim()
  }
  const error = validateAnswers(type, data)
  if (error) throw new Error(error)
  if (!['Magistrate', 'State', 'Superior'].includes(data.courtType)) throw new Error('Choose a valid court.')
  if (type === 'motion-to-dismiss' && !['Hand delivery', 'U.S. Mail', 'Other'].includes(data.deliveryMethod)) throw new Error('Choose a valid delivery method.')
  return data
}

export function saveDownloadRequest(type, answers, storage = localStorage) {
  const request = { type, data: selectedAnswers(type, answers), expiresAt: Date.now() + 24 * 60 * 60 * 1000 }
  storage.setItem(`${prefix}${type}`, JSON.stringify(request))
  storage.setItem(`${prefix}active`, type)
  return request
}

export function readDownloadRequest(type, storage = localStorage) {
  const selectedType = type || storage.getItem(`${prefix}active`)
  if (!Object.hasOwn(documentSections, selectedType)) return null
  const key = `${prefix}${selectedType}`
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    if (raw.length > 16_384) throw new Error('Invalid saved request.')
    const request = JSON.parse(raw)
    if (request.type !== selectedType || !Number.isFinite(request.expiresAt) || request.expiresAt <= Date.now()) throw new Error('This saved request has expired.')
    return { ...request, data: selectedAnswers(selectedType, request.data) }
  } catch {
    storage.removeItem(key)
    return null
  }
}

export function clearDownloadRequest(type, storage = localStorage) {
  storage.removeItem(`${prefix}${type}`)
  if (storage.getItem(`${prefix}active`) === type) storage.removeItem(`${prefix}active`)
}
