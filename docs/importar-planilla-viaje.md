# Contrato JSON para importar una planilla de viaje

En **Planilla de viaje → Importar planilla JSON**, elegí el archivo, revisá los importes y confirmá. El botón **Descargar JSON de ejemplo** entrega una plantilla con una fila ficticia. Podés usarla para pedirle a ChatGPT que convierta una planilla o una imagen al siguiente formato.

```json
{
  "tipo": "huerpas-viaje",
  "version": 1,
  "viaje": {
    "nombre": "Viaje a Chaco",
    "fecha": "2026-11-16",
    "detalleCarga": "53B + MANGUERAS",
    "efectivoInicial": 0
  },
  "clientes": [
    {
      "cliente": "Cliente de ejemplo",
      "localidad": null,
      "bultos": "1.B",
      "importe": 161703.95,
      "saldoAnterior": 0,
      "efectivo": 60000,
      "transferencia": 0,
      "cheques": [{ "numero": "0001", "importe": 50000 }],
      "observaciones": "",
      "carga": ""
    }
  ],
  "gastos": [
    {
      "fecha": "2026-11-16",
      "concepto": "Combustible",
      "importe": 10000,
      "medio": "Transferencia",
      "observacion": ""
    }
  ],
  "ingresos": []
}
```

## Campos y reglas

| Campo | Formato |
| --- | --- |
| `tipo`, `version` | Valores obligatorios `"huerpas-viaje"` y `1`. |
| `viaje` | Objeto obligatorio con `nombre` y fecha real `AAAA-MM-DD`. `detalleCarga` es texto opcional y `efectivoInicial` es un importe opcional con valor predeterminado cero. |
| `clientes` | Lista obligatoria en orden de reparto. Cada fila requiere `cliente` e `importe`. `localidad`, `bultos`, `carga` y `observaciones` son opcionales. |
| `bultos` | Usá texto para conservar abreviaturas, ceros iniciales y accesorios, por ejemplo `"1.B + mangueras"`. También se aceptan enteros no negativos. Las filas con texto quedan separadas del total de bultos numéricos. |
| `saldoAnterior` | Un número en pesos o `null` si es desconocido. Si el campo falta, también queda desconocido. Usá `0` cuando conste que no había deuda. |
| `efectivo`, `transferencia` y `cheques` | Opcionales. Los pagos omitidos quedan en cero y los cheques omitidos quedan como lista vacía. Cada cheque tiene `numero` como texto e `importe` positivo. |
| `gastos`, `ingresos` | Listas opcionales. Cada movimiento requiere `fecha`, `concepto`, `importe` positivo y `medio`. Los medios son `Efectivo`, `Transferencia`, `Cheque` y `Otro`. `observacion` es opcional. |

Todos los importes se envían como números JSON en pesos, con punto decimal, hasta dos decimales y sin separador de miles. Se guardan en centavos. El saldo anterior admite valores negativos. El pendiente se calcula con la factura, el saldo anterior conocido y los cobros. Si falta el saldo anterior, el resultado se muestra como parcial. Indicá `null` cuando la columna **SALDOS** de la fuente sea el pendiente o su significado sea incierto.

El ejemplo con factura de $161.703,95, efectivo de $60.000, cheque de $50.000 y saldo anterior explícito de $0 da **$110.000 cobrados** y **$51.703,95 pendientes**. Los cheques y las transferencias quedan fuera del efectivo esperado de caja.

La vinculación automática exige una coincidencia inequívoca del nombre y, cuando se informa, de la localidad. La fila conserva el nombre del archivo y permite elegir el cliente manualmente. Un viaje con el mismo nombre normalizado y fecha requiere **Crear copia del viaje**. También se reconoce la identidad original de una planilla ya importada cuando luego se modifican su nombre o fecha.

## Prueba local

1. Abrí **Planilla de viaje**, descargá el ejemplo, elegilo en **Importar planilla JSON** y cancelá la vista previa. Confirmá que el listado siga igual.
2. Volvé a importarlo y confirmá. Cambiá bultos, saldo anterior y medios de pago. Recargá sin conexión y revisá los valores.
3. Importá el mismo archivo de nuevo y revisá el aviso de copia. Probá un importe entre comillas o una fecha inválida para ver el error antes de guardar.
4. En **Productos**, elegí un respaldo de Huerpas y comprobá las altas, modificaciones y conservados. Compará los pedidos y viajes antes y después. Usá **Más** para una restauración completa.
5. En **Más → Semillas**, verificá que estén las 46 variedades de Huerta y las 26 de Flores. Vinculá el código real, armá un pedido con varias variedades y revisá el total y el PDF.

## Archivos de esta corrección

- Importación y edición de viajes en src/components/TripImport.jsx, src/pages/Viajes.jsx, src/database/tripImport.js, src/utils/tripImport.js, src/utils/trips.js y src/utils/generateTripPdf.js.
- Catálogo y respaldo en src/database/catalog.js, src/components/CatalogImport.jsx, src/utils/catalog.js, src/database/backup.js y src/utils/downloadJson.js.
- Precarga de variedades en src/database/seeds.js y src/utils/seedCatalog.js, con integración en src/App.jsx, src/components/SeedSettings.jsx y src/pages/NuevoPedido.jsx.
- Pruebas de regresión en tests/corrections.test.js. El instructivo de la primera actualización se ajustó en docs/actualizacion-integral.md.
