import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { toast } from 'sonner'

const SCHOOL_NAME = 'AL GHAZALI HIGH SCHOOL'
const SCHOOL_SUBTITLE = 'A Journey of Excellence & Knowledge'

type StudentType = {
  _id: string
  fullName: string
  grNumber?: string
  rollNumber?: string
  admissionFor?: string
  fatherName?: string
}

// Ensure the logo path is correct relative to the public folder
const LOGO_URL = '/logo.png'

async function getBase64ImageFromUrl(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to load logo", error);
    return null;
  }
}

export async function generateOMRPdf(
  students: StudentType[],
  questionCount: number,
  optionsCount: 4 | 5,
  showDetails: boolean,
  session: string,
  examName: string,
  subjectName: string,
  examDate: string
) {
  const toastId = 'omr-gen'
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
  const W = doc.internal.pageSize.width   // 595.28
  const H = doc.internal.pageSize.height  // 841.89
  const M = 36  // margin

  const optionLabels = ['A', 'B', 'C', 'D', 'E'].slice(0, optionsCount)
  const bubbleR = 8
  const cols = questionCount > 25 ? 2 : 1
  const questionsPerCol = Math.ceil(questionCount / cols)
  const questionSpacing = questionCount > 40 ? 21 : questionCount > 25 ? 23 : 25

  // Pre-load Logo
  let logoBase64 = null
  try {
    logoBase64 = await getBase64ImageFromUrl(LOGO_URL)
  } catch (e) {
    console.error('Logo loading failed:', e)
  }

  for (let si = 0; si < students.length; si++) {
    const student = students[si]
    if (si > 0) doc.addPage()

    // Progress
    if (students.length > 1 && si % 5 === 0) {
      const pct = Math.floor(((si + 1) / students.length) * 100)
      toast.loading(`Generating OMR sheets: ${pct}%...`, { id: toastId })
    }

    // ── 1. HEADER ──────────────────────────────────────────────────
    // Simple black and white header

    // Draw Logo if available
    let textStartX = M;
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', M, 25, 40, 40)
      textStartX = M + 50;
    }

    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(SCHOOL_NAME, textStartX, 38)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(SCHOOL_SUBTITLE, textStartX, 52)

    doc.setFontSize(8)
    doc.text(`Academic Session: ${session}`, textStartX, 64)

    // OMR badge on right
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('OMR ANSWER SHEET', W - M, 40, { align: 'right' })
    
    if (examDate) {
      const formattedDate = new Date(examDate).toLocaleDateString('en-GB')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(`Exam Date: ${formattedDate}`, W - M, 54, { align: 'right' })
    }

    // Draw line under header
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(1)
    doc.line(M, 75, W - M, 75)

    // ── 2. STUDENT DETAILS ──────────────────────────────────────────────
    let yTop = 85

    if (showDetails) {
      const infoH = 80
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.5)
      doc.rect(M, yTop, W - M * 2, infoH, 'S')

      const fields = [
        { label: 'STUDENT NAME:', value: (student.fullName || '').toUpperCase().trim() || '—' },
        { label: 'ROLL NO:',      value: student.rollNumber || '—' },
        { label: 'GR NUMBER:',    value: student.grNumber || '—' },
        { label: 'CLASS:',        value: (student.admissionFor || '—').toUpperCase() },
        { label: 'EXAM:',         value: (examName || '—').toUpperCase() },
        { label: 'SUBJECT:',      value: (subjectName || '—').toUpperCase() },
      ]

      const infoStartX = M + 10
      const halfColW = (W - M * 2 - 90) / 2  // 90 = QR box width

      fields.forEach((f, fi) => {
        if (!f.label) return // Skip empty cells
        const col = fi % 2
        const row = Math.floor(fi / 2)
        const fx = infoStartX + col * halfColW
        const fy = yTop + 18 + row * 22

        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(f.label, fx, fy)

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(f.value, fx + 85, fy)
      })

      // QR code box (right side of info)
      const qrSize = 65
      const qrX = W - M - qrSize - 8
      const qrY = yTop + 7
      if (student.grNumber) {
        try {
          const qrDataUrl = await QRCode.toDataURL(student.grNumber.toString(), {
            errorCorrectionLevel: 'M',
            margin: 0,
            color: { dark: '#000000', light: '#ffffff' }
          })
          doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
        } catch (e) {
          console.error('QR Error:', e)
        }
      } else {
        // Draw blank QR placeholder
        doc.setDrawColor(0, 0, 0)
        doc.rect(qrX, qrY, qrSize, qrSize, 'S')
        doc.setFontSize(7)
        doc.text('GR QR', qrX + qrSize / 2, qrY + qrSize / 2 + 3, { align: 'center' })
      }

      yTop += infoH + 10

    } else {
      // Blank template
      const infoH = 80
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.5)
      doc.rect(M, yTop, W - M * 2, infoH, 'S')

      const lineInfoX = M + 10
      const halfW = (W - M * 2 - 30) / 2
      const pairs = [
        { label: 'STUDENT NAME:', x: lineInfoX, y: yTop + 20 },
        { label: 'ROLL NO:', x: lineInfoX + halfW + 10, y: yTop + 20 },
        { label: 'GR NUMBER:', x: lineInfoX, y: yTop + 45 },
        { label: 'CLASS:', x: lineInfoX + halfW + 10, y: yTop + 45 },
        { label: 'EXAM:', x: lineInfoX, y: yTop + 70 },
        { label: 'SUBJECT:', x: lineInfoX + halfW + 10, y: yTop + 70 },
      ]
      pairs.forEach(p => {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(p.label, p.x, p.y)
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.5)
        doc.line(p.x + 85, p.y + 2, p.x + halfW - 10, p.y + 2)
      })

      yTop += infoH + 10
    }

    // ── 3. INSTRUCTIONS STRIP ───────────────────────────────────────────
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.rect(M, yTop, W - M * 2, 28, 'S')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('INSTRUCTIONS:', M + 8, yTop + 11)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text('Fill bubble COMPLETELY. Use black/blue pen only. No stray marks. Do not fold.', M + 90, yTop + 11)
    doc.text('One bubble per question. This sheet is for one exam only. Erasure may cause scanning error.', M + 8, yTop + 22)

    yTop += 35

    // ── 4. COLUMN HEADERS ───────────────────────────────────────────────
    const colWidth = (W - M * 2) / cols
    const headerY = yTop + 10

    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(1)
    doc.line(M, headerY - 12, W - M, headerY - 12)
    doc.line(M, headerY + 10, W - M, headerY + 10)

    for (let c = 0; c < cols; c++) {
      const cX = M + c * colWidth

      // Q# header
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Q. No.', cX + 22, headerY + 4, { align: 'center' })

      // Option headers (letters without circles for the header)
      optionLabels.forEach((opt, oi) => {
        const bx = cX + 55 + oi * (bubbleR * 2 + 8)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text(opt, bx, headerY + 4, { align: 'center' })
      })
    }

    // ── 5. BUBBLES GRID ─────────────────────────────────────────────────
    const bodyStartY = headerY + 22

    for (let q = 1; q <= questionCount; q++) {
      const colIdx = Math.floor((q - 1) / questionsPerCol)
      const rowIdx = (q - 1) % questionsPerCol
      const qX = M + colIdx * colWidth
      const qY = bodyStartY + rowIdx * questionSpacing

      // Question number
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(`${q}.`, qX + 30, qY + 4, { align: 'right' })

      // Bubbles
      optionLabels.forEach((opt, oi) => {
        const bx = qX + 55 + oi * (bubbleR * 2 + 8)
        const by = qY

        // Hollow circle
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.8)
        doc.circle(bx, by, bubbleR, 'S')

        // Option letter inside bubble
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.text(opt, bx, by + 3, { align: 'center' })
      })
    }

    // Vertical separator between columns
    if (cols === 2) {
      const sepX = M + colWidth
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.5)
      doc.line(sepX, headerY - 12, sepX, bodyStartY + (questionsPerCol - 1) * questionSpacing + 10)
    }

    // ── 6. FOOTER ────────────────────────────────────────────────────────
    const footerY = H - 30
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(1)
    doc.line(M, footerY - 12, W - M, footerY - 12)

    const systemTime = new Date().toLocaleString('en-GB')

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `${SCHOOL_NAME}  |  Session: ${session}  |  Exam: ${examName || 'N/A'}  |  Subject: ${subjectName || 'N/A'}`,
      M, footerY + 2
    )
    
    doc.text(`System Generated on: ${systemTime}`, M, footerY + 12)

    if (students.length > 1) {
      doc.setFontSize(8)
      doc.text(`Page ${si + 1} of ${students.length}`, W - M, footerY + 2, { align: 'right' })
    }
  }

  // ── Save ──
  const isSingle = students.length === 1 && students[0].fullName
  const fname = isSingle
    ? `OMR_${students[0].fullName.replace(/\s+/g, '_')}_${session}.pdf`
    : `OMR_${students[0]?.admissionFor || 'Sheets'}_${session}_${Date.now()}.pdf`

  doc.save(fname)
  toast.success(`✅ ${students.length} OMR sheet(s) generated!`, { id: toastId })
}
