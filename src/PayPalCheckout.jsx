import { useEffect, useRef, useState } from 'react'
import { HOSTED_BUTTONS, loadHostedPayPal } from './paypalHosted.js'
import { saveDownloadRequest } from './downloadRequest.js'

export default function PayPalCheckout({ type, documentName, answers, onEdit }) {
  const buttonsRef = useRef(null)
  const [instanceId] = useState(() => crypto.randomUUID())
  const [status, setStatus] = useState('Preparing secure PayPal checkout…')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    const container = document.createElement('div')
    container.id = `paypal-container-${HOSTED_BUTTONS[type]}-${instanceId}-${retry}`
    buttonsRef.current.appendChild(container)
    setError('')
    setStatus('Preparing secure PayPal checkout…')
    async function setup() {
      try {
        try { saveDownloadRequest(type, answers) }
        catch { throw new Error('Your answers could not be saved. Allow storage in this browser, then reload checkout before paying.') }
        const paypal = await loadHostedPayPal()
        if (!active) return
        await paypal.HostedButtons({ hostedButtonId: HOSTED_BUTTONS[type] }).render(`#${container.id}`)
        if (active) setStatus('Choose your payment method below.')
      } catch (caught) {
        if (active) {
          container.replaceChildren()
          setStatus('Checkout could not be loaded.')
          setError(caught.message || 'Unable to load PayPal. Please try again.')
        }
      }
    }
    setup()
    return () => {
      active = false
      container.remove()
    }
  }, [type, answers, instanceId, retry])

  return (
    <div className="paypal-checkout" aria-live="polite">
      <ol className="checkout-steps" aria-label="Checkout progress">
        <li className="complete"><span>✓</span> Preview</li>
        <li className="current" aria-current="step"><span>2</span> Payment</li>
        <li><span>3</span> Download</li>
      </ol>
      <div className="checkout-heading">
        <h2>Secure checkout</h2>
        <p>Complete your payment with PayPal, then return to your document page.</p>
      </div>
      <div className="checkout-summary"><span>{documentName}<small>Personalized PDF document</small></span><strong>$50.00 <small>USD</small></strong></div>
      <p className="checkout-status">{status}</p>
      <div className="paypal-hosted-buttons" ref={buttonsRef} />
      {error && <>
        <div className="error-box" role="alert">{error}</div>
        <button type="button" className="retry-button" onClick={() => setRetry(value => value + 1)}>Reload checkout</button>
      </>}
      <div className="checkout-return-note"><strong>After checkout</strong><p>PayPal will direct you back to the document page. If a return button appears, select it to continue. Use the same browser to access your document.</p></div>
      <button type="button" className="edit-answers" onClick={onEdit}>← Edit answers</button>
      <p className="privacy-line">Payment details are entered on PayPal. Your questionnaire answers are saved on this device for 24 hours so your document is available when you return.</p>
    </div>
  )
}
