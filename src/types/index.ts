// Dataverse uses _fieldname_value for lookup fields in OData responses
// Forms and internal state use shorter aliases for readability

export interface Bodega {
  cre53_bodegaid: string;
  cre53_nombre: string;
  cre53_tipo: 1 | 2;
  cre53_ubicacion?: string;
  cre53_activo: boolean;
}

export interface MateriaPrima {
  cre53_materiaprimaid: string;
  cre53_codigo: string;
  cre53_descripcion: string;
  cre53_alias?: string;
  cre53_grupo: 1 | 2 | 3;
  cre53_unidad_compra: string;
  cre53_factor_conversion: number;
  cre53_unidad_almacen: string;
  cre53_unidad_venta?: string;
  cre53_precio_base: number;
  cre53_activo: boolean;
}

export interface SKU {
  cre53_skuid: string;
  cre53_codigo: string;
  cre53_presentacion: string;
  cre53_linea: 1 | 2;
  cre53_mililitros: number;
  cre53_tipo_empaque: 1 | 2 | 3 | 4;
  cre53_codigo_barras?: string;
  cre53_costo_estandar?: number;
  cre53_activo: boolean;
}

export interface Periodo {
  cre53_periodoid: string;
  cre53_nombre: string;
  cre53_anio: number;
  cre53_mes: number;
  cre53_fecha_inicio: string;
  cre53_fecha_corte: string;
  cre53_cerrado: boolean;
}

export interface LineaReceta {
  cre53_recetaid: string;
  // Lookup fields (OData _value format)
  _cre53_sku_value: string;
  _cre53_mp_value: string;
  // Aliases for forms
  cre53_sku?: string;
  cre53_mp?: string;
  cre53_tipo_insumo: 1 | 2 | 3;
  cre53_qty_por_litro: number;
  cre53_qty_por_botella: number;
  cre53_unidad: string;
  cre53_activo: boolean;
  _sku?: SKU;
  _mp?: MateriaPrima;
}

export interface InventarioMP {
  cre53_inventariompid: string;
  _cre53_periodo_value: string;
  _cre53_bodega_value: string;
  _cre53_mp_value: string;
  // Aliases
  cre53_periodo?: string;
  cre53_bodega?: string;
  cre53_mp?: string;
  cre53_cantidad_base: number;
  cre53_cantidad_almacen: number;
  cre53_precio_unitario: number;
  cre53_valor: number;
  cre53_fecha_conteo: string;
  cre53_capturado_por?: string;
  cre53_observaciones?: string;
  _mp?: MateriaPrima;
  _bodega?: Bodega;
}

export interface InventarioPT {
  cre53_inventarioptid: string;
  _cre53_periodo_value: string;
  _cre53_bodega_value: string;
  _cre53_sku_value: string;
  cre53_periodo?: string;
  cre53_bodega?: string;
  cre53_sku?: string;
  cre53_cantidad: number;
  cre53_costo_unitario?: number;
  cre53_valor?: number;
  cre53_fecha_conteo: string;
  cre53_capturado_por?: string;
  _sku?: SKU;
  _bodega?: Bodega;
}

export interface Produccion {
  cre53_produccionid: string;
  _cre53_periodo_value: string;
  _cre53_sku_value: string;
  cre53_periodo?: string;
  cre53_sku?: string;
  cre53_cantidad_botellas: number;
  cre53_litros?: number;
  cre53_semana?: number;
  cre53_turno?: 1 | 2;
  cre53_fecha: string;
  _sku?: SKU;
}

export interface CompraMP {
  cre53_comprampid: string;
  _cre53_periodo_value: string;
  _cre53_mp_value: string;
  cre53_periodo?: string;
  cre53_mp?: string;
  cre53_cantidad_base: number;
  cre53_precio_unitario: number;
  cre53_valor: number;
  cre53_proveedor?: string;
  cre53_fecha: string;
  cre53_folio?: string;
  _mp?: MateriaPrima;
}

export interface Venta {
  cre53_ventainventariosid: string;
  _cre53_periodo_value: string;
  _cre53_bodega_value: string;
  _cre53_sku_value: string;
  cre53_periodo?: string;
  cre53_bodega?: string;
  cre53_sku?: string;
  cre53_cantidad: number;
  cre53_precio_venta?: number;
  cre53_valor?: number;
  cre53_fecha: string;
  cre53_folio?: string;
  _sku?: SKU;
  _bodega?: Bodega;
}

export interface Costeo {
  cre53_costeoid: string;
  _cre53_periodo_value: string;
  _cre53_sku_value: string;
  cre53_costo_mp: number;
  cre53_costo_mod: number;
  cre53_costo_empaque: number;
  cre53_costo_embalaje: number;
  cre53_costo_total: number;
  _sku?: SKU;
}

// ─── FORMS (usan Record para flexibilidad) ────────────────────────────────────
export type BodegaForm = Omit<Bodega, 'cre53_bodegaid'>;
export type MPForm = Omit<MateriaPrima, 'cre53_materiaprimaid'>;
export type SKUForm = Omit<SKU, 'cre53_skuid'>;
export type PeriodoForm = Omit<Periodo, 'cre53_periodoid'>;
export type RecetaForm = Omit<LineaReceta, 'cre53_recetaid' | '_sku' | '_mp'>;
export type InvMPForm = Omit<InventarioMP, 'cre53_inventariompid' | '_mp' | '_bodega'>;
export type InvPTForm = Omit<InventarioPT, 'cre53_inventarioptid' | '_sku' | '_bodega'>;
export type ProduccionForm = Omit<Produccion, 'cre53_produccionid' | '_sku'>;
export type CompraForm = Omit<CompraMP, 'cre53_comprampid' | '_mp'>;
export type VentaForm = Omit<Venta, 'cre53_ventainventariosid' | '_sku' | '_bodega'>;

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
