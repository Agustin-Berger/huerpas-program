import { normalizeText } from './catalog.js'
import { methods, rowTotals, tripTotals } from './trips.js'

const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
export const tripTextKey = (value) => normalizeText(value).replace(/\s+/g, ' ')

export const tripImportExample = {
  tipo: 'huerpas-viaje',
  version: 1,
  viaje: { nombre: 'Viaje a Chaco', fecha: '2026-11-16', detalleCarga: '53B + MANGUERAS' },
  clientes: [
    {
      cliente: 'Cliente de ejemplo', localidad: null, bultos: '1.B', importe: 161703.95,
      saldoAnterior: null, efectivo: 0, transferencia: 0, cheques: [], observaciones: '',
    },
  ],
  gastos: [],
  ingresos: [],
}

function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function matchingTrip(trips, source) {
  return trips.find((trip) => {
    const original = trip.origenPlanilla ?? { nombre: trip.destino, fecha: trip.fecha }
    return [original, { nombre: trip.destino, fecha: trip.fecha }].some((candidate) =>
      candidate.fecha === source.fecha && tripTextKey(candidate.nombre) === tripTextKey(source.nombre))
  })
}

function findClient(clients, name, locality) {
  if (!name) return null
  const found = clients.filter((item) => tripTextKey(item.nombre) === tripTextKey(name) &&
    (!locality || tripTextKey(item.localidad) === tripTextKey(locality)))
  return found.length === 1 ? found[0].id : null
}

export function inspectTripImport(data, clients) {
  const errors = []
  const flag = (where, message) => errors.push(`${where}: ${message}`)
  if (!object(data) || data.tipo !== 'huerpas-viaje' || data.version !== 1) {
    return { errors: ['El archivo debe declarar tipo huerpas-viaje y version 1.'] }
  }

  function text(value, label, required = false) {
    if (typeof value === 'string' && (!required || value.trim())) return value
    if (value == null && !required) return ''
    flag(label, required ? 'ingresá texto no vacío.' : 'se esperaba texto.')
    return ''
  }

  function date(value, label) {
    if (isDate(value)) return value
    flag(label, 'fecha inválida. Usá AAAA-MM-DD.')
    return ''
  }

  function cents(value, label, options = {}) {
    const { fallback, signed, positive } = options
    if (value === undefined && 'fallback' in options) return fallback
    if (value === null && fallback === null) return null
    const valid = typeof value === 'number' && /^-?\d+(\.\d{1,2})?$/.test(String(value))
    if (valid) {
      const [whole, fractional = ''] = String(Math.abs(value)).split('.')
      const result = Number(whole) * 100 + Number(fractional.padEnd(2, '0'))
      if (Number.isSafeInteger(result) && (signed || value >= 0) && (!positive || result > 0)) {
        return value < 0 ? -result : result
      }
    }
    flag(label, `usá un número en pesos con hasta dos decimales${positive ? ' y mayor que cero' : ''}.`)
    return 0
  }

  function array(items, label, optional = false) {
    if (Array.isArray(items)) return items
    if (!(optional && items === undefined)) flag(label, 'se esperaba una lista.')
    return []
  }

  if (!object(data.viaje)) flag('viaje', 'se esperaba un objeto.')
  const input = object(data.viaje) ? data.viaje : {}
  const destino = text(input.nombre, 'viaje.nombre', true)
  const fecha = date(input.fecha, 'viaje.fecha')
  const detalleCarga = text(input.detalleCarga, 'viaje.detalleCarga')
  const efectivoInicial = cents(input.efectivoInicial, 'viaje.efectivoInicial', { fallback: 0 })
  const filas = array(data.clientes, 'clientes').flatMap((row, index) => {
    const field = `Clientes, fila ${index + 1}`
    if (!object(row)) { flag(field, 'se esperaba un objeto.'); return [] }
    const cliente = text(row.cliente, `${field} · cliente`, true)
    const localidad = text(row.localidad, `${field} · localidad`) || null
    const bultos = Number.isSafeInteger(row.bultos) && row.bultos >= 0
      ? String(row.bultos)
      : text(row.bultos, `${field} · bultos`)
    const cheques = array(row.cheques, `${field} · cheques`, true).flatMap((check, checkIndex) => {
      const label = `${field} · cheque ${checkIndex + 1}`
      if (!object(check)) { flag(label, 'se esperaba un objeto.'); return [] }
      return [{
        numero: text(check.numero, `${label} · número`, true),
        importe: cents(check.importe, `${label} · importe`, { positive: true }),
      }]
    })
    const record = {
      cliente, clienteOriginal: cliente, localidad, clienteId: findClient(clients, cliente, localidad), bultos,
      carga: text(row.carga, `${field} · carga`),
      facturado: cents(row.importe, `${field} · importe`),
      saldoAnterior: cents(row.saldoAnterior, `${field} · saldoAnterior`, { fallback: null, signed: true }),
      efectivo: cents(row.efectivo, `${field} · efectivo`, { fallback: 0 }),
      transferencia: cents(row.transferencia, `${field} · transferencia`, { fallback: 0 }),
      cheques, observaciones: text(row.observaciones, `${field} · observaciones`),
    }
    if (!Object.values(rowTotals(record)).every(Number.isSafeInteger)) flag(field, 'los totales superan el rango admitido.')
    return [record]
  })

  function movements(key, tipo) {
    return array(data[key], key, true).flatMap((item, index) => {
      const label = `${key}, fila ${index + 1}`
      if (!object(item)) { flag(label, 'se esperaba un objeto.'); return [] }
      if (!methods.includes(item.medio)) flag(`${label} · medio`, `elegí ${methods.join(', ')}.`)
      return [{
        tipo, medio: item.medio,
        fecha: date(item.fecha, `${label} · fecha`),
        concepto: text(item.concepto, `${label} · concepto`, true),
        importe: cents(item.importe, `${label} · importe`, { positive: true }),
        observacion: text(item.observacion, `${label} · observación`),
      }]
    })
  }

  const trip = {
    destino, fecha, detalleCarga, efectivoInicial, filas, archivado: false,
    movimientos: [...movements('gastos', 'Gasto'), ...movements('ingresos', 'Ingreso de caja')],
    origenPlanilla: { nombre: destino, fecha },
  }
  const totals = tripTotals(trip)
  if (!Object.values(totals).every(Number.isSafeInteger)) flag('Planilla', 'los totales superan el rango admitido.')
  return { trip, errors, total: totals.facturado, clientes: totals.clientes, vinculados: filas.filter(({ clienteId }) => clienteId != null).length }
}
