# Guía de creación de tablas en Dataverse

Entorno: https://orge90b3312.crm.dynamics.com
Publisher prefix: fdt

---

## Instrucciones generales

1. Ir a make.powerapps.com → Tablas → Nueva tabla
2. Para cada tabla: nombre en singular, plural automático
3. El campo "Name" principal de cada tabla = fdt_nombre (o fdt_codigo según el caso)

---

## TABLA 1: Bodega (fdt_bodega)

Campos a agregar después de crear la tabla:
| Nombre visible | Nombre lógico | Tipo | Opciones/Notas |
|---|---|---|---|
| Nombre | fdt_nombre | Texto (100) | Requerido, es el campo principal |
| Tipo | fdt_tipo | Opción | 1=MP+PT, 2=Solo PT |
| Ubicación | fdt_ubicacion | Texto (200) | Opcional |
| Activo | fdt_activo | Sí/No | Default: Sí |

---

## TABLA 2: Materia Prima (fdt_mp)

| Nombre visible | Nombre lógico | Tipo | Notas |
|---|---|---|---|
| Código | fdt_codigo | Texto (20) | Requerido, único |
| Descripción | fdt_descripcion | Texto (200) | Requerido, campo principal |
| Alias | fdt_alias | Texto (100) | |
| Grupo | fdt_grupo | Opción | 1=MP, 2=Empaque, 3=Embalaje |
| Unidad Compra | fdt_unidad_compra | Texto (50) | |
| Factor Conversión | fdt_factor_conversion | Número decimal | Default: 1 |
| Unidad Almacén | fdt_unidad_almacen | Texto (50) | |
| Unidad Venta | fdt_unidad_venta | Texto (50) | |
| Precio Base | fdt_precio_base | Moneda | |
| Activo | fdt_activo | Sí/No | Default: Sí |

---

## TABLA 3: SKU (fdt_sku)

| Nombre visible | Nombre lógico | Tipo | Notas |
|---|---|---|---|
| Código | fdt_codigo | Texto (20) | Requerido, único |
| Presentación | fdt_presentacion | Texto (100) | Campo principal |
| Línea | fdt_linea | Opción | 1=Flor, 2=Mosaico |
| Mililitros | fdt_mililitros | Número entero | |
| Tipo Empaque | fdt_tipo_empaque | Opción | 1=Botella, 2=Emplaye, 3=Caja, 4=Caja ME |
| Código Barras | fdt_codigo_barras | Texto (50) | |
| Costo Estándar | fdt_costo_estandar | Moneda | |
| Activo | fdt_activo | Sí/No | Default: Sí |

---

## TABLA 4: Período (fdt_periodo)

| Nombre visible | Nombre lógico | Tipo | Notas |
|---|---|---|---|
| Nombre | fdt_nombre | Texto (50) | Campo principal, ej: "Enero 2026" |
| Año | fdt_anio | Número entero | |
| Mes | fdt_mes | Número entero | 1-12 |
| Fecha Inicio | fdt_fecha_inicio | Solo fecha | |
| Fecha Corte | fdt_fecha_corte | Solo fecha | |
| Cerrado | fdt_cerrado | Sí/No | Default: No |

---

## TABLA 5: Receta (fdt_receta)

| Nombre visible | Nombre lógico | Tipo | Notas |
|---|---|---|---|
| SKU | fdt_sku | Búsqueda → fdt_sku | Requerido |
| Materia Prima | fdt_mp | Búsqueda → fdt_mp | Requerido |
| Tipo Insumo | fdt_tipo_insumo | Opción | 1=Concentrado, 2=Empaque, 3=Embalaje |
| Qty por Litro | fdt_qty_por_litro | Número decimal | |
| Qty por Botella | fdt_qty_por_botella | Número decimal | |
| Unidad | fdt_unidad | Texto (20) | |
| Activo | fdt_activo | Sí/No | Default: Sí |

---

## TABLA 6: Inventario MP (fdt_inventario_mp)

| Nombre visible | Nombre lógico | Tipo | Notas |
|---|---|---|---|
| Período | fdt_periodo | Búsqueda → fdt_periodo | |
| Bodega | fdt_bodega | Búsqueda → fdt_bodega | |
| Materia Prima | fdt_mp | Búsqueda → fdt_mp | |
| Cantidad Base | fdt_cantidad_base | Número decimal | En KG, LT, PZA |
| Cantidad Almacén | fdt_cantidad_almacen | Número decimal | En BULTO, ROLLO... |
| Precio Unitario | fdt_precio_unitario | Moneda | |
| Valor | fdt_valor | Moneda | |
| Fecha Conteo | fdt_fecha_conteo | Solo fecha | |
| Capturado Por | fdt_capturado_por | Texto (100) | |
| Observaciones | fdt_observaciones | Texto multiline | |

---

## TABLA 7: Inventario PT (fdt_inventario_pt)

| Nombre visible | Nombre lógico | Tipo | Notas |
|---|---|---|---|
| Período | fdt_periodo | Búsqueda → fdt_periodo | |
| Bodega | fdt_bodega | Búsqueda → fdt_bodega | |
| SKU | fdt_sku | Búsqueda → fdt_sku | |
| Cantidad | fdt_cantidad | Número decimal | Botellas |
| Costo Unitario | fdt_costo_unitario | Moneda | |
| Valor | fdt_valor | Moneda | |
| Fecha Conteo | fdt_fecha_conteo | Solo fecha | |
| Capturado Por | fdt_capturado_por | Texto (100) | |

---

## TABLA 8: Producción (fdt_produccion)

| Nombre visible | Nombre lógico | Tipo | Notas |
|---|---|---|---|
| Período | fdt_periodo | Búsqueda → fdt_periodo | |
| SKU | fdt_sku | Búsqueda → fdt_sku | |
| Cantidad Botellas | fdt_cantidad_botellas | Número entero | |
| Litros | fdt_litros | Número decimal | |
| Semana | fdt_semana | Número entero | 1-6 |
| Turno | fdt_turno | Opción | 1=Turno 1, 2=Turno 2 |
| Fecha | fdt_fecha | Solo fecha | |

---

## TABLA 9: Compra MP (fdt_compra_mp)

| Nombre visible | Nombre lógico | Tipo | Notas |
|---|---|---|---|
| Período | fdt_periodo | Búsqueda → fdt_periodo | |
| Materia Prima | fdt_mp | Búsqueda → fdt_mp | |
| Cantidad Base | fdt_cantidad_base | Número decimal | |
| Precio Unitario | fdt_precio_unitario | Moneda | |
| Valor | fdt_valor | Moneda | |
| Proveedor | fdt_proveedor | Texto (200) | |
| Folio | fdt_folio | Texto (50) | |
| Fecha | fdt_fecha | Solo fecha | |

---

## TABLA 10: Venta (fdt_venta)

| Nombre visible | Nombre lógico | Tipo | Notas |
|---|---|---|---|
| Período | fdt_periodo | Búsqueda → fdt_periodo | |
| Bodega | fdt_bodega | Búsqueda → fdt_bodega | |
| SKU | fdt_sku | Búsqueda → fdt_sku | |
| Cantidad | fdt_cantidad | Número decimal | |
| Precio Venta | fdt_precio_venta | Moneda | |
| Valor | fdt_valor | Moneda | |
| Folio | fdt_folio | Texto (50) | |
| Fecha | fdt_fecha | Solo fecha | |

---

## TABLA 11: Costeo (fdt_costeo)

| Nombre visible | Nombre lógico | Tipo | Notas |
|---|---|---|---|
| Período | fdt_periodo | Búsqueda → fdt_periodo | |
| SKU | fdt_sku | Búsqueda → fdt_sku | |
| Costo MP | fdt_costo_mp | Moneda | |
| Costo MOD | fdt_costo_mod | Moneda | |
| Costo Empaque | fdt_costo_empaque | Moneda | |
| Costo Embalaje | fdt_costo_embalaje | Moneda | |
| Costo Total | fdt_costo_total | Moneda | |

---

## Notas importantes

- El nombre del plural de cada tabla en Dataverse se genera automáticamente agregando 's': fdt_bodegas, fdt_mps, fdt_skus, etc.
- Para las búsquedas (Lookups), primero crea todas las tablas maestras antes de las transaccionales
- El campo principal de cada tabla (Primary Name Field) debe coincidir con el campo fdt_nombre o fdt_codigo según la tabla
