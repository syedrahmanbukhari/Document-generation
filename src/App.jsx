import { useMemo, useState } from 'react'
import { generateDocumentPdf } from './pdf/generateDocument'

const initialForm = {
  courtType: '',
  county: '',
  plaintiff: '',
  defendant: '',
  caseNumber: '',
  fullName: '',
  propertyAddress: '',
  circumstances: '',
  date: '',
  mailingAddress: '',
  phone: '',
  email: '',
  deliveryMethod: '',
  deliveryOther: '',
  plaintiffAttorneyName: '',
  plaintiffAttorneyAddress: '',
}

const docs = [
  {
    id: 'motion-to-quash',
    number: '01',
    name: 'Motion to Dismiss / Quash',
    description: 'Request dismissal for improper service or, alternatively, quash service using your answers.',
    badge: 'Document #1',
  },
  {
    id: 'motion-to-dismiss',
    number: '02',
    name: 'Motion to Dismiss',
    description: 'Generate the improper-service motion and certificate of service using your answers.',
    badge: 'Document #2',
  },
]

function App() {
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [sameAddress, setSameAddress] = useState(false)
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false)
  const [error, setError] = useState('')

  const selected = useMemo(() => docs.find((d) => d.id === selectedDoc), [selectedDoc])

  const update = (key, value) => {
    setError('')
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'propertyAddress' && sameAddress) next.mailingAddress = value
      return next
    })
  }

  const toggleSameAddress = (checked) => {
    setSameAddress(checked)
    if (checked) setForm((prev) => ({ ...prev, mailingAddress: prev.propertyAddress }))
  }

  const openDocument = (id) => {
    setSelectedDoc(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goHome = () => {
    setSelectedDoc(null)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const validate = () => {
    const required = [
      ['courtType', 'Court type'], ['county', 'County'], ['plaintiff', 'Plaintiff'], ['defendant', 'Defendant'],
      ['caseNumber', 'Case number'], ['fullName', 'Full name'], ['propertyAddress', 'Property address'],
      ['circumstances', 'Description of what happened'], ['date', 'Date'], ['mailingAddress', 'Mailing address'],
      ['phone', 'Phone number'], ['email', 'Email address'], ['deliveryMethod', 'Delivery method'],
      ['plaintiffAttorneyName', "Plaintiff or plaintiff's attorney name"],
      ['plaintiffAttorneyAddress', "Plaintiff or plaintiff's attorney address"],
    ]
    const missing = required.find(([key]) => !String(form[key] || '').trim())
    if (missing) {
      setError(`Please complete: ${missing[1]}.`)
      return false
    }
    if (form.deliveryMethod === 'Other' && !form.deliveryOther.trim()) {
      setError('Please describe the “Other” delivery method.')
      return false
    }
    if (!acceptedDisclaimer) {
      setError('Please confirm the educational-use disclaimer before generating the PDF.')
      return false
    }
    return true
  }

  const generate = () => {
    if (!validate()) return
    generateDocumentPdf(selectedDoc, form)
  }

  if (!selectedDoc) {
    return (
      <div className="site-shell">
        <header className="topbar">
          <div className="brand-mark">TR</div>
          <div>
            <div className="brand-name">Tenant Resource Center</div>
            <div className="brand-sub">Educational self-help documents</div>
          </div>
          <div className="topbar-pill">Georgia</div>
        </header>

        <main>
          <section className="hero">
            <div className="eyebrow">Guided document preparation</div>
            <h1>Choose a document to begin.</h1>
            <p>Answer a short guided form once. Repeated information such as your full name and date is automatically reused throughout the document.</p>
          </section>

          <section className="document-grid">
            {docs.map((doc) => (
              <article className="doc-card" key={doc.id}>
                <div className="card-topline">
                  <span className="card-number">{doc.number}</span>
                  <span className="card-badge">{doc.badge}</span>
                </div>
                <div className="document-icon" aria-hidden="true">
                  <span></span><span></span><span></span>
                </div>
                <h2>{doc.name}</h2>
                <p>{doc.description}</p>
                <button onClick={() => openDocument(doc.id)}>Start questionnaire <span>→</span></button>
              </article>
            ))}
          </section>

          <section className="how-it-works">
            <div><strong>01</strong><span>Choose a document</span></div>
            <div><strong>02</strong><span>Answer the guided questions</span></div>
            <div><strong>03</strong><span>Generate your PDF</span></div>
          </section>

          <section className="disclaimer-card">
            <strong>Educational use only.</strong>
            <p>This site provides self-help educational document preparation and is not a substitute for advice from a licensed attorney.</p>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="site-shell form-shell">
      <header className="topbar sticky">
        <button className="back-button" onClick={goHome}>← Back</button>
        <div className="form-title-wrap">
          <div className="brand-name">{selected.name}</div>
          <div className="brand-sub">Guided questionnaire</div>
        </div>

      </header>

      <main className="form-layout">
        <section className="form-intro">
          <div className="eyebrow">{selected.badge}</div>
          <h1>Tell us about the case.</h1>
        </section>

        <form className="question-form" onSubmit={(e) => e.preventDefault()}>
          <FormSection number="A" title="Court information" subtitle="Questions 1–5">
            <Field label="1. In which court has your case been filed?" required>
              <select value={form.courtType} onChange={(e) => update('courtType', e.target.value)}>
                <option value="">Select court</option>
                <option>Magistrate</option>
                <option>State</option>
                <option>Superior</option>
              </select>
            </Field>
            <Field label="2. Which County?" required>
              <input value={form.county} onChange={(e) => update('county', e.target.value)} placeholder="e.g. Fulton" />
            </Field>
            <Field label="3. Plaintiff" help="Landlord, apartment complex, or other listed plaintiff." required>
              <input value={form.plaintiff} onChange={(e) => update('plaintiff', e.target.value)} placeholder="Plaintiff name" />
            </Field>
            <Field label="4. Defendant" help="Your name, all other occupants, or whoever is listed in the case." required>
              <input value={form.defendant} onChange={(e) => update('defendant', e.target.value)} placeholder="Defendant name(s)" />
            </Field>
            <Field label="5. Case Number" required>
              <input value={form.caseNumber} onChange={(e) => update('caseNumber', e.target.value)} placeholder="Case number" />
            </Field>
          </FormSection>

          <FormSection number="B" title="Your information" subtitle="Questions 6, 7, 10–13 & 18">
            <Field label="6 / 10 / 18. Your Full Legal Name" help="Enter once; it will automatically fill all three name locations." required>
              <input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="First and last name" />
            </Field>
            <Field label="7. Full Property Address" required>
              <textarea rows="2" value={form.propertyAddress} onChange={(e) => update('propertyAddress', e.target.value)} placeholder="Street, city, state, ZIP" />
            </Field>
            <label className="check-row">
              <input type="checkbox" checked={sameAddress} onChange={(e) => toggleSameAddress(e.target.checked)} />
              <span>My mailing address is the same as the property address.</span>
            </label>
            <Field label="11. Mailing Address" required>
              <textarea rows="2" value={form.mailingAddress} onChange={(e) => update('mailingAddress', e.target.value)} placeholder="Mailing address" />
            </Field>
            <div className="two-col">
              <Field label="12. Phone Number" required>
                <input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="Phone number" />
              </Field>
              <Field label="13. Email Address" required>
                <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="name@example.com" />
              </Field>
            </div>
          </FormSection>

          <FormSection number="C" title="Service details" subtitle="Questions 8, 9 & 17">
            <Field label="8. Describe exactly what happened" help="For example: you never received papers, papers were posted but not mailed, or papers were given to someone who does not live in the home." required>
              <textarea rows="6" value={form.circumstances} onChange={(e) => update('circumstances', e.target.value)} placeholder="Describe the facts in your own words..." />
            </Field>
            <Field label="9 / 17. Date" help="Enter once; this date fills both date locations." required>
              <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
            </Field>
          </FormSection>

          <FormSection number="D" title="Certificate of service" subtitle="Questions 14–16">
            <Field label="14. How will you deliver a copy to your landlord?" required>
              <div className="choice-grid">
                {['Hand delivery', 'U.S. Mail', 'Other'].map((method) => (
                  <label className={`choice-card ${form.deliveryMethod === method ? 'active' : ''}`} key={method}>
                    <input type="radio" name="delivery" value={method} checked={form.deliveryMethod === method} onChange={(e) => update('deliveryMethod', e.target.value)} />
                    <span>{method}</span>
                  </label>
                ))}
              </div>
            </Field>
            {form.deliveryMethod === 'Other' && (
              <Field label="Describe other delivery method" required>
                <input value={form.deliveryOther} onChange={(e) => update('deliveryOther', e.target.value)} placeholder="Describe delivery method" />
              </Field>
            )}
            <Field label="15. Plaintiff or Plaintiff’s Attorney Name" required>
              <input value={form.plaintiffAttorneyName} onChange={(e) => update('plaintiffAttorneyName', e.target.value)} placeholder="Name" />
            </Field>
            <Field label="16. Plaintiff or Plaintiff’s Attorney Address" required>
              <textarea rows="3" value={form.plaintiffAttorneyAddress} onChange={(e) => update('plaintiffAttorneyAddress', e.target.value)} placeholder="Street, city, state, ZIP" />
            </Field>
          </FormSection>

          <section className="generate-panel">
            <label className="disclaimer-check">
              <input type="checkbox" checked={acceptedDisclaimer} onChange={(e) => setAcceptedDisclaimer(e.target.checked)} />
              <span>I understand this is an educational self-help document tool and does not provide legal advice.</span>
            </label>
            {error && <div className="error-box">{error}</div>}
            <button type="button" className="generate-button" onClick={generate}>Generate PDF <span>↓</span></button>
          </section>
        </form>
      </main>
    </div>
  )
}

function FormSection({ number, title, subtitle, children }) {
  return (
    <section className="form-section">
      <div className="section-heading">
        <div className="section-letter">{number}</div>
        <div><h2>{title}</h2><p>{subtitle}</p></div>
      </div>
      <div className="section-body">{children}</div>
    </section>
  )
}

function Field({ label, help, required, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}{required && <em>*</em>}</span>
      {help && <span className="field-help">{help}</span>}
      {children}
    </label>
  )
}

export default App
