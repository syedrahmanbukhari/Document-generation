import { useEffect, useRef, useState } from 'react'
import { HOSTED_BUTTONS, loadHostedPayPal } from './paypalHosted.js'
import { documentSections } from './documentFields.js'

const supportEmail = (import.meta.env.VITE_SUPPORT_EMAIL || '').trim()
const hasSupportEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)

export default function PayPalCheckout({ type, documentName, answers, onEdit }) {
  const buttonsRef = useRef(null)
  const [requestId] = useState(() => crypto.randomUUID())
  const [status, setStatus] = useState('Loading secure PayPal checkout…')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [retry, setRetry] = useState(0)

  function saveQuestionnaire() {
    const keys = documentSections[type].flatMap(section => section.fields.map(field => field.key))
    if (type === 'motion-to-dismiss') keys.push('deliveryOther')
    const data = Object.fromEntries(keys.map(key => [key, answers[key] || '']))
    const file = new Blob([JSON.stringify({ requestId, type, data }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `${type}-request-${requestId}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    setSaved(true)
  }

  useEffect(() => {
    if (!hasSupportEmail || !saved) return
    let active = true
    const container = document.createElement('div')
    container.id = `paypal-container-${HOSTED_BUTTONS[type]}-${requestId}-${retry}`
    buttonsRef.current.appendChild(container)
    setError('')
    setStatus('Loading secure PayPal checkout…')
    async function setup() {
      try {
        const paypal = await loadHostedPayPal()
        if (!active) return
        await paypal.HostedButtons({ hostedButtonId: HOSTED_BUTTONS[type] }).render(`#${container.id}`)
        if (active) setStatus('Pay $50.00 securely with PayPal. Your PDF will be delivered by email after payment verification.')
      } catch {
        if (active) {
          container.replaceChildren()
          setStatus('PayPal checkout is unavailable.')
          setError('Unable to load PayPal. Please try again or contact support.')
        }
      }
    }
    setup()
    return () => {
      active = false
      container.remove()
    }
  }, [type, requestId, retry, saved])

  const emailLink = `mailto:${supportEmail}?subject=${encodeURIComponent(`${documentName} request ${requestId}`)}&body=${encodeURIComponent(`Hello Tenant Resource Center,\n\nI am requesting my ${documentName} PDF.\nRequest reference: ${requestId}\nPayPal transaction ID: \n\nI have attached my completed questionnaire and PayPal receipt. Please reply to this email with my PDF after verifying payment.`)}`

  return (
    <div className="paypal-checkout" aria-live="polite">
      <div className="checkout-summary"><span>{documentName}</span><strong>$50.00 USD</strong></div>
      <div className="delivery-instructions">
        <strong>How to receive your PDF</strong>
        <ol>
          <li>Save your completed questionnaire using the button below.</li>
          <li>Pay $50.00 using PayPal.</li>
          <li>{hasSupportEmail ? <>Email your questionnaire file and PayPal receipt to <a href={emailLink}>{supportEmail}</a>.</> : 'Contact support when checkout becomes available.'}</li>
        </ol>
        <p>We will verify your payment and email your PDF without the watermark. Delivery is manual; there is no instant download.</p>
      </div>
      <button type="button" className="generate-button" onClick={saveQuestionnaire}>{saved ? 'Save questionnaire again ↓' : 'Save completed questionnaire ↓'}</button>
      {saved && <p className="checkout-status">Your questionnaire file is ready. Attach it to your email with your PayPal receipt.</p>}
      {hasSupportEmail ? <>
        <p className="checkout-status">{saved ? status : 'Save your completed questionnaire to continue to PayPal.'}</p>
        {saved && <div className="paypal-hosted-buttons" ref={buttonsRef} />}
        {error && <>
          <div className="error-box" role="alert">{error}</div>
          <button type="button" className="retry-button" onClick={() => setRetry(value => value + 1)}>Reload PayPal</button>
        </>}
        <a className="contact-support" href={emailLink}>Email your document request ↗</a>
      </> : <p className="error-box" role="alert">Checkout is temporarily unavailable while we complete our delivery setup. You can still preview your document and save your questionnaire.</p>}
      <button type="button" className="edit-answers" onClick={onEdit}>← Edit answers</button>
      <p className="privacy-line">Payment details are entered on PayPal. Keep your questionnaire file and receipt until your PDF has been delivered.</p>
    </div>
  )
}
