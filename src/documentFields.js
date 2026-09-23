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
    { title: 'Court information', fields: [
      { key: 'courtType', label: 'In which court has your case been filed?', help: '(Magistrate, State, Superior)', type: 'select', options: ['Magistrate', 'State', 'Superior'] },
      { key: 'county', label: 'Which County?' },
      { key: 'plaintiff', label: 'Plaintiff? (Landlord’s name, apartment complex etc.)' },
      { key: 'defendant', label: 'Defendant? (Your name, all other occupants, whoever is listed)' },
      { key: 'caseNumber', label: 'Case Number?' },
    ] },
    { title: 'Case and service details', fields: [
      { key: 'fullName', label: 'Your First & Last Name?' },
      { key: 'propertyAddress', label: 'Address?', type: 'textarea', placeholder: 'Street address, unit number, city, state, ZIP code' },
      { key: 'circumstances', label: 'Describe exactly what happened (You never received papers, papers were posted on your door but were not mailed, papers were given to someone who doesn’t live in the home)', help: 'Be sure to include specific dates & details', type: 'textarea', rows: 6, placeholder: 'Describe exactly what happened' },
    ] },
    { title: 'Document and contact information', fields: [
      { key: 'date', label: 'Date?', type: 'date' },
      { key: 'signatureName', label: 'Full Name?' },
      { key: 'mailingAddress', label: 'Address?', type: 'textarea', placeholder: 'Street address, unit number, city, state, ZIP code' },
      { key: 'phone', label: 'Phone number?', type: 'tel' },
      { key: 'email', label: 'Email Address?', type: 'email', placeholder: 'name@example.com' },
    ] },
    { title: 'Certificate of service', fields: [
      { key: 'deliveryMethod', label: 'How will you deliver a copy to your landlord?', type: 'delivery' },
      { key: 'plaintiffAttorneyName', label: 'Plantiff or Plantiff’s Attorney Name?' },
      { key: 'plaintiffAttorneyAddress', label: 'Plantiff or Plantiff’s Attorneys address?', type: 'textarea', placeholder: 'Street address, suite or unit number, city, state, ZIP code' },
      { key: 'serviceDate', label: 'Date?', type: 'date' },
      { key: 'serviceSignatureName', label: 'Your Full Name?' },
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
