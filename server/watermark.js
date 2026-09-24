import { GState } from 'jspdf'

export function addPreviewWatermark(pdf) {
  for (let page = 1; page <= pdf.getNumberOfPages(); page += 1) {
    pdf.setPage(page)
    pdf.saveGraphicsState()
    pdf.setGState(new GState({ opacity: 0.22 }))
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(75, 75, 75)
    pdf.setFontSize(27)
    for (const y of [190, 390, 590]) {
      pdf.text('TENANT RESOURCE CENTER', 306, y, { align: 'center', angle: -30 })
      pdf.text('PREVIEW', 306, y + 35, { align: 'center', angle: -30 })
    }
    pdf.restoreGraphicsState()
  }
  return pdf
}
