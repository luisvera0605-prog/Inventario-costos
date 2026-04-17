import { dvGetRecords, dvCreate, dvUpdate, dvDelete } from './dataverseClient';
import { fetchAllPaginated } from './fetchAllPaginated';
import type {
  Bodega, MateriaPrima, SKU, Periodo, LineaReceta,
  InventarioMP, InventarioPT, Produccion, CompraMP, Venta,
  BodegaForm, MPForm, SKUForm, PeriodoForm, RecetaForm,
  InvMPForm, InvPTForm, ProduccionForm, CompraForm, VentaForm,
} from '../types';

const BASE = `${import.meta.env.VITE_DATAVERSE_URL}/api/data/v9.2`;

// ─── BODEGAS ─────────────────────────────────────────────────────────────────
const E_BODEGA = 'fdt_bodegas';
export const apiBodegas = {
  getAll: (token: string) =>
    fetchAllPaginated<Bodega>(`${BASE}/${E_BODEGA}?$orderby=fdt_nombre`, token),
  create: (data: BodegaForm, token: string) => dvCreate(E_BODEGA, data, token),
  update: (id: string, data: Partial<BodegaForm>, token: string) => dvUpdate(E_BODEGA, id, data, token),
  delete: (id: string, token: string) => dvDelete(E_BODEGA, id, token),
};

// ─── MATERIAS PRIMAS ─────────────────────────────────────────────────────────
const E_MP = 'fdt_mps';
export const apiMP = {
  getAll: (token: string) =>
    fetchAllPaginated<MateriaPrima>(`${BASE}/${E_MP}?$filter=fdt_activo eq true&$orderby=fdt_codigo`, token),
  getAllIncludeInactive: (token: string) =>
    fetchAllPaginated<MateriaPrima>(`${BASE}/${E_MP}?$orderby=fdt_codigo`, token),
  create: (data: MPForm, token: string) => dvCreate(E_MP, data, token),
  update: (id: string, data: Partial<MPForm>, token: string) => dvUpdate(E_MP, id, data, token),
  delete: (id: string, token: string) => dvDelete(E_MP, id, token),
};

// ─── SKUS ─────────────────────────────────────────────────────────────────────
const E_SKU = 'fdt_skus';
export const apiSKU = {
  getAll: (token: string) =>
    fetchAllPaginated<SKU>(`${BASE}/${E_SKU}?$filter=fdt_activo eq true&$orderby=fdt_linea,fdt_mililitros,fdt_tipo_empaque`, token),
  create: (data: SKUForm, token: string) => dvCreate(E_SKU, data, token),
  update: (id: string, data: Partial<SKUForm>, token: string) => dvUpdate(E_SKU, id, data, token),
  delete: (id: string, token: string) => dvDelete(E_SKU, id, token),
};

// ─── PERIODOS ─────────────────────────────────────────────────────────────────
const E_PERIODO = 'fdt_periodos';
export const apiPeriodos = {
  getAll: (token: string) =>
    fetchAllPaginated<Periodo>(`${BASE}/${E_PERIODO}?$orderby=fdt_anio desc,fdt_mes desc`, token),
  getActivo: async (token: string): Promise<Periodo | null> => {
    const res = await dvGetRecords<Periodo>(E_PERIODO, token, {
      filter: 'fdt_cerrado eq false',
      orderby: 'fdt_anio desc,fdt_mes desc',
      top: 1,
    });
    return res.value[0] ?? null;
  },
  create: (data: PeriodoForm, token: string) => dvCreate(E_PERIODO, data, token),
  update: (id: string, data: Partial<PeriodoForm>, token: string) => dvUpdate(E_PERIODO, id, data, token),
};

// ─── RECETAS ─────────────────────────────────────────────────────────────────
const E_RECETA = 'fdt_recetas';
export const apiRecetas = {
  getBySKU: (skuId: string, token: string) =>
    fetchAllPaginated<LineaReceta>(
      `${BASE}/${E_RECETA}?$filter=fdt_sku eq '${skuId}' and fdt_activo eq true&$orderby=fdt_tipo_insumo`,
      token
    ),
  getAll: (token: string) =>
    fetchAllPaginated<LineaReceta>(`${BASE}/${E_RECETA}?$filter=fdt_activo eq true`, token),
  create: (data: RecetaForm, token: string) => dvCreate(E_RECETA, data, token),
  update: (id: string, data: Partial<RecetaForm>, token: string) => dvUpdate(E_RECETA, id, data, token),
  delete: (id: string, token: string) => dvDelete(E_RECETA, id, token),
};

// ─── INVENTARIO MP ────────────────────────────────────────────────────────────
const E_INV_MP = 'fdt_inventario_mps';
export const apiInventarioMP = {
  getByPeriodo: (periodoId: string, token: string) =>
    fetchAllPaginated<InventarioMP>(
      `${BASE}/${E_INV_MP}?$filter=fdt_periodo eq '${periodoId}'&$orderby=fdt_mp`,
      token
    ),
  create: (data: InvMPForm, token: string) => dvCreate(E_INV_MP, data, token),
  update: (id: string, data: Partial<InvMPForm>, token: string) => dvUpdate(E_INV_MP, id, data, token),
  delete: (id: string, token: string) => dvDelete(E_INV_MP, id, token),
};

// ─── INVENTARIO PT ────────────────────────────────────────────────────────────
const E_INV_PT = 'fdt_inventario_pts';
export const apiInventarioPT = {
  getByPeriodo: (periodoId: string, token: string) =>
    fetchAllPaginated<InventarioPT>(
      `${BASE}/${E_INV_PT}?$filter=fdt_periodo eq '${periodoId}'&$orderby=fdt_bodega,fdt_sku`,
      token
    ),
  getByBodegaPeriodo: (bodegaId: string, periodoId: string, token: string) =>
    fetchAllPaginated<InventarioPT>(
      `${BASE}/${E_INV_PT}?$filter=fdt_periodo eq '${periodoId}' and fdt_bodega eq '${bodegaId}'&$orderby=fdt_sku`,
      token
    ),
  create: (data: InvPTForm, token: string) => dvCreate(E_INV_PT, data, token),
  update: (id: string, data: Partial<InvPTForm>, token: string) => dvUpdate(E_INV_PT, id, data, token),
  delete: (id: string, token: string) => dvDelete(E_INV_PT, id, token),
};

// ─── PRODUCCIÓN ───────────────────────────────────────────────────────────────
const E_PROD = 'fdt_producciones';
export const apiProduccion = {
  getByPeriodo: (periodoId: string, token: string) =>
    fetchAllPaginated<Produccion>(
      `${BASE}/${E_PROD}?$filter=fdt_periodo eq '${periodoId}'&$orderby=fdt_sku,fdt_semana`,
      token
    ),
  create: (data: ProduccionForm, token: string) => dvCreate(E_PROD, data, token),
  update: (id: string, data: Partial<ProduccionForm>, token: string) => dvUpdate(E_PROD, id, data, token),
  delete: (id: string, token: string) => dvDelete(E_PROD, id, token),
};

// ─── COMPRAS MP ───────────────────────────────────────────────────────────────
const E_COMPRA = 'fdt_compra_mps';
export const apiCompras = {
  getByPeriodo: (periodoId: string, token: string) =>
    fetchAllPaginated<CompraMP>(
      `${BASE}/${E_COMPRA}?$filter=fdt_periodo eq '${periodoId}'&$orderby=fdt_fecha desc`,
      token
    ),
  create: (data: CompraForm, token: string) => dvCreate(E_COMPRA, data, token),
  update: (id: string, data: Partial<CompraForm>, token: string) => dvUpdate(E_COMPRA, id, data, token),
  delete: (id: string, token: string) => dvDelete(E_COMPRA, id, token),
};

// ─── VENTAS ───────────────────────────────────────────────────────────────────
const E_VENTA = 'fdt_ventas';
export const apiVentas = {
  getByPeriodo: (periodoId: string, token: string) =>
    fetchAllPaginated<Venta>(
      `${BASE}/${E_VENTA}?$filter=fdt_periodo eq '${periodoId}'&$orderby=fdt_fecha desc`,
      token
    ),
  getByBodegaPeriodo: (bodegaId: string, periodoId: string, token: string) =>
    fetchAllPaginated<Venta>(
      `${BASE}/${E_VENTA}?$filter=fdt_periodo eq '${periodoId}' and fdt_bodega eq '${bodegaId}'`,
      token
    ),
  create: (data: VentaForm, token: string) => dvCreate(E_VENTA, data, token),
  update: (id: string, data: Partial<VentaForm>, token: string) => dvUpdate(E_VENTA, id, data, token),
  delete: (id: string, token: string) => dvDelete(E_VENTA, id, token),
};
