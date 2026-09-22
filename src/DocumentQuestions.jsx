import { documentSections } from './documentFields'

export default function DocumentQuestions({ type, form, update, sameAddress, toggleSameAddress }) {
  let questionNumber = 0
  return documentSections[type].map((section, index) => {
    const start = questionNumber + 1
    const end = questionNumber + section.fields.length
    return (
      <section className="form-section" key={section.title}>
        <div className="section-heading">
          <div className="section-letter">{String.fromCharCode(65 + index)}</div>
          <div><h2>{section.title}</h2><p>{start === end ? `Question ${start}` : `Questions ${start}–${end}`}</p></div>
        </div>
        <div className="section-body">
          {section.fields.map(field => {
            questionNumber += 1
            const id = `field-${field.key}`
            const helpId = field.help ? `${id}-help` : undefined
            const common = { id, value: form[field.key], onChange: e => update(field.key, e.target.value), required: true, 'aria-describedby': helpId }
            return (
              <div className="field" key={field.key}>
                <label className="field-label" htmlFor={field.type === 'delivery' ? undefined : id} id={`${id}-label`}>
                  {questionNumber}. {field.label}<em>*</em>
                </label>
                {field.help && <span className="field-help" id={helpId}>{field.help}</span>}
                {field.type === 'select' ? (
                  <select {...common}><option value="">Select a court</option>{field.options.map(option => <option key={option}>{option}</option>)}</select>
                ) : field.type === 'textarea' ? (
                  <textarea {...common} rows={field.rows || 2} placeholder={field.placeholder || field.label} />
                ) : field.type === 'delivery' ? (
                  <>
                    <div className="choice-grid" role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={helpId}>
                      {['Hand delivery', 'U.S. Mail', 'Other'].map(method => (
                        <label className={`choice-card ${form.deliveryMethod === method ? 'active' : ''}`} key={method}>
                          <input type="radio" name="delivery" value={method} checked={form.deliveryMethod === method} onChange={e => update('deliveryMethod', e.target.value)} required />
                          <span>{method}</span>
                        </label>
                      ))}
                    </div>
                    {form.deliveryMethod === 'Other' && <label className="field">
                      <span className="field-label">Delivery method details<em>*</em></span>
                      <input value={form.deliveryOther} onChange={e => update('deliveryOther', e.target.value)} placeholder="Enter delivery method details" required />
                    </label>}
                  </>
                ) : (
                  <input {...common} type={field.type || 'text'} placeholder={field.placeholder || field.label} />
                )}
                {field.key === 'mailingAddress' && <label className="check-row">
                  <input type="checkbox" checked={sameAddress} onChange={e => toggleSameAddress(e.target.checked)} />
                  <span>My mailing address is the same as the property address.</span>
                </label>}
              </div>
            )
          })}
        </div>
      </section>
    )
  })
}
