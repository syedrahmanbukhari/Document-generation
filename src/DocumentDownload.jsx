import { useEffect, useState } from 'react'
import { clearDownloadRequest, readDownloadRequest } from './downloadRequest.js'

const names = { 'motion-to-quash': 'Motion to Quash', 'motion-to-dismiss': 'Motion to Dismiss' }

export default function DocumentDownload({ disclaimer }) {
  const [request, setRequest] = useState(() => {
    try { return readDownloadRequest(new URLSearchParams(window.location.search).get('document')) }
    catch { return null }
  })
  const [pdfUrl, setPdfUrl] = useState('')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!request) return
    const controller = new AbortController()
    let objectUrl = ''
    setError('')
    setPdfUrl('')
    async function prepare() {
      try {
        const response = await fetch('/api/preview', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: request.type, data: request.data }), signal: controller.signal,
        })
        if (!response.ok) throw new Error('Unable to prepare your PDF. Please try again.')
        const blob = await response.blob()
        if (controller.signal.aborted) return
        if (blob.type !== 'application/pdf' || !blob.size) throw new Error('Unable to prepare your PDF. Please try again.')
        objectUrl = URL.createObjectURL(blob)
        setPdfUrl(objectUrl)
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught.message)
      }
    }
    prepare()
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [request, retry])

  function clearDetails() {
    try { clearDownloadRequest(request.type); setRequest(null) }
    catch { setError('Unable to clear saved details. Please check your browser settings.') }
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="brand-mark">TR</div>
        <div><div className="brand-name">Tenant Resource Center</div><div className="brand-sub">Your document download</div></div>
        <a className="back-button download-home" href="/">← Documents</a>
      </header>
      <aside className="legal-disclaimer top-disclaimer" aria-label="Legal disclaimer"><strong>Important Legal Disclaimer</strong><p>{disclaimer}</p></aside>
      <main className="download-layout">
        <section className="download-card" aria-live="polite">
          <div className="download-file-icon" aria-hidden="true"><span></span><span></span><span></span></div>
          <div className="eyebrow">Tenant Resource Center</div>
          <h1>{request ? 'Your document download' : 'Your document is not available in this browser'}</h1>
          <p className="download-description">{request ? 'Your personalized document is ready. Keep a copy for your records.' : 'Return using the same browser where you completed the questionnaire. Saved details are available for 24 hours.'}</p>
          {request && <>
            <div className="download-document-details"><strong>{names[request.type]}</strong><span>Watermarked PDF preview</span></div>
            {error ? <><div className="error-box" role="alert">{error}</div><button className="download-button" onClick={() => setRetry(value => value + 1)}>Try again</button></> : pdfUrl ? <a className="download-button" href={pdfUrl} download={`${request.type}-preview.pdf`}>Download preview <span>↓</span></a> : <p className="preview-loading">Preparing your document…</p>}
            <p className="download-hint">If your browser opens the PDF, use its download or save option.</p>
            <button className="clear-details" onClick={clearDetails}>Clear saved questionnaire details from this device</button>
          </>}
          {!request && <p className="download-hint">If you already paid, keep your PayPal receipt and contact the site owner before starting another checkout.</p>}
          <a className="download-back" href="/">Back to documents →</a>
        </section>
      </main>
    </div>
  )
}
