import test from 'node:test'
import assert from 'node:assert/strict'
import { searchProducts, previewCatalog } from '../src/utils/catalog.js'
import { mergeOrderItems } from '../src/utils/orders.js'
import { validateBackup } from '../src/database/backup.js'
import { createOrdersPdf } from '../src/utils/generateOrdersPdf.js'
import { createTripPdf } from '../src/utils/generateTripPdf.js'
import { parseMoney, rowTotals, tripTotals, showTotal } from '../src/utils/trips.js'

const products = [
  { id: 1, codigo: '120', descripcion: 'Pulverizadór de 15 litros' },
  { id: 2, codigo: '02', descripcion: 'Bomba' },
  { id: 3, codigo: '20', descripcion: 'Codo' },
  { id: 4, codigo: 'A2', descripcion: 'Acople' },
  { id: 5, codigo: 'X', descripcion: 'Herramienta 20' },
]

test('short numeric codes rank exact, prefix and partial, preserving leading zeros', () => {
  const ids = (query) => searchProducts(products, query).map(({ id }) => id)
  assert.deepEqual(ids('20'), [3, 1])
  assert.deepEqual(ids('2'), [3, 1, 2, 4])
  assert.deepEqual(ids('02'), [2])
  assert.deepEqual(ids('a2'), [4])
  assert.deepEqual(ids('PULVERIZADOR 15'), [1])
})

test('catalog import is cumulative, preserves metadata and detects duplicates', () => {
  const local = { ...products[0], pasillo: 2 }
  const incoming = [{ codigo: ' 120 ', descripcion: 'Otro' }, products[2]]
  const first = previewCatalog([local, products[1]], incoming)
  assert.deepEqual(first.counts, { nuevos: 1, modificados: 1, 'sin cambios': 0, conservados: 1 })
  assert.deepEqual(first.changes[0], { ...local, descripcion: 'Otro' })
  const current = [...first.changes, products[1]]
  assert.deepEqual(previewCatalog(current, incoming).changes, [])
  assert.deepEqual(previewCatalog(current, [{ codigo: '120' }]).changes, [])
  assert.equal(previewCatalog(current, [...incoming, incoming[0], { codigo: '' }]).conflicts.length, 2)
})

test('batch merges seed quantities, preserving clarification and historical names', () => {
  const variety = { id: 'v', nombre: 'Nombre anterior', cantidad: 2 }
  const line = { id: 'line', productId: 'seed', cantidad: 2, aclaracion: 'Entregar aparte', variedades: [variety] }
  const result = mergeOrderItems([line], [{ id: 'seed', cantidad: 4, variedades: [
    { ...variety, nombre: 'Nombre nuevo', cantidad: 1 }, { id: 'surtido', nombre: 'Surtido', cantidad: 3 },
  ] }], 'seed')
  assert.equal(result.length, 1)
  assert.equal(result[0].cantidad, 6)
  assert.equal(result[0].aclaracion, line.aclaracion)
  assert.deepEqual(result[0].variedades[0], { ...variety, cantidad: 3 })
})

test('legacy and current backups validate before restoration and duplicate IDs fail', () => {
  const legacy = { clientes: [], productos: products, pedidos: [] }
  assert.deepEqual(validateBackup({ version: 1, data: legacy }), legacy)
  const current = { ...legacy, viajes: [], borradores: [], semillas: [] }
  assert.deepEqual(validateBackup({ version: 2, data: current }), current)
  assert.throws(() => validateBackup({ data: { ...legacy, productos: [products[0], products[0]] } }), /duplicado/)
})

const row = { cliente: 'Cliente de prueba', bultos: 3, facturado: parseMoney('161.703,95'), saldoAnterior: 0,
  efectivo: parseMoney('60.000'), transferencia: 0, cheques: [{ numero: 'A-1', importe: parseMoney('50.000') }],
}
const trip = { destino: 'Zona de prueba', fecha: '2026-11-24', efectivoInicial: 10000, filas: [row], movimientos: [
  { fecha: '2026-11-24', tipo: 'Gasto', medio: 'Transferencia', concepto: 'Combustible', importe: 5000 },
  { fecha: '2026-11-24', tipo: 'Ingreso de caja', medio: 'Efectivo', concepto: 'Fondo', importe: 6000 },
  { fecha: '2026-11-24', tipo: 'Gasto', medio: 'Efectivo', concepto: 'Peaje', importe: 4000 },
  { fecha: '2026-11-24', tipo: 'Retiro', medio: 'Efectivo', concepto: 'Retiro oficina', importe: 3000 },
] }

test('mixed payments, credit and cash movements use integer cents', () => {
  assert.equal(parseMoney('0,29'), 29)
  assert.equal(parseMoney('12.34'), 1234)
  assert.equal(parseMoney('12,345'), null)
  assert.equal(parseMoney('-1'), null)
  assert.equal(parseMoney('-1', true), -100)
  assert.deepEqual(rowTotals(row), { cheques: 5000000, cobrado: 11000000, pendiente: 5170395 })
  assert.match(showTotal('pendiente', rowTotals({ ...row, facturado: 0 }).pendiente), /Crédito/)
  assert.equal(tripTotals(trip).caja, 6009000)
  const pdf = createTripPdf(trip).output()
  for (const marker of ['51.703,95', 'Combustible', 'A-1']) assert.ok(pdf.includes(marker), marker)
})

test('long PDF keeps end markers, respects margins and uses both columns', () => {
  const doc = createOrdersPdf([
    { clienteNombre: 'Cliente primero', fecha: '2026-11-24', productos: [
      { codigo: '001', cantidad: 3, descripcion: 'Texto largo de prueba '.repeat(900) + ' FIN_DESCRIPCION',
        aclaracion: 'Aclaracion de la linea', variedades: [{ nombre: 'DETALLE_SEMILLA', cantidad: 3 }] },
    ], observacionGeneral: 'OBSERVACION_FINAL' },
    { clienteNombre: 'CLIENTE_SIGUIENTE', fecha: '2026-11-25', productos: [{ codigo: '02', cantidad: 1, descripcion: 'SIGUIENTE' }] },
  ])
  const pdf = doc.output()
  assert.ok(doc.getNumberOfPages() > 2)
  for (const text of ['FIN_DESCRIPCION', 'DETALLE_SEMILLA', 'OBSERVACION_FINAL', 'CLIENTE_SIGUIENTE', 'continuación']) {
    assert.ok(pdf.includes(text), text)
  }
  const content = [...pdf.matchAll(/([\d.]+) ([\d.]+) Td\r?\n\((.*?)\) Tj/g)]
  const body = content.filter(([, , , text]) => !text.startsWith('Página'))
  assert.ok(body.some(([, x]) => Number(x) > 300))
  assert.ok(body.every(([, , y]) => Number(y) >= 39 && Number(y) <= 817))
})
