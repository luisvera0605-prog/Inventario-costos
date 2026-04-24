import { dvGetRecords, dvCreate, dvUpdate, dvDelete } from './dataverseClient';
import { fetchAllPaginated } from './fetchAllPaginated';
import type {
  Bodega, MateriaPrima, SKU, Periodo, LineaReceta,
  InventarioMP, InventarioPT, Produccion, CompraMP, Venta,
  BodegaForm, MPForm, SKUForm, PeriodoForm, RecetaForm,
  InvMPForm, InvPTForm, ProduccionForm, CompraForm, VentaForm,
} from '../types';

const BASE = `${import.meta.env.VITE_DATAVERSE_URL}/api/data/v9.2`;

// ─── PREFIJOS cre53_ (publicador activo en el entorno) ───────────────────────
// Tablas OData (plural en Dataverse = nombre lógico + 's')
const E_BODEGA       = 'cre53_bodegas';
const E_MP           = 'cre53_materiaprimas';   // Dataverse pluraliza con 'es' palabras que terminan en 'a'
const E_SKU          = 'cre53_skus';
const E_PERIODO      = 'cre53_periodos';
const E_RECETA       = 'cre53_recetas';
const E_INV_MP       = 'cre53_inventariomps';
const E_INV_PT       = 'cre53_inventariopts'; // verificar plural real
const E_PROD         = 'cre53_produccions';
const E_COMPRA       = 'cre53_compramps';
const E_VENTA        = 'cre53_ventainventarioses';
const E_COSTEO       = 'cre53_costeos';

// Campos ID por tabla
const ID_BODEGA  = 'cre53_bodegaid';
const ID_MP      = 'cre53_materiaprimaid';
const ID_SKU     = 'cre53_skuid';
const ID_PERIODO = 'cre53_periodoid';
const ID_RECETA  = 'cre53_recetaid';
const ID_INV_MP  = 'cre53_inventariompid';
const ID_INV_PT  = 'cre53_inventarioptid';
const ID_PROD    = 'cre53_produccionid';
const ID_COMPRA  = 'cre53_comprampid';
const ID_VENTA   = 'cre53_ventainventariosid';
const ID_COSTEO  = 'cre53_costeoid';

// ─── BODEGAS ─────────────────────────────────────────────────────────────────
export const apiBodegas = {
  getAll: (token: string) =>
    fetchAllPaginated<Bodega>(`${BASE}/${E_BODEGA}?$orderby=cre53_fdt_nombre`, token),
  create: (data: BodegaForm, token: string) => dvCreate(E_BODEGA, data, token),
  update: (id: string, data: Partial<BodegaForm>, token: string) => dvUpdate(E_BODEGA, id, data, token),
  delete: (id: string, token: string) => dvDelete(E_BODEGA, id, token),
};

// ─── MATERIAS PRIMAS ─────────────────────────────────────────────────────────
export const apiMP = {
  getAll: (token: string) =>
    fetchAllPaginated<MateriaPrima>(`${BASE}/${E_MP}?$filter=cre53_fdt_activo eq true&$orderby=cre53_fdt_codigo`, token),
  getAllIncludeInactive: (token: string) =>
    fetchAllPaginated<MateriaPrima>(`${BASE}/${E_MP}?$orderby=cre53_fdt_codigo`, token),
  create: (data: MPForm, token: string) => dvCreate(E_MP, data, token),
  update: (id: string, data: Partial<MPForm>, token: string) => dvUpdate(E_MP, id, data, token),
  delete: (id: string, token: string) => dvDelete(E_MP, id, token),
};

// ─── SKUS ─────────────────────────────────────────────────────────────────────
export const apiSKU = {
  getAll: (token: string) =>
    fetchAllPaginated<SKU>(`${BASE}/${E_SKU}?$filter=cre53_fdt_activo eq true&$orderby=cre53_fdt_linea,cre53_fdt_mililitros,cre53_fdt_tipo_empaque`, token),
  create: (data: SKUForm, token: string) => dvCreate(E_SKU, data, token),
  update: (id: string, data: Partial<SKUForm>, token: string) => dvUpdate(E_SKU, id, data, token),
  delete: (id: string, token: string) => dvDelete(E_SKU, id, token),
};

// ─── PERIODOS ─────────────────────────────────────────────────────────────────
export const apiPeriodos = {
  getAll: (token: string) =>
    fetchAllPaginated<Periodo>(`${BASE}/${E_PERIODO}?$orderby=cre53_fdt_anio desc,cre53_fdt_mes desc`, token),
  getActivo: async (token: string): Promise<Periodo | null> => {
    const res = await dvGetRecords<Periodo>(E_PERIODO, token, {
      filter: 'cre53_fdt_cerrado eq false',
      orderby: 'cre53_fdt_anio desc,cre53_fdt_mes desc',
      top: 1,
    });
    return res.value[0] ?? null;
  },
  create: (data: PeriodoForm, token: string) => dvCreate(E_PERIODO, data, token),
  update: (id: string, data: Partial<PeriodoForm>, token: string) => dvUpdate(E_PERIODO, id, data, token),
};

// ─── RECETAS ─────────────────────────────────────────────────────────────────
export const apiRecetas = {
  getBySKU: (skuId: string, token: string) =>
    fetchAllPaginated<LineaReceta>(
      `${BASE}/${E_RECETA}?$filter=_cre53_fdt_sku_value eq ${skuId} and cre53_fdt_activo eq true&$orderby=cre53_fdt_tipo_insumo`,
      token
    ),
  getAll: (token: string) =>
    fetchAllPaginated<LineaReceta>(`${BASE}/${E_RECETA}?$filter=cre53_fdt_activo eq true`, token),
  create: (data: RecetaForm, token: string) => dvCreate(E_RECETA, data, token),
  update: (id: string, data: Partial<RecetaForm>, token: string) => dvUpdate(E_RECETA, id, data, token),
  delete: (id: string, token: string) => dvDelete(E_RECETA, id, token),
};

// ─── INVENTARIO MP ────────────────────────────────────────────────────────────
export const apiInventarioMP = {
  getByPeriodo: (periodoId: string, token: string) =>
    fetchAllPaginated<InventarioMP>(
      `${BASE}/${E_INV_MP}?$filter=_cre53_periodo_value eq ${periodoId}&$orderby=_cre53_mp_value`,
      token
    ),
  create: (data: InvMPForm, token: string) => dvCreate(E_INV_MP, data, token),
  update: (id: string, data: Partial<InvMPForm>, token: string) => dvUpdate(E_INV_MP, id, data, token),
  delete: (id: string, token: string) => dvDelete(E_INV_MP, id, token),
};

// ─── INVENTARIO PT ────────────────────────────────────────────────────────────
export const apiInventarioPT = {
  getByPeriodo: (periodoId: string, token: string) =>
    fetchAllPaginated<InventarioPT>(
      `${BASE}/${E_INV_PT}?$filter=_cre53_periodo_value eq ${periodoId}&$orderby=_cre53_bodega_value,_cre53_sku_value`,
      token
    ),
  getByBodegaPeriodo: (bodegaId: string, periodoId: string, token: string) =>
    fetchAllPaginated<InventarioPT>(
      `${BASE}/${E_INV_PT}?$filter=_cre53_periodo_value eq ${periodoId} and _cre53_bodega_value eq ${bodegaId}`,
      token
    ),
  create: (data: InvPTForm, token: string) => dvCreate(E_INV_PT, data, token),
  update: (id: string, data: Partial<InvPTForm>, token: string) => dvUpdate(E_INV_PT, id, data, token),
  delete: (id: string, token: string) => dvDelete(E_INV_PT, id, token),
};

// ─── PRODUCCIÓN ───────────────────────────────────────────────────────────────
export const apiProduccion = {
  getByPeriodo: (periodoId: string, token: string) =>
    fetchAllPaginated<Produccion>(
      `${BASE}/${E_PROD}?$filter=_cre53_periodo_value eq ${periodoId}&$orderby=_cre53_sku_value,cre53_fdt_semana`,
      token
    ),
  create: (data: ProduccionForm, token: string) => dvCreate(E_PROD, data, token),
  update: (id: string, data: Partial<ProduccionForm>, token: string) => dvUpdate(E_PROD, id, data, token),
  delete: (id: string, token: string) => dvDelete(E_PROD, id, token),
};

// ─── COMPRAS MP ───────────────────────────────────────────────────────────────
export const apiCompras = {
  getByPeriodo: (periodoId: string, token: string) =>
    fetchAllPaginated<CompraMP>(
      `${BASE}/${E_COMPRA}?$filter=_cre53_periodo_value eq ${periodoId}&$orderby=cre53_fdt_fecha desc`,
      token
    ),
  create: (data: CompraForm, token: string) => dvCreate(E_COMPRA, data, token),
  update: (id: string, data: Partial<CompraForm>, token: string) => dvUpdate(E_COMPRA, id, data, token),
  delete: (id: string, token: string) => dvDelete(E_COMPRA, id, token),
};

// ─── VENTAS ───────────────────────────────────────────────────────────────────
export const apiVentas = {
  getByPeriodo: (periodoId: string, token: string) =>
    fetchAllPaginated<Venta>(
      `${BASE}/${E_VENTA}?$filter=_cre53_periodo_value eq ${periodoId}&$orderby=cre53_fdt_fecha desc`,
      token
    ),
  getByBodegaPeriodo: (bodegaId: string, periodoId: string, token: string) =>
    fetchAllPaginated<Venta>(
      `${BASE}/${E_VENTA}?$filter=_cre53_periodo_value eq ${periodoId} and _cre53_bodega_value eq ${bodegaId}`,
      token
    ),
  create: (data: VentaForm, token: string) => dvCreate(E_VENTA, data, token),
  update: (id: string, data: Partial<VentaForm>, token: string) => dvUpdate(E_VENTA, id, data, token),
  delete: (id: string, token: string) => dvDelete(E_VENTA, id, token),
};
