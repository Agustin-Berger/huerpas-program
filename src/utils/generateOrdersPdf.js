import { jsPDF } from 'jspdf'

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297

const MARGIN_X = 10
const TOP_MARGIN = 12
const BOTTOM_MARGIN = 12

const COLUMN_GAP = 8
const COLUMN_WIDTH =
  (PAGE_WIDTH - MARGIN_X * 2 - COLUMN_GAP) / 2

const CONTENT_TOP = 30
const CONTENT_BOTTOM = PAGE_HEIGHT - BOTTOM_MARGIN

export function generateOrdersPdf(pedidos) {
  if (!pedidos.length) {
    window.alert('No hay pedidos seleccionados para descargar.')
    return
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  let column = 0
  let y = CONTENT_TOP

  function getColumnX() {
    return column === 0
      ? MARGIN_X
      : MARGIN_X + COLUMN_WIDTH + COLUMN_GAP
  }

  function drawPageHeader() {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)

    doc.text(
      'HUERPAS DISTRIBUIDORA',
      MARGIN_X,
      TOP_MARGIN + 2,
    )

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)

    doc.text(
      `Pedidos - ${formatDateOnly(new Date())}`,
      MARGIN_X,
      TOP_MARGIN + 8,
    )

    // Línea horizontal debajo del encabezado
    doc.setDrawColor(160)
    doc.setLineWidth(0.25)

    doc.line(
      MARGIN_X,
      TOP_MARGIN + 12,
      PAGE_WIDTH - MARGIN_X,
      TOP_MARGIN + 12,
    )

    // Línea vertical entre columnas
    const centerX = PAGE_WIDTH / 2

    doc.setDrawColor(210)

    doc.line(
      centerX,
      CONTENT_TOP - 2,
      centerX,
      CONTENT_BOTTOM,
    )
  }

  function moveToNextColumn() {
    if (column === 0) {
      column = 1
      y = CONTENT_TOP
      return
    }

    doc.addPage()

    column = 0
    y = CONTENT_TOP

    drawPageHeader()
  }

  function checkSpace(requiredSpace = 10) {
    if (y + requiredSpace > CONTENT_BOTTOM) {
      moveToNextColumn()
    }
  }

  function writeWrappedText(
    text,
    x,
    maxWidth,
    lineHeight = 4,
  ) {
    const lines = doc.splitTextToSize(
      String(text),
      maxWidth,
    )

    lines.forEach((line) => {
      checkSpace(lineHeight + 1)

      doc.text(line, x, y)
      y += lineHeight
    })

    return lines.length
  }

  function drawOrderSeparator() {
    checkSpace(5)

    y += 2

    const x = getColumnX()

    doc.setDrawColor(170)
    doc.setLineWidth(0.25)

    doc.line(
      x,
      y,
      x + COLUMN_WIDTH,
      y,
    )

    y += 5
  }

  drawPageHeader()

  const pedidosOrdenados = [...pedidos].sort(
    (a, b) =>
      new Date(a.fecha) - new Date(b.fecha),
  )

  pedidosOrdenados.forEach((pedido, orderIndex) => {
    // Evita empezar un pedido cuando queda muy poco espacio.
    checkSpace(28)

    const x = getColumnX()

    // NOMBRE DEL CLIENTE
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)

    writeWrappedText(
      `${orderIndex + 1}. ${pedido.clienteNombre}`,
      x,
      COLUMN_WIDTH,
      4.5,
    )

    // DATOS DEL PEDIDO
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)

    writeWrappedText(
      `Fecha: ${formatDate(new Date(pedido.fecha))}`,
      x,
      COLUMN_WIDTH,
      3.5,
    )

    if (pedido.clienteLocalidad) {
      writeWrappedText(
        `Localidad: ${pedido.clienteLocalidad}`,
        x,
        COLUMN_WIDTH,
        3.5,
      )
    }

    writeWrappedText(
      `Estado: ${getStatusLabel(pedido.estado)}`,
      x,
      COLUMN_WIDTH,
      3.5,
    )

    y += 2

    // PRODUCTOS
    pedido.productos.forEach((producto) => {
      checkSpace(12)

      const productX = getColumnX()

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)

      writeWrappedText(
        `${producto.codigo} - ${producto.descripcion}`,
        productX + 2,
        COLUMN_WIDTH - 4,
        3.7,
      )

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)

      writeWrappedText(
        `Cant: ${producto.cantidad}`,
        productX + 4,
        COLUMN_WIDTH - 6,
        3.5,
      )

      if (producto.aclaracion) {
        doc.setFont('helvetica', 'italic')

        writeWrappedText(
          `Aclaración: ${producto.aclaracion}`,
          productX + 4,
          COLUMN_WIDTH - 6,
          3.5,
        )

        doc.setFont('helvetica', 'normal')
      }

      y += 1.5
    })

    // OBSERVACIÓN GENERAL
    if (pedido.observacionGeneral) {
      checkSpace(12)

      y += 1

      const observationX = getColumnX()

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)

      writeWrappedText(
        'Observación:',
        observationX,
        COLUMN_WIDTH,
        3.5,
      )

      doc.setFont('helvetica', 'italic')

      writeWrappedText(
        pedido.observacionGeneral,
        observationX + 2,
        COLUMN_WIDTH - 4,
        3.5,
      )

      doc.setFont('helvetica', 'normal')
    }

    if (orderIndex < pedidosOrdenados.length - 1) {
      drawOrderSeparator()
    }
  })

  addPageNumbers(doc)

  const fileDate = formatFileDate(new Date())

  doc.save(
    `Pedidos_Huerpas_${fileDate}.pdf`,
  )
}

function formatDate(date) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function formatDateOnly(date) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
  }).format(date)
}

function formatFileDate(date) {
  const year = date.getFullYear()

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')

  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${day}-${month}-${year}`
}

function getStatusLabel(status) {
  const labels = {
    'no-leido': 'NO LEÍDO',
    leido: 'LEÍDO',
    editado: 'EDITADO',
  }

  return labels[status] || 'GUARDADO'
}

function addPageNumbers(doc) {
  const totalPages = doc.getNumberOfPages()

  for (
    let pageNumber = 1;
    pageNumber <= totalPages;
    pageNumber += 1
  ) {
    doc.setPage(pageNumber)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(120)

    doc.text(
      `Página ${pageNumber} de ${totalPages}`,
      PAGE_WIDTH - MARGIN_X,
      PAGE_HEIGHT - 5,
      {
        align: 'right',
      },
    )

    doc.setTextColor(0)
  }
}