import { jsPDF } from 'jspdf'

const margin = 8
const gap = 7
const width = (210 - 2 * margin - gap) / 2
const top = 11
const bottom = 283
const dateFormat = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' })
const states = { 'no-leido': 'NO LEÍDO', leido: 'LEÍDO', editado: 'EDITADO' }

export function createOrdersPdf(pedidos) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const positions = [top, top]
  let column = 0
  let order

  function pageRule() {
    doc.setDrawColor(215)
    doc.line(105, margin, 105, bottom)
  }

  function style({ font = 'normal', size = 8 }) {
    doc.setFont('helvetica', font)
    doc.setFontSize(size)
  }

  function wrap(text, options = {}) {
    style(options)
    return doc.splitTextToSize(String(text ?? ''), width - (options.indent ?? 0)).map((text) => ({
      text, height: 3.5, ...options,
    }))
  }

  function draw(row) {
    style(row)
    const x = margin + column * (width + gap)
    if (row.box) {
      doc.setDrawColor(115)
      doc.rect(x, positions[column] - 2.3, 2.5, 2.5)
    }
    doc.text(row.text, x + (row.indent ?? 0), positions[column])
    positions[column] += row.height
  }

  function advance(continuation) {
    if (column === 0) column = 1
    else {
      doc.addPage()
      column = 0
      positions.fill(top)
      pageRule()
    }
    if (continuation) {
      const shortName = String(order.clienteNombre ?? '').replace(/\s+/g, ' ').slice(0, 53)
      wrap(`Pedido ${order.number} · continuación · ${shortName}`, { font: 'bold' }).forEach(draw)
    }
  }

  function block(rows, { continuation = true, keep = true } = {}) {
    const height = rows.reduce((total, row) => total + row.height, 0)
    if (keep && positions[column] + height > bottom && height <= bottom - top - 11) advance(continuation)
    for (const row of rows) {
      if (positions[column] + row.height > bottom) advance(true)
      draw(row)
    }
  }

  pageRule()
  const sorted = [...pedidos].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
  sorted.forEach((pedido, index) => {
    order = { ...pedido, number: index + 1 }
    const date = new Date(pedido.fecha)
    if (positions[column] + 16 > bottom) advance(false)
    const heading = [
      ...wrap(`Pedido ${order.number} · ${pedido.clienteNombre ?? ''}`, { font: 'bold', size: 10, height: 4.5 }),
      ...wrap(`${Number.isNaN(date.getTime()) ? pedido.fecha ?? '' : dateFormat.format(date)} · ${states[pedido.estado] ?? 'GUARDADO'}`),
      ...(pedido.clienteLocalidad ? wrap(pedido.clienteLocalidad) : []),
    ]
    block(heading, { continuation: false })
    for (const product of pedido.productos ?? []) {
      const description = wrap(`${product.cantidad} × ${product.codigo} — ${product.descripcion}`, { font: 'bold', indent: 4 })
      description[0].box = true
      const rows = [
        ...description,
        ...(product.aclaracion ? wrap(`Aclaración: ${product.aclaracion}`, { font: 'italic', indent: 4 }) : []),
        ...(product.variedades ?? []).flatMap((item) => wrap(`${item.cantidad} × ${item.nombre}`, { indent: 4 })),
      ]
      block(rows)
      positions[column] += 1.2
    }
    if (pedido.observacionGeneral) block(wrap(`Observación: ${pedido.observacionGeneral}`, { font: 'italic' }))
    positions[column] += 4
  })

  const count = doc.getNumberOfPages()
  for (let page = 1; page <= count; page++) {
    doc.setPage(page)
    style({ size: 7 })
    doc.text(`Página ${page} de ${count}`, 210 - margin, 292, { align: 'right' })
  }
  return doc
}

export function generateOrdersPdf(pedidos) {
  if (!pedidos.length) {
    window.alert('No hay pedidos seleccionados para descargar.')
    return
  }
  const date = new Intl.DateTimeFormat('sv-SE').format(new Date())
  createOrdersPdf(pedidos).save(`Pedidos_Huerpas_${date}.pdf`)
}
