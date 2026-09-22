import { jsPDF } from 'jspdf'

const PAGE_W = 612
const PAGE_H = 792
const MARGIN_X = 70
const CONTENT_W = PAGE_W - MARGIN_X * 2
const PAGE_TOP = 50
const PAGE_BOTTOM = 734
const BODY_SIZE = 11.5
const LINE_HEIGHT = 15.5
const MOTION_TITLE = "DEFENDANT'S MOTION TO DISMISS DISPOSSESSORY PROCEEDING FOR IMPROPER SERVICE"

// Reference markers 1–8 map to courtType, county, plaintiff, defendant,
// caseNumber, fullName, propertyAddress, circumstances. Do not print markers.
const value = (input, fallback) => String(input ?? '').trim() || fallback

const splitDate = (dateValue) => {
  const d = new Date(`${dateValue}T00:00:00`)
  if (!dateValue || Number.isNaN(d.getTime())) {
    return { day: '____', month: '________________', year: '____' }
  }
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString('en-US', { month: 'long' }),
    year: String(d.getFullYear()),
  }
}

// Drawing and pagination use the same measured line spacing. Answers may
// contain explicit newlines or span multiple pages without being truncated.
function createWriter(doc) {
  let y = PAGE_TOP
  const nextPage = () => {
    doc.addPage('letter', 'portrait')
    y = PAGE_TOP
  }
  const ensureSpace = (height) => {
    if (y + height > PAGE_BOTTOM) nextPage()
  }
  const linesFor = (content, width, size = BODY_SIZE, style = 'normal') => {
    doc.setFont('times', style)
    doc.setFontSize(size)
    return doc.splitTextToSize(String(content), width)
  }
  const paragraph = (content, options = {}) => {
    const {
      indent = 0, size = BODY_SIZE, style = 'normal', align = 'left',
      gap = 9, lineHeight = LINE_HEIGHT, number,
    } = options
    const x = MARGIN_X + indent
    const lines = linesFor(content, CONTENT_W - indent, size, style)
    ensureSpace(Math.min(lines.length, 2) * lineHeight)
    lines.forEach((line, index) => {
      ensureSpace(lineHeight)
      if (index === 0 && number !== undefined) doc.text(`${number}.`, MARGIN_X, y)
      doc.text(line, align === 'center' ? PAGE_W / 2 : x, y, { align })
      y += lineHeight
    })
    y += gap
  }
  const columns = (left, right, gap = 0) => {
    const rightX = 400
    const leftLines = linesFor(left, rightX - MARGIN_X - 24)
    const rightLines = linesFor(right, PAGE_W - MARGIN_X - rightX)
    const count = Math.max(leftLines.length, rightLines.length)
    ensureSpace(Math.min(count, 2) * LINE_HEIGHT)
    for (let i = 0; i < count; i += 1) {
      ensureSpace(LINE_HEIGHT)
      if (leftLines[i]) doc.text(leftLines[i], MARGIN_X, y)
      if (rightLines[i]) doc.text(rightLines[i], rightX, y)
      y += LINE_HEIGHT
    }
    y += gap
  }
  const checkbox = (selected, label) => {
    const lines = linesFor(label, CONTENT_W - 16)
    ensureSpace(Math.min(lines.length, 2) * LINE_HEIGHT)
    doc.setLineWidth(0.5)
    doc.rect(MARGIN_X, y - 8, 8, 8)
    if (selected) {
      doc.setLineWidth(1)
      doc.line(MARGIN_X + 1.5, y - 4, MARGIN_X + 3.5, y - 1.5)
      doc.line(MARGIN_X + 3.5, y - 1.5, MARGIN_X + 7, y - 6.5)
    }
    paragraph(label, { indent: 16, gap: 4 })
  }
  return { paragraph, columns, checkbox, ensureSpace }
}

function addMotion(writer, d) {
  writer.paragraph(
    `IN THE ${value(d.courtType, '________').toUpperCase()} COURT OF ${value(d.county, '________').toUpperCase()} COUNTY`,
    { size: 12, style: 'bold', align: 'center', gap: 5 },
  )
  writer.paragraph('STATE OF GEORGIA', { size: 12, style: 'bold', align: 'center', gap: 24 })
  writer.columns(
    `${value(d.plaintiff, '[LANDLORD/PLAINTIFF NAME]')},\nPlaintiff,`,
    `Civil Action No.\n${value(d.caseNumber, '[CASE NUMBER]')}`,
    17,
  )
  writer.paragraph('v.', { gap: 17 })
  writer.paragraph(`${value(d.defendant, '[TENANT/DEFENDANT NAME]')},\nDefendant.`, { gap: 24 })
  writer.ensureSpace(5 * LINE_HEIGHT)
  writer.paragraph(MOTION_TITLE, { size: 12, style: 'bold', align: 'center', gap: 14 })
  writer.paragraph(`COMES NOW Defendant, ${value(d.fullName, '[YOUR FULL LEGAL NAME]')}, appearing pro se, and respectfully moves this Court to dismiss the above-captioned dispossessory proceeding, or alternatively quash the purported service, because Defendant was not properly served as required by Georgia law.`)
  writer.paragraph('In support of this Motion, Defendant states as follows:')

  const statements = [
    `Plaintiff filed a dispossessory proceeding against Defendant concerning the premises located at:\n${value(d.propertyAddress, '[FULL PROPERTY ADDRESS]')}`,
    'Defendant was not properly served with the dispossessory affidavit and/or dispossessory warrant.',
    `Specifically, the circumstances surrounding the attempted service were as follows:\n${value(d.circumstances, '[DESCRIBE EXACTLY WHAT HAPPENED. INCLUDE THE DATE, LOCATION, WHO RECEIVED OR DID NOT RECEIVE THE PAPERS, AND ANY OTHER RELEVANT DETAILS.]')}`,
    'Defendant did not receive service in a manner authorized by Georgia law.',
    'Defendant did not receive actual notice through a legally sufficient method of service that would provide the Court with personal jurisdiction over Defendant in this dispossessory proceeding.',
    'Defendant therefore objects to the sufficiency of service and requests that the Court determine that service was defective.',
    'Because service was not properly perfected, Defendant respectfully submits that the dispossessory proceeding should not proceed against Defendant based upon the defective service.',
    'Defendant raises improper service as a defense and expressly preserves the right to contest the dispossessory proceeding, possession of the premises, any alleged amount owed, and all other defenses and claims available under Georgia law.',
  ]
  statements.forEach((statement, index) => {
    writer.paragraph(statement, { number: index + 1, indent: 18 })
  })
}

function addReliefAndService(writer, d) {
  writer.paragraph('WHEREFORE', { size: 12, style: 'bold', align: 'center', gap: 10 })
  writer.paragraph('Defendant respectfully requests that this Court:')
  const requests = [
    'a. Dismiss the dispossessory proceeding for improper service;',
    'b. Alternatively, quash the purported service and require Plaintiff to effectuate lawful service before this matter proceeds;',
    'c. Deny any request for a writ of possession based upon defective service;',
    'd. Grant Defendant any additional relief the Court determines to be appropriate; and',
    'e. Grant such other and further relief as the Court deems just and proper.',
  ]
  requests.forEach((request) => writer.paragraph(request, { indent: 24, gap: 4 }))

  const { day, month, year } = splitDate(d.date)
  writer.paragraph(`Respectfully submitted this ${day} day of ${month}, ${year}.`, { gap: 16 })
  writer.ensureSpace(2 * LINE_HEIGHT)
  writer.paragraph(`${value(d.fullName, '[YOUR FULL LEGAL NAME]')}\nDefendant, Pro Se`, { gap: 12 })
  writer.paragraph(`Address:\n${value(d.mailingAddress, '[YOUR MAILING ADDRESS]')}`, { gap: 4 })
  writer.paragraph(`Telephone: ${value(d.phone, '[PHONE NUMBER]')}`, { gap: 4 })
  writer.paragraph(`Email: ${value(d.email, '[EMAIL ADDRESS]')}`, { gap: 20 })

  writer.ensureSpace(5 * LINE_HEIGHT)
  writer.paragraph('CERTIFICATE OF SERVICE', { size: 12, style: 'bold', align: 'center', gap: 10 })
  writer.paragraph("I hereby certify that I have served a copy of the foregoing Defendant's Motion to Dismiss Dispossessory Proceeding for Improper Service upon the Plaintiff or Plaintiff's attorney by:")
  writer.checkbox(d.deliveryMethod === 'Hand delivery', 'Hand delivery')
  writer.checkbox(d.deliveryMethod === 'U.S. Mail', 'U.S. Mail')
  writer.checkbox(d.deliveryMethod === 'Other', `Other: ${value(d.deliveryOther, '_________________________')}`)
  writer.ensureSpace(3 * LINE_HEIGHT)
  writer.paragraph(`to:\n${value(d.plaintiffAttorneyName, "[PLAINTIFF OR PLAINTIFF'S ATTORNEY NAME]")}\n${value(d.plaintiffAttorneyAddress, '[ADDRESS]')}`, { gap: 12 })
  writer.ensureSpace(4 * LINE_HEIGHT)
  writer.paragraph(`This ${day} day of ${month}, ${year}.`, { gap: 16 })
  writer.paragraph(`${value(d.fullName, '[YOUR FULL LEGAL NAME]')}\nDefendant, Pro Se`, { gap: 0 })
}

export function createDocumentPdf(type, data) {
  if (!['motion-to-dismiss', 'motion-to-quash'].includes(type)) {
    throw new Error(`Unknown document type: ${type}`)
  }
  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' })
  const isFirstDocument = type === 'motion-to-quash'
  doc.setProperties({
    title: isFirstDocument
      ? 'Motion to Dismiss Dispossessory Proceeding for Improper Service'
      : 'Requested Relief and Certificate of Service',
    subject: 'Educational self-help document',
    creator: 'Tenant Resource Document Center',
  })
  // Each selection downloads its own section instead of the combined motion.
  const writer = createWriter(doc)
  if (isFirstDocument) {
    addMotion(writer, data)
  } else {
    addReliefAndService(writer, data)
  }
  for (let page = 1; page <= doc.getNumberOfPages(); page += 1) {
    doc.setPage(page)
    doc.setFont('times', 'normal')
    doc.setFontSize(9)
    doc.text(String(isFirstDocument ? page : page + 1), PAGE_W / 2, PAGE_H - 32, { align: 'center' })
  }
  return doc
}

export function generateDocumentPdf(type, data) {
  const doc = createDocumentPdf(type, data)
  const safeName = value(data.fullName, 'customer').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
  doc.save(`${type}-${safeName || 'customer'}.pdf`)
}
