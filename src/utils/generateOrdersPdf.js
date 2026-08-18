import { jsPDF } from 'jspdf'

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN_X = 15
const TOP_MARGIN = 16
const BOTTOM_MARGIN = 16
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2

export function generateOrdersPdf(pedidos) {
  if (!pedidos.length) {
    window.alert('No hay pedidos para descargar.')
    return
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  let y = TOP_MARGIN

  function checkPageSpace(requiredSpace = 10) {
    if (y + requiredSpace > PAGE_HEIGHT - BOTTOM_MARGIN) {
      doc.addPage()
      y = TOP_MARGIN
    }
  }

  function writeWrappedText(text, x, maxWidth, lineHeight = 5) {
    const lines = doc.splitTextToSize(text, maxWidth)

    checkPageSpace(lines.length * lineHeight)

    doc.text(lines, x, y)
    y += lines.length * lineHeight
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('HUERPAS DISTRIBUIDORA', MARGIN_X, y)

  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('Listado de pedidos', MARGIN_X, y)

  y += 5

  doc.setFontSize(9)
  doc.text(`Generado: ${formatDate(new Date())}`, MARGIN_X, y)

  y += 9

  const pedidosOrdenados = [...pedidos].sort(
    (a, b) => new Date(a.fecha) - new Date(b.fecha),
  )

  pedidosOrdenados.forEach((pedido, orderIndex) => {
    checkPageSpace(32)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(
      `PEDIDO ${orderIndex + 1} - ${pedido.clienteNombre}`,
      MARGIN_X,
      y,
    )

    y += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)

    writeWrappedText(
      `Fecha: ${formatDate(new Date(pedido.fecha))}`,
      MARGIN_X,
      CONTENT_WIDTH,
    )

    if (pedido.clienteLocalidad) {
      writeWrappedText(
        `Localidad: ${pedido.clienteLocalidad}`,
        MARGIN_X,
        CONTENT_WIDTH,
      )
    }

    writeWrappedText(
      `Estado: ${getStatusLabel(pedido.estado)}`,
      MARGIN_X,
      CONTENT_WIDTH,
    )

    y += 2

    pedido.productos.forEach((producto) => {
      checkPageSpace(producto.aclaracion ? 18 : 13)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)

      writeWrappedText(
        `${producto.codigo} - ${producto.descripcion}`,
        MARGIN_X + 3,
        CONTENT_WIDTH - 6,
      )

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)

      writeWrappedText(
        `Cantidad: ${producto.cantidad}`,
        MARGIN_X + 7,
        CONTENT_WIDTH - 10,
      )

      if (producto.aclaracion) {
        writeWrappedText(
          `Aclaración: ${producto.aclaracion}`,
          MARGIN_X + 7,
          CONTENT_WIDTH - 10,
        )
      }

      y += 2
    })

    if (pedido.observacionGeneral) {
      checkPageSpace(15)

      y += 2

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text('Observación general:', MARGIN_X, y)

      y += 5

      doc.setFont('helvetica', 'normal')

      writeWrappedText(
        pedido.observacionGeneral,
        MARGIN_X,
        CONTENT_WIDTH,
      )
    }

    y += 5

    if (orderIndex < pedidosOrdenados.length - 1) {
      checkPageSpace(8)

      doc.setDrawColor(160)
      doc.setLineWidth(0.3)
      doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y)

      y += 8
    }
  })

  const fileDate = new Intl.DateTimeFormat('es-AR')
    .format(new Date())
    .replaceAll('/', '-')

  doc.save(`Pedidos_Huerpas_${fileDate}.pdf`)
}

function formatDate(date) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function getStatusLabel(status) {
  const labels = {
    'no-leido': 'NO LEÍDO',
    leido: 'LEÍDO',
    editado: 'EDITADO',
  }

  return labels[status] || 'GUARDADO'
}