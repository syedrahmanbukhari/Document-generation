import { useMemo, useState } from 'react'
import { generateDocumentPdf } from './pdf/generateDocument'
import DocumentQuestions from './DocumentQuestions'
import { validateAnswers } from './documentFields'

const DISCLAIMER = 'This website is a self-help document software tool, not a law firm. We do not provide legal advice, review your answers for legal sufficiency, or represent you in court. Using this website does not create an attorney–client relationship.'

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
  signatureName: '',
  serviceDate: '',
  serviceSignatureName: '',
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
    name: 'Motion to Quash',
    description: 'A request asking the court to stop or dismiss an eviction proceeding because there is a legal or procedural defect.',
    price: '$50.00',
  },
  {
    id: 'motion-to-dismiss',
    number: '02',
    name: 'Motion to Dismiss',
    description: 'A formal request asking a court to dismiss a lawsuit or a particular claim before the case proceeds further.',
    price: '$50.00',
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
      if (key === 'fullName') {
        for (const nameKey of ['signatureName', 'serviceSignatureName']) {
          if (!prev[nameKey] || prev[nameKey] === prev.fullName) next[nameKey] = value
        }
      }
      if (key === 'date' && (!prev.serviceDate || prev.serviceDate === prev.date)) next.serviceDate = value
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
    const validationError = validateAnswers(selectedDoc, form)
    if (validationError) {
      setError(validationError)
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
    try {
      generateDocumentPdf(selectedDoc, form)
    } catch (error) {
      setError(error.message || 'Unable to generate your PDF. Please try again.')
    }
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

        <aside className="legal-disclaimer top-disclaimer" aria-label="Legal disclaimer">
          <strong>Important Legal Disclaimer</strong>
          <p>{DISCLAIMER}</p>
        </aside>

        <main>
          <section className="hero">
            <div className="eyebrow">Guided document preparation</div>
            <h1>Choose a document to begin</h1>
            <p>Choose your document and complete the questionnaire to prepare your personalized PDF.</p>
          </section>

          <section className="document-grid">
            {docs.map((doc) => (
              <article className="doc-card" key={doc.id}>
                <div className="card-topline">
                  <span className="card-number">{doc.number}</span>
                </div>
                <div className="document-summary">
                  <div className="document-icon" aria-hidden="true">
                    <span></span><span></span><span></span>
                  </div>
                  <strong className="document-price" aria-label={`Price ${doc.price}`}>{doc.price}</strong>
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

      <aside className="legal-disclaimer top-disclaimer" aria-label="Legal disclaimer">
        <strong>Important Legal Disclaimer</strong>
        <p>{DISCLAIMER}</p>
      </aside>

      <main className="form-layout">
        <section className="form-intro">
          <p>Complete the information below to prepare your document. Fields marked with an asterisk (*) are required.</p>
        </section>

        <form className="question-form" onSubmit={(e) => e.preventDefault()}>
          <DocumentQuestions
            type={selectedDoc}
            form={form}
            update={update}
            sameAddress={sameAddress}
            toggleSameAddress={toggleSameAddress}
          />

          <section className="generate-panel">
            <aside className="legal-disclaimer checkout-disclaimer" aria-label="Legal disclaimer">
              <strong>Important Legal Disclaimer</strong>
              <p>{DISCLAIMER}</p>
            </aside>
            <label className="disclaimer-check">
              <input type="checkbox" checked={acceptedDisclaimer} onChange={(e) => setAcceptedDisclaimer(e.target.checked)} />
              <span>I have read and understand the legal disclaimer above.</span>
            </label>
            {error && <div className="error-box">{error}</div>}
            <button type="button" className="generate-button" onClick={generate}>Generate PDF <span>↓</span></button>
          </section>
        </form>
      </main>
    </div>
  )
}


export default App
