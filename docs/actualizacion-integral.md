# Actualización integral de Huerpas Program

Cambios locales en la rama `actualizacion-integral`. El respaldo Git anterior a los cambios está en `.git-pre-actualizacion-d2bfdce.bundle` y se verificó con `git bundle verify`. Contiene el historial del repositorio hasta `d2bfdce`. Los datos reales de cada instalación se respaldan desde **Más → Descargar copia de seguridad** en el dispositivo donde se cargaron.

## Etapas y archivos

- **Pedidos y búsqueda.** `src/pages/NuevoPedido.jsx`, `src/components/Quantity.jsx`, `src/utils/catalog.js` y `src/utils/orders.js` incorporan selección por producto, borradores por pedido y cliente, lotes y edición de líneas. **Agregar al pedido** guarda el lote en el borrador. **Guardar pedido** confirma el pedido y elimina su borrador en la misma transacción.
- **Catálogo y respaldo.** `src/pages/Productos.jsx`, `src/components/CatalogImport.jsx` y `src/database/catalog.js` muestran y aplican una importación acumulativa. Los códigos se comparan como texto, sin quitar ceros iniciales. Los conflictos bloquean el lote. `src/database/db.js`, `src/database/backup.js` y `src/pages/Mas.jsx` agregan los almacenes `borradores`, `semillas` y `viajes` a IndexedDB v2. La migración conserva los almacenes e índices de v1. La restauración acepta v1 y v2 y conserva registros locales ausentes del archivo. La actualización por ID requiere confirmación y genera una descarga de respaldo antes de escribir.
- **Semillas.** `src/components/SeedSettings.jsx` y `src/components/SeedPicker.jsx` vinculan el producto real desde el catálogo por ID estable. La configuración permite cargar, editar y desactivar variedades. El pedido guarda una copia del nombre y la cantidad de cada variedad para conservar el historial. Las 72 variedades del catálogo están precargadas. La vinculación al código real se elige en Más → Semillas.
- **PDF de pedidos.** `src/utils/generateOrdersPdf.js` mide los renglones en las dos columnas A4 y vuelve a calcular la posición al pasar de columna o página. Incluye casillas, observaciones, variedades, identificación de continuaciones y pie paginado. `src/pages/Pedidos.jsx` muestra las variedades históricas en pantalla.
- **Planilla de viaje.** `src/pages/Viajes.jsx`, `src/utils/trips.js` y `src/utils/generateTripPdf.js` agregan reparto, cobros mixtos y cheques, movimientos de caja, archivo y reporte. El editor guarda el borrador local mientras se escribe. **Aplicar cambios** incorpora la edición al viaje. Se cargan manualmente los importes y saldos anteriores. El orden de filas sigue el orden de carga.
- **Integración y pruebas.** `src/App.jsx`, `src/pages/Home.jsx`, `src/App.css` y `src/updates.css` conectan las pantallas y estilos. `.gitignore` excluye el respaldo Git local de cambios a publicar. `tests/regression.test.js` cubre las reglas centrales.

## Verificación

- `node --test` ejecuta seis pruebas de regresión sobre búsqueda, importación, semillas, compatibilidad de respaldos, pagos y PDFs.
- `npm run lint` pasa. `npm run build` genera el service worker y el precaché. Se agregaron los PNG que declaraba el manifiesto y un icono para la pantalla de inicio de iOS en index.html. Vite informa un aviso por tamaño de un paquete JavaScript.
- Probé con Chrome y datos ficticios en un perfil aislado. Instalé el service worker de la versión anterior, abrí la nueva en el mismo origen y comprobé la igualdad de todos los registros de prueba de la base v1 antes y después de la migración. Con la red desactivada, recargué y probé selección entre búsquedas, variedades y surtido, doble toque, guardado final, recuperación de un borrador de viaje, pagos mixtos, gasto por transferencia, archivo y restauración v1. También probé la importación repetida y el bloqueo de códigos duplicados. Verifiqué la exportación y restauración v2 sin conexión con viajes, semillas, pedidos y un borrador.
- Falta validar en un iPhone real el teclado, la descarga y el menú de compartir. Falta la prueba con un respaldo real de la operación.

## Prueba manual conjunta

1. Ejecutá `npm run build` y `npm run preview`. Abrí la dirección que indique Vite. Usá un perfil de prueba y restaurá una copia exportada desde la instalación en uso.
2. En **Productos**, importá dos veces el mismo catálogo. Revisá que la segunda importación indique cero nuevos y cero modificados. Probá un archivo con el mismo código en dos filas y verificá que el botón quede deshabilitado.
3. En **Más → Semillas**, elegí el código real y verificá las variedades precargadas en ambos grupos. En **Nuevo pedido**, seleccioná productos de búsquedas distintas, borrá la búsqueda, elegí variedades y surtido, y recargá. Confirmá que reaparezca la selección al volver al cliente. Agregá el lote dos veces como prueba de doble toque, editá una línea y recién entonces guardá el pedido.
4. Descargá un PDF con varios pedidos y uno con descripción, aclaración o variedades suficientes para cruzar de columna y de página. Revisá el pie, los encabezados de continuación y el final de los textos.
5. Creá un viaje con factura de $161.703,95, saldo anterior de $0, efectivo de $60.000 y cheque de $50.000. Comprobá $110.000 cobrados y $51.703,95 pendientes. Agregá un gasto por transferencia y otro en efectivo y comprobá que solo el segundo reduzca el efectivo esperado. Revisá la descarga del PDF y, en un dispositivo compatible, el menú para compartir.
6. Exportá un respaldo v2 con un viaje, un pedido con variedades y un borrador. Importalo en otro perfil de prueba y verificá los tres. En el perfil original, recargá con la red desactivada y repetí un guardado y una descarga.

El formato de importación y los pasos adicionales están en [Contrato JSON para importar una planilla de viaje](importar-planilla-viaje.md).
