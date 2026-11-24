import { jsPDF } from 'jspdf'
import { formatMoney, formatPreviousBalance, rowTotals, showPending, tripTotalEntries } from './trips.js'

export function createTripPdf(trip) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const left = 9
  const right = 201
  let y = 12

  function addHeading(continued = false) {
    doc.setFont('helvetica', 'bold').setFontSize(11)
    doc.text(continued ? `Viaje ${trip.fecha} · continuación` : `Planilla de viaje · ${trip.fecha}`, left, y)
    y += 6
  }

  function write(text, bold = false) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(8)
    const lines = doc.splitTextToSize(text, right - left)
    for (const line of lines) {
      if (y > 281) {
        doc.addPage()
        y = 12
        addHeading(true)
        doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(8)
      }
      doc.text(line, left, y)
      y += 3.7
    }
  }

  addHeading()
  write(trip.destino, true)
  if (trip.detalleCarga) write('Carga del viaje: ' + trip.detalleCarga)
  write(`Efectivo inicial ${formatMoney(trip.efectivoInicial)}`)
  y += 3
  write('Cobros y reparto', true)
  trip.filas.forEach((row, index) => {
    const { cobrado, pendiente } = rowTotals(row)
    write((index + 1) + '. ' + row.cliente + (row.localidad ? ' · ' + row.localidad : ''), true)
    if (row.bultos != null && row.bultos !== '') write('Bultos: ' + row.bultos)
    write('Facturado ' + formatMoney(row.facturado) + ' · Saldo anterior ' + formatPreviousBalance(row.saldoAnterior) +
      ' · Cobrado ' + formatMoney(cobrado) + ' · ' + (pendiente < 0 ? '' : 'Pendiente ') +
      showPending(pendiente, row.saldoAnterior == null))
    write(`Efectivo ${formatMoney(row.efectivo)} · Transferencias ${formatMoney(row.transferencia)}`)
    if (row.cheques.length) write(`Cheques: ${row.cheques.map((check) => `${check.numero} (${formatMoney(check.importe)})`).join(', ')}`)
    if (row.carga) write(`Carga: ${row.carga}`)
    if (row.observaciones) write(`Observaciones: ${row.observaciones}`)
    y += 2
  })
  write('Gastos y movimientos de caja', true)
  for (const item of trip.movimientos) {
    write(`${item.fecha} · ${item.tipo} · ${item.concepto} · ${item.medio} · ${formatMoney(item.importe)}`)
    if (item.observacion) write(item.observacion)
  }
  y += 3
  write('Totales del viaje', true)
  const entries = tripTotalEntries(trip).map(([label, value]) => `${label}: ${value}`)
  for (let index = 0; index < entries.length; index += 3) write(entries.slice(index, index + 3).join(' · '))
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page).setFontSize(7)
    doc.text(`Página ${page} de ${pages}`, right, 292, { align: 'right' })
  }
  return doc
}

export async function exportTripPdf(trip, share = false) {
  const doc = createTripPdf(trip)
  const filename = `Viaje_Huerpas_${trip.fecha}.pdf`
  if (share && navigator.canShare) {
    const file = new File([doc.output('blob')], filename, { type: 'application/pdf' })
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: trip.destino })
      return
    }
  }
  doc.save(filename)
}
