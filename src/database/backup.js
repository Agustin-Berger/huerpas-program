import {
  STORES,
  getAllItems,
  saveItem,
} from './db'

export async function exportBackup() {
  const [clientes, productos, pedidos] = await Promise.all([
    getAllItems(STORES.CLIENTES),
    getAllItems(STORES.PRODUCTOS),
    getAllItems(STORES.PEDIDOS),
  ])

  const backup = {
    version: 1,
    generatedAt: new Date().toISOString(),
    data: {
      clientes,
      productos,
      pedidos,
    },
  }

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    {
      type: 'application/json',
    },
  )

  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = `Huerpas_Backup_${formatFileDate(
    new Date(),
  )}.json`

  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  URL.revokeObjectURL(url)
}

export async function importBackup(file) {
  const text = await file.text()

  let backup

  try {
    backup = JSON.parse(text)
  } catch {
    throw new Error(
      'El archivo seleccionado no es un JSON válido.',
    )
  }

  validateBackup(backup)

  const {
    clientes,
    productos,
    pedidos,
  } = backup.data

  for (const cliente of clientes) {
    await saveItem(STORES.CLIENTES, cliente)
  }

  for (const producto of productos) {
    await saveItem(STORES.PRODUCTOS, producto)
  }

  for (const pedido of pedidos) {
    await saveItem(STORES.PEDIDOS, pedido)
  }

  return {
    clientes,
    productos,
    pedidos,
  }
}

function validateBackup(backup) {
  if (!backup || typeof backup !== 'object') {
    throw new Error(
      'El archivo de respaldo no tiene un formato válido.',
    )
  }

  if (!backup.data) {
    throw new Error(
      'El archivo no contiene datos de Huerpas Program.',
    )
  }

  const {
    clientes,
    productos,
    pedidos,
  } = backup.data

  if (
    !Array.isArray(clientes) ||
    !Array.isArray(productos) ||
    !Array.isArray(pedidos)
  ) {
    throw new Error(
      'El respaldo está incompleto o dañado.',
    )
  }
}

function formatFileDate(date) {
  const year = date.getFullYear()
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')
  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}