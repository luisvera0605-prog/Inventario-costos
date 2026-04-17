// ─── CATÁLOGOS ────────────────────────────────────────────────────────────────

export interface Bodega {
  fdt_bodegaid: string;
  fdt_nombre: string;
  fdt_tipo: 1 | 2;
  fdt_ubicacion?: string;
  fdt_activo: boolean;
}

export interface MateriaPrima {
  fdt_mpid: string;
  fdt_codigo: string;
  fdt_descripcion: string;
  fdt_alias?: string;
  fdt_grupo: 1 | 2 | 3;
  fdt_unidad_compra: string;
  fdt_factor_conversion: number;
  fdt_unidad_almacen: string;
  fdt_unidad_venta?: string;
  fdt_precio_base: number;
  fdt_activo: boolean;
}

export interface SKU {
  fdt_skuid: string;
  fdt_codigo: string;
  fdt_presentacion: string;
  fdt_linea: 1 | 2;
  fdt_mililitros: number;
  fdt_tipo_empaque: 1 | 2 | 3 | 4;
  fdt_codigo_barras?: string;
  fdt_costo_estandar?: number;
  fdt_activo: boolean;
}

export interface Periodo {
  fdt_periodoid: string;
  fdt_nombre: string;
  fdt_anio: number;
  fdt_mes: number;
  fdt_fecha_inicio: string;
  fdt_fecha_corte: string;
  fdt_cerrado: boolean;
}

export interface LineaReceta {
  fdt_recetaid: string;
  fdt_sku: string;
  fdt_mp: string;
  fdt_tipo_insumo: 1 | 2 | 3;
  fdt_qty_por_litro: number;
  fdt_qty_por_botella: number;
  fdt_unidad: string;
  fdt_activo: boolean;
  _sku?: SKU;
  _mp?: MateriaPrima;
}

// ─── TRANSACCIONAL ────────────────────────────────────────────────────────────

export interface InventarioMP {
  fdt_inventario_mpid: string;
  fdt_periodo: string;
  fdt_bodega: string;
  fdt_mp: string;
  fdt_cantidad_base: number;
  fdt_cantidad_almacen: number;
  fdt_precio_unitario: number;
  fdt_valor: number;
  fdt_fecha_conteo: string;
  fdt_capturado_por?: string;
  fdt_observaciones?: string;
  _mp?: MateriaPrima;
  _bodega?: Bodega;
}

export interface InventarioPT {
  fdt_inventario_ptid: string;
  fdt_periodo: string;
  fdt_bodega: string;
  fdt_sku: string;
  fdt_cantidad: number;
  fdt_costo_unitario?: number;
  fdt_valor?: number;
  fdt_fecha_conteo: string;
  fdt_capturado_por?: string;
  _sku?: SKU;
  _bodega?: Bodega;
}

export interface Produccion {
  fdt_produccionid: string;
  fdt_periodo: string;
  fdt_sku: string;
  fdt_cantidad_botellas: number;
  fdt_litros?: number;
  fdt_semana?: number;
  fdt_turno?: 1 | 2;
  fdt_fecha: string;
  _sku?: SKU;
}

export interface CompraMP {
  fdt_compra_mpid: string;
  fdt_periodo: string;
  fdt_mp: string;
  fdt_cantidad_base: number;
  fdt_precio_unitario: number;
  fdt_valor: number;
  fdt_proveedor?: string;
  fdt_fecha: string;
  fdt_folio?: string;
  _mp?: MateriaPrima;
}

export interface Venta {
  fdt_ventaid: string;
  fdt_periodo: string;
  fdt_bodega: string;
  fdt_sku: string;
  fdt_cantidad: number;
  fdt_precio_venta?: number;
  fdt_valor?: number;
  fdt_fecha: string;
  fdt_folio?: string;
  _sku?: SKU;
  _bodega?: Bodega;
}

export interface Costeo {
  fdt_costeoid: string;
  fdt_periodo: string;
  fdt_sku: string;
  fdt_costo_mp: number;
  fdt_costo_mod: number;
  fdt_costo_empaque: number;
  fdt_costo_embalaje: number;
  fdt_costo_total: number;
  _sku?: SKU;
}

// ─── FORMS ───────────────────────────────────────────────────────────────────

export type BodegaForm = Omit<Bodega, 'fdt_bodegaid'>;
export type MPForm = Omit<MateriaPrima, 'fdt_mpid'>;
export type SKUForm = Omit<SKU, 'fdt_skuid'>;
export type PeriodoForm = Omit<Periodo, 'fdt_periodoid'>;
export type RecetaForm = Omit<LineaReceta, 'fdt_recetaid' | '_sku' | '_mp'>;

export interface InvMPForm {
  fdt_periodo: string;
  fdt_bodega: string;
  fdt_mp: string;
  fdt_cantidad_base: number;
  fdt_cantidad_almacen: number;
  fdt_precio_unitario: number;
  fdt_valor: number;
  fdt_fecha_conteo: string;
  fdt_capturado_por?: string;
  fdt_observaciones?: string;
}

export interface InvPTForm {
  fdt_periodo: string;
  fdt_bodega: string;
  fdt_sku: string;
  fdt_cantidad: number;
  fdt_costo_unitario?: number;
  fdt_valor?: number;
  fdt_fecha_conteo: string;
  fdt_capturado_por?: string;
}

export type ProduccionForm = Omit<Produccion, 'fdt_produccionid' | '_sku'>;
export interface CompraForm {
  fdt_periodo: string;
  fdt_mp: string;
  fdt_cantidad_base: number;
  fdt_precio_unitario: number;
  fdt_valor: number;
  fdt_proveedor?: string;
  fdt_fecha: string;
  fdt_folio?: string;
}
export type VentaForm = Omit<Venta, 'fdt_ventaid' | '_sku' | '_bodega'>;

// ─── LABELS ──────────────────────────────────────────────────────────────────

export const TIPO_BODEGA_LABEL: Record<number, string> = { 1: 'MP + PT', 2: 'Solo PT' };
export const GRUPO_MP_LABEL: Record<number, string> = { 1: 'Materia Prima', 2: 'Empaque', 3: 'Embalaje' };
export const LINEA_LABEL: Record<number, string> = { 1: 'Flor de Tabasco', 2: 'Mosaico' };
export const TIPO_EMPAQUE_LABEL: Record<number, string> = { 1: 'Botella', 2: 'Emplaye', 3: 'Caja', 4: 'Caja ME' };
export const TIPO_INSUMO_LABEL: Record<number, string> = { 1: 'Concentrado', 2: 'Empaque', 3: 'Embalaje' };
export const TURNO_LABEL: Record<number, string> = { 1: 'Turno 1', 2: 'Turno 2' };
export const MES_LABEL: Record<number, string> = {
  1:'Enero',2:'Febrero',3:'Marzo',4:'Abril',5:'Mayo',6:'Junio',
  7:'Julio',8:'Agosto',9:'Septiembre',10:'Octubre',11:'Noviembre',12:'Diciembre'
};
