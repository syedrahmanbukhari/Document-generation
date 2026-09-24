import { useEffect, useState } from 'react'

export default function DocumentPreview({ type, answers }) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let objectUrl = ''
    async function load() {
      try {
        const response = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, data: answers }),
          signal: controller.signal,
        })
        if (!response.ok) {
          const result = await response.json().catch(() => ({}))
          throw new Error(result.error || 'Unable to prepare the preview. Please try again.')
        }
        const blob = await response.blob()
        if (controller.signal.aborted) return
        if (blob.type !== 'application/pdf' || !blob.size) throw new Error('Unable to prepare the preview. Please try again.')
        objectUrl = URL.createObjectURL(blob)
        setPreviewUrl(objectUrl)
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught.message)
      }
    }
    load()
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [type, answers])

  return (
    <section className="document-preview" id="document-preview" aria-label="Document preview">
      <div className="preview-heading">
        <div>
          <h2>Preview your document</h2>
          <p>Review your answers before paying. The Tenant Resource Center watermark is removed from the PDF after payment.</p>
        </div>
        <span>Watermarked preview</span>
      </div>
      {error && <div className="error-box" role="alert">{error}</div>}
      {!error && !previewUrl && <p className="preview-loading">Preparing your preview…</p>}
      {previewUrl && <>
        <iframe className="preview-frame" src={`${previewUrl}#toolbar=0`} title="Watermarked document preview" />
        <a className="preview-open" href={previewUrl} target="_blank" rel="noopener noreferrer">Open preview in a new tab ↗</a>
      </>}
    </section>
  )
}
