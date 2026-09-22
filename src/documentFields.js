const courtFields = [
  { key: 'courtType', label: 'In which court has your case been filed?', type: 'select', options: ['Magistrate', 'State', 'Superior'] },
  { key: 'county', label: 'County', help: 'Enter the county where your case was filed.', placeholder: 'e.g. Fulton' },
  { key: 'plaintiff', label: 'Plaintiff name', help: 'Enter the landlord, apartment complex, or other plaintiff named on your case documents.' },
  { key: 'defendant', label: 'Defendant name', help: 'Enter the name or names exactly as listed on your case documents, including other occupants if listed.' },
  { key: 'caseNumber', label: 'Case number' },
]

export const documentSections = {
  'motion-to-quash': [
    { title: 'Court information', fields: courtFields },
    { title: 'Your information', fields: [{ key: 'fullName', label: 'Your first and last name', placeholder: 'First and last name' }] },
  ],
  'motion-to-dismiss': [
    { title: 'Court information', fields: courtFields },
    { title: 'Case and service details', fields: [
      { key: 'fullName', label: 'Full legal name' },
      { key: 'propertyAddress', label: 'Property address', type: 'textarea', placeholder: 'Street address, unit number, city, state, ZIP code' },
      { key: 'circumstances', label: 'Details of service', type: 'textarea', rows: 6, help: 'Describe exactly what happened. Include the date, location, who received or did not receive the papers, and any other relevant details.' },
    ] },
    { title: 'Document and contact information', fields: [
      { key: 'date', label: 'Document date', type: 'date' },
      { key: 'signatureName', label: 'Name for the motion signature', help: 'Confirm the name to appear beneath the motion.' },
      { key: 'mailingAddress', label: 'Mailing address', type: 'textarea', placeholder: 'Street address, unit number, city, state, ZIP code' },
      { key: 'phone', label: 'Phone number', type: 'tel' },
      { key: 'email', label: 'Email address', type: 'email', placeholder: 'name@example.com' },
    ] },
    { title: 'Certificate of service', fields: [
      { key: 'deliveryMethod', label: 'Delivery method', type: 'delivery', help: 'Select how you will deliver a copy to the plaintiff or their attorney.' },
      { key: 'plaintiffAttorneyName', label: 'Recipient name', help: 'Enter the plaintiff or attorney who will receive the copy.' },
      { key: 'plaintiffAttorneyAddress', label: 'Recipient address', type: 'textarea', placeholder: 'Street address, suite or unit number, city, state, ZIP code' },
      { key: 'serviceDate', label: 'Date of service', type: 'date', help: 'Enter the date for the certificate of service.' },
      { key: 'serviceSignatureName', label: 'Name for the certificate signature', help: 'Confirm the name to appear beneath the certificate of service.' },
    ] },
  ],
}

export function validateAnswers(type, form) {
  const fields = documentSections[type].flatMap(section => section.fields)
  const missing = fields.find(field => !String(form[field.key] || '').trim())
  if (missing) return `Please complete: ${missing.label}.`
  if (type === 'motion-to-dismiss' && form.deliveryMethod === 'Other' && !form.deliveryOther.trim()) {
    return 'Please provide details of your delivery method.'
  }
  return ''
}
