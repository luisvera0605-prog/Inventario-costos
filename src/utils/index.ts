import type { LineaReceta, MateriaPrima, Produccion, InventarioMP, CompraMP } from '../types';

// ─── CONVERSIONES DE UNIDAD ───────────────────────────────────────────────────

/** KGs → Bultos (o cualquier base → almacén) */
export const toAlmacen = (cantidadBase: number, factor: number): number =>
  factor > 0 ? cantidadBase / factor : cantidadBase;

/** Bultos → KGs (o almacén → base) */
export const toBase = (cantidadAlmacen: number, factor: number): number =>
  cantidadAlmacen * factor;

/** Valor en pesos = cantidad_base × precio_base */
export const calcValor = (cantidadBase: number, precioBase: number): number =>
  cantidadBase * precioBase;

/** Precio por unidad de almacén = precio_base × factor */
export const precioAlmacen = (precioBase: number, factor: number): number =>
  precioBase * factor;

// ─── COSTEO ───────────────────────────────────────────────────────────────────

/**
 * Costo de MP por botella para un SKU dado.
 * Suma (qty_por_botella × precio_base_mp) para cada línea de receta.
 */
export function costoMPPorBotella(
  recetas: LineaReceta[],
  preciosMap: Record<string, number>  // mp_id → precio_base
): number {
  return recetas.reduce((sum, r) => {
    const precio = preciosMap[r._cre53_mp_value ?? ""] ?? 0;
    return sum + r.cre53_fdt_qty_por_botella * precio;
  }, 0);
}

/**
 * Consumo teórico de una MP para un período dado.
 * Suma produccion_botellas × qty_por_botella para todos los SKUs que usan esa MP.
 */
export function consumoTeoricoMP(
  mpId: string,
  recetas: LineaReceta[],
  produccion: Produccion[]
): number {
  const recetasDeMP = recetas.filter(r => r.cre53_mp === mpId);
  return recetasDeMP.reduce((total, receta) => {
    const prodSKU = produccion
      .filter(p => p.cre53_sku === receta.cre53_sku)
      .reduce((s, p) => s + p.cre53_fdt_cantidad_botellas, 0);
    return total + prodSKU * receta.cre53_fdt_qty_por_botella;
  }, 0);
}

/**
 * Inventario teórico = inv_inicial + compras - consumo_teorico
 */
export function inventarioTeoricoMP(
  invInicial: number,
  compras: number,
  consumoTeorico: number
): number {
  return invInicial + compras - consumoTeorico;
}

/**
 * Diferencia = físico - teórico
 * Negativo = merma / faltante
 * Positivo = sobrante
 */
export function diferencia(fisico: number, teorico: number): number {
  return fisico - teorico;
}

export function pctDiferencia(fisico: number, teorico: number): number {
  if (teorico === 0) return 0;
  return ((fisico - teorico) / teorico) * 100;
}

// ─── FORMATTERS ───────────────────────────────────────────────────────────────

export const fmtPeso = (n: number): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(n);

export const fmtNum = (n: number, decimals = 2): string =>
  new Intl.NumberFormat('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);

export const fmtPct = (n: number): string =>
  `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

export const fmtFecha = (iso: string): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Semáforo de diferencia de inventario */
export function semaforo(pct: number): 'success' | 'warning' | 'danger' {
  const abs = Math.abs(pct);
  if (abs <= 1) return 'success';
  if (abs <= 3) return 'warning';
  return 'danger';
}

/** Agrega totales de compras por MP */
export function totalComprasPorMP(compras: CompraMP[]): Record<string, number> {
  return compras.reduce((acc, c) => {
    acc[c._cre53_mp_value] = (acc[c._cre53_mp_value] ?? 0) + c.cre53_fdt_cantidad_base;
    return acc;
  }, {} as Record<string, number>);
}

/** Agrega inventario físico por MP */
export function invFisicoPorMP(inventarios: InventarioMP[]): Record<string, number> {
  return inventarios.reduce((acc, i) => {
    acc[i._cre53_mp_value] = (acc[i._cre53_mp_value] ?? 0) + i.cre53_fdt_cantidad_base;
    return acc;
  }, {} as Record<string, number>);
}
