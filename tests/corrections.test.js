import test from 'node:test'
import assert from 'node:assert/strict'
import { readCatalog } from '../src/database/catalog.js'
import { previewCatalog } from '../src/utils/catalog.js'
import { seedCatalogChanges, seedDefaults } from '../src/utils/seedCatalog.js'
import { inspectTripImport, matchingTrip, tripImportExample } from '../src/utils/tripImport.js'
import { formatPreviousBalance, rowTotals, tripTotals, tripTotalEntries } from '../src/utils/trips.js'
import { createTripPdf } from '../src/utils/generateTripPdf.js'

const file = (json) => new Blob([JSON.stringify(json)])

test('catalog reads legacy lists, catalog wrappers and Huerpas backups as products only', async () => {
  const rows = [{ id: 'incoming', codigo: '007', descripcion: 'Descripción nueva' }]
  for (const source of [rows, { productos: rows }, {
    version: 1, data: { productos: rows, clientes: [{ id: 'private' }], pedidos: [] },
  }, { version: 2, data: { productos: rows, clientes: [], pedidos: [], viajes: [{ id: 'trip' }], semillas: [] } }]) {
    assert.deepEqual(await readCatalog(file(source)), rows)
  }
  const local = [{ id: 'linked', codigo: '007', descripcion: 'Anterior', pasillo: 2 }]
  const result = previewCatalog(local, [...rows, { id: 'linked', codigo: '01', descripcion: 'Nuevo código' }])
  assert.deepEqual(result.changes[0], { ...local[0], descripcion: 'Descripción nueva' })
  assert.equal(result.changes[1].id, undefined)
  assert.deepEqual(result.reassignedIds, ['01'])
})

test('all 72 seed varieties are populated once and custom entries and deactivations survive', () => {
  const fresh = seedCatalogChanges([])
  assert.equal(fresh.length, 72)
  assert.equal(fresh.filter(({ grupo }) => grupo === 'Huerta').length, 46)
  assert.equal(fresh.filter(({ grupo }) => grupo === 'Flores').length, 26)
  assert.equal(fresh.filter(({ nombre }) => nombre === 'Orégano Puerro').length, 1)
  assert.deepEqual(seedCatalogChanges(fresh), [])
  const records = [
    { id: 'producto', productId: 'p1' },
    { id: 'original', nombre: 'maiz', grupo: 'Huerta', activa: false },
    { id: 'custom', nombre: 'Variedad propia', grupo: 'Flores', activa: true },
  ]
  const merge = (items, changes) => [...new Map([...items, ...changes].map((row) => [row.id, row])).values()]
  const migrated = merge(records, seedCatalogChanges(records))
  assert.equal(migrated.length, 74)
  assert.equal(migrated.find(({ id }) => id === 'original').activa, false)
  assert.ok(migrated.some(({ id }) => id === 'custom'))
  assert.ok(migrated.some(({ id, productId }) => id === 'producto' && productId === 'p1'))
  const renamed = migrated.map((row) => row.id === 'original' ? { ...row, nombre: 'Maíz especial' } : row)
  assert.deepEqual(seedCatalogChanges(renamed), [])
  const restoring = merge([...fresh, ...records], seedCatalogChanges([...fresh, ...records]))
  assert.equal(restoring.filter(({ grupo, reemplazadaPor }) => grupo && !reemplazadaPor).length, 73)
  assert.equal(restoring.find(({ id }) => id === 'original').activa, false)
  assert.deepEqual(seedCatalogChanges(restoring), [])
  assert.equal(seedDefaults.length, 72)
})

test('trip import preserves source order, original names, text bultos and unknown balances', () => {
  const fixture = structuredClone(tripImportExample)
  fixture.clientes[0] = { ...fixture.clientes[0], cliente: 'COMERCIO Á', localidad: 'Chaco', efectivo: 60000,
    cheques: [{ numero: '0001', importe: 50000 }] }
  fixture.clientes.push({ cliente: 'Comercio B', importe: 0, bultos: '001', saldoAnterior: 0 })
  fixture.gastos.push({ fecha: fixture.viaje.fecha, concepto: 'Peaje', importe: 100, medio: 'Transferencia' })
  fixture.ingresos.push({ fecha: fixture.viaje.fecha, concepto: 'Caja', importe: 500, medio: 'Efectivo' })
  const clients = [
    { id: 'c1', nombre: 'Comercio A', localidad: 'Chaco' },
    { id: 'c2', nombre: 'Comercio B' }, { id: 'c3', nombre: 'Comercio B' },
  ]
  const { trip, errors, total, vinculados } = inspectTripImport(fixture, clients)
  assert.deepEqual(errors, [])
  assert.equal(total, 16170395)
  assert.equal(vinculados, 1)
  assert.deepEqual(trip.filas.map(({ cliente, bultos, localidad, saldoAnterior, clienteId }) =>
    [cliente, bultos, localidad, saldoAnterior, clienteId]), [
    ['COMERCIO Á', '1.B', 'Chaco', null, 'c1'], ['Comercio B', '001', null, 0, null],
  ])
  assert.equal(trip.filas[0].clienteOriginal, 'COMERCIO Á')
  assert.deepEqual(rowTotals(trip.filas[0]), { cheques: 5000000, cobrado: 11000000, pendiente: 5170395 })
  assert.equal(formatPreviousBalance(trip.filas[0].saldoAnterior), 'Desconocido')
  assert.match(formatPreviousBalance(trip.filas[1].saldoAnterior), /0,00/)
  assert.equal(tripTotals(trip).caja, 6050000)
  assert.equal(tripTotals(trip).bultos, 1)
  assert.match(Object.fromEntries(tripTotalEntries(trip))['Pendiente neto'], /51\.703,95.*parcial/)
  const renamed = { ...trip, destino: 'Otro nombre', fecha: '2026-11-17' }
  assert.equal(matchingTrip([renamed], { nombre: 'viaje  a chaco', fecha: trip.fecha }), renamed)
  const pdf = createTripPdf(trip).output()
  for (const marker of ['1.B', '53B + MANGUERAS', 'Desconocido', '51.703,95', '0001']) assert.ok(pdf.includes(marker), marker)
})

test('trip import rejects invalid versions, calendar dates, rows and amounts with detailed errors', () => {
  const fixture = structuredClone(tripImportExample)
  assert.ok(inspectTripImport({ ...fixture, version: 2 }, []).errors.length)
  fixture.viaje.fecha = '2026-11-31'
  fixture.clientes[0].importe = 1.005
  fixture.clientes[0].saldoAnterior = '51.703,95'
  fixture.clientes[0].cheques = [{ numero: '', importe: -50 }]
  fixture.clientes.push(null, { cliente: 'Otro', bultos: {}, importe: 3.33 })
  fixture.gastos = [{ fecha: 'ayer', concepto: 'Prueba', importe: 1, medio: 'Medio inválido' }]
  const errors = inspectTripImport(fixture, []).errors.join('\n')
  for (const marker of ['viaje.fecha', 'fila 1 · importe', 'fila 1 · saldoAnterior', 'cheque 1 · número', 'cheque 1 · importe',
    'Clientes, fila 2', 'fila 3 · bultos', 'gastos, fila 1 · medio', 'gastos, fila 1 · fecha']) {
    assert.ok(errors.includes(marker), marker)
  }
})
