import { useEffect, useRef, useState } from 'react'

let sdkPromise

async function request(path, body) {
  const response = await fetch(path, body === undefined ? undefined : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(result.error || 'Checkout is temporarily unavailable. Please try again.')
  }
  return response
}

function loadPayPal(clientId) {
  if (window.paypal?.Buttons) return Promise.resolve(window.paypal)
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&components=buttons`
      script.onload = () => window.paypal?.Buttons ? resolve(window.paypal) : reject(new Error('PayPal checkout did not load.'))
      script.onerror = () => reject(new Error('PayPal checkout did not load. Please try again.'))
      document.head.appendChild(script)
    }).catch((error) => {
      sdkPromise = null
      throw error
    })
  }
  return sdkPromise
}

function downloadPdf(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export default function PayPalCheckout({ type, documentName, answers, onEdit }) {
  const buttonsRef = useRef(null)
  const sessionsRef = useRef(new Map())
  const approvedRef = useRef('')
  const [status, setStatus] = useState('Loading secure PayPal checkout…')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [paidPdf, setPaidPdf] = useState(null)
  const filename = `${type}.pdf`

  const receivePdf = async (orderId) => {
    const session = sessionsRef.current.get(orderId)
    if (!session) throw new Error('Checkout session expired. Please start again.')
    setBusy(true)
    setStatus('Confirming your payment and preparing the PDF…')
    setError('')
    try {
      const response = await request('/api/capture-order', {
        orderId,
        checkoutToken: session.checkoutToken,
        type,
        data: answers,
      })
      const blob = await response.blob()
      if (blob.type !== 'application/pdf' || !blob.size) throw new Error('Unable to prepare the PDF. Please try downloading again.')
      setPaidPdf(blob)
      setStatus('Payment complete. Your PDF is ready.')
      downloadPdf(blob, filename)
    } catch (caught) {
      setStatus('We could not confirm the download yet.')
      setError(caught.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    let active = true
    let buttons
    async function setup() {
      try {
        const response = await request('/api/config')
        const { clientId } = await response.json()
        const paypal = await loadPayPal(clientId)
        if (!active || !buttonsRef.current) return
        setStatus('Choose PayPal to pay $50.00 securely.')
        buttons = paypal.Buttons({
          createOrder: async () => {
            setError('')
            const orderResponse = await request('/api/create-order', { type, data: answers })
            const session = await orderResponse.json()
            sessionsRef.current.set(session.orderId, session)
            return session.orderId
          },
          onApprove: async ({ orderID }) => {
            approvedRef.current = orderID
            await receivePdf(orderID)
          },
          onCancel: () => setStatus('Payment was canceled. You can try again.'),
          onError: (caught) => {
            setError(caught?.message || 'PayPal checkout encountered an error. Please try again.')
          },
        })
        if (!buttons.isEligible()) throw new Error('PayPal is unavailable for this payment. Please try again later.')
        await buttons.render(buttonsRef.current)
      } catch (caught) {
        if (active) {
          setStatus('PayPal checkout is unavailable.')
          setError(caught.message)
        }
      }
    }
    setup()
    return () => {
      active = false
      buttons?.close?.()
    }
  }, [type, answers])

  return (
    <div className="paypal-checkout" aria-live="polite">
      <div className="checkout-summary"><span>{documentName}</span><strong>$50.00 USD</strong></div>
      <p className="checkout-status">{status}</p>
      {!paidPdf && <div className="paypal-buttons" ref={buttonsRef} />}
      {error && <div className="error-box" role="alert">{error}</div>}
      {paidPdf && <button type="button" className="generate-button" onClick={() => downloadPdf(paidPdf, filename)}>Download PDF again ↓</button>}
      {!paidPdf && approvedRef.current && <button type="button" className="retry-button" disabled={busy} onClick={() => receivePdf(approvedRef.current)}>Retry download</button>}
      {!paidPdf && <button type="button" className="edit-answers" onClick={onEdit} disabled={busy}>← Edit answers</button>}
      <p className="privacy-line">Payment details are entered on PayPal. Your PDF becomes available after payment is confirmed.</p>
    </div>
  )
}
