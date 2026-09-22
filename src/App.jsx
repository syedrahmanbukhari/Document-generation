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
    description: 'Prepare page 1 of your motion with the court information, case details, and circumstances of service.',
    badge: 'Document #1',
  },
  {
    id: 'motion-to-dismiss',
    number: '02',
    name: 'Relief and Certificate of Service',
    description: 'Prepare page 2 with the requested relief, your contact information, and certificate of service.',
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
  const isFirstDocument = selectedDoc === 'motion-to-quash'

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
    setAcceptedDisclaimer(false)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goHome = () => {
    setSelectedDoc(null)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const validate = () => {
    const required = isFirstDocument ? [
      ['courtType', 'Court type'], ['county', 'County'], ['plaintiff', 'Plaintiff name'], ['defendant', 'Defendant name'],
      ['caseNumber', 'Case number'], ['fullName', 'Full legal name'], ['propertyAddress', 'Property address'],
      ['circumstances', 'Details of service'],
    ] : [
      ['fullName', 'Full legal name'],
      ['mailingAddress', 'Mailing address'], ['phone', 'Phone number'], ['email', 'Email address'],
      ['date', 'Document date'], ['deliveryMethod', 'Delivery method'],
      ['plaintiffAttorneyName', 'Recipient name'], ['plaintiffAttorneyAddress', 'Recipient address'],
    ]
    const missing = required.find(([key]) => !String(form[key] || '').trim())
    if (missing) {
      setError(`Please complete: ${missing[1]}.`)
      return false
    }
    if (!isFirstDocument && form.deliveryMethod === 'Other' && !form.deliveryOther.trim()) {
      setError('Please provide details of your delivery method.')
      return false
    }
    if (!acceptedDisclaimer) {
      setError('Please acknowledge the educational-use statement before generating your PDF.')
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
            <p>Select the page you need and complete its questionnaire to download a separate PDF.</p>
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
          <h1>{isFirstDocument ? 'Enter your case details.' : 'Complete your service information.'}</h1>
          <p>Complete the information below to prepare your document. Fields marked with an asterisk (*) are required.</p>
        </section>

        <form className="question-form" onSubmit={(e) => e.preventDefault()}>
          {isFirstDocument && (
          <FormSection number="A" title="Court information" subtitle="Questions 1–5">
            <Field label="1. Court type" help="Select the court listed on your case documents." required>
              <select value={form.courtType} onChange={(e) => update('courtType', e.target.value)}>
                <option value="">Select a court</option>
                <option>Magistrate</option>
                <option>State</option>
                <option>Superior</option>
              </select>
            </Field>
            <Field label="2. County" help="Enter the county where the case was filed." required>
              <input value={form.county} onChange={(e) => update('county', e.target.value)} placeholder="e.g. Fulton" />
            </Field>
            <Field label="3. Plaintiff name" help="Enter the person or organization named as the plaintiff on your case documents." required>
              <input value={form.plaintiff} onChange={(e) => update('plaintiff', e.target.value)} placeholder="Plaintiff name" />
            </Field>
            <Field label="4. Defendant name" help="Enter the defendant name or names exactly as shown on your case documents." required>
              <input value={form.defendant} onChange={(e) => update('defendant', e.target.value)} placeholder="Defendant name or names" />
            </Field>
            <Field label="5. Case number" required>
              <input value={form.caseNumber} onChange={(e) => update('caseNumber', e.target.value)} placeholder="Case number" />
            </Field>
          </FormSection>
          )}

          <FormSection number={isFirstDocument ? 'B' : 'A'} title="Your information" subtitle={isFirstDocument ? 'Questions 6–7' : 'Questions 1–4'}>
            <Field label={`${isFirstDocument ? 6 : 1}. Full legal name`} help="Enter your complete legal name, including any middle names." required>
              <input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="Full legal name" />
            </Field>
            {isFirstDocument ? (
            <Field label="7. Property address" help="Enter the full address of the property involved in this case." required>
              <textarea rows="2" value={form.propertyAddress} onChange={(e) => update('propertyAddress', e.target.value)} placeholder="Street address, unit number, city, state, ZIP code" />
            </Field>
            ) : (
            <>
            {form.propertyAddress.trim() && (
            <label className="check-row">
              <input type="checkbox" checked={sameAddress} onChange={(e) => toggleSameAddress(e.target.checked)} />
              <span>My mailing address is the same as the property address.</span>
            </label>
            )}
            <Field label="2. Mailing address" help="Enter the address where you receive correspondence." required>
              <textarea rows="2" value={form.mailingAddress} onChange={(e) => update('mailingAddress', e.target.value)} placeholder="Street address, unit number, city, state, ZIP code" />
            </Field>
            <div className="two-col">
              <Field label="3. Phone number" required>
                <input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="Phone number" />
              </Field>
              <Field label="4. Email address" required>
                <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="name@example.com" />
              </Field>
            </div>
            </>
            )}
          </FormSection>

          <FormSection number={isFirstDocument ? 'C' : 'B'} title={isFirstDocument ? 'Service details' : 'Document date'} subtitle={isFirstDocument ? 'Question 8' : 'Question 5'}>
            {isFirstDocument ? (
            <Field label="8. Details of service" help="Describe what happened with the court papers. Include relevant dates, locations, how the papers were delivered or discovered, and who received them, if anyone." required>
              <textarea rows="6" value={form.circumstances} onChange={(e) => update('circumstances', e.target.value)} placeholder="Describe the circumstances in your own words" />
            </Field>
            ) : (
            <Field label="5. Document date" help="Select the date to appear on your document." required>
              <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
            </Field>
            )}
          </FormSection>

          {!isFirstDocument && (
          <FormSection number="C" title="Certificate of service" subtitle="Questions 6–8">
            <Field label="6. Delivery method" help="Select how you will deliver a copy to the plaintiff or their attorney." required>
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
              <Field label="Delivery method details" help="Specify the other delivery method you will use." required>
                <input value={form.deliveryOther} onChange={(e) => update('deliveryOther', e.target.value)} placeholder="Enter delivery method details" />
              </Field>
            )}
            <Field label="7. Recipient name" help="Enter the name of the plaintiff or attorney who will receive the copy." required>
              <input value={form.plaintiffAttorneyName} onChange={(e) => update('plaintiffAttorneyName', e.target.value)} placeholder="Person or organization name" />
            </Field>
            <Field label="8. Recipient address" help="Enter the full address of the plaintiff or attorney receiving the copy." required>
              <textarea rows="3" value={form.plaintiffAttorneyAddress} onChange={(e) => update('plaintiffAttorneyAddress', e.target.value)} placeholder="Street address, suite or unit number, city, state, ZIP code" />
            </Field>
          </FormSection>
          )}

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
