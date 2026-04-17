import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import {
  apiBodegas, apiMP, apiSKU, apiPeriodos, apiRecetas,
  apiInventarioMP, apiInventarioPT, apiProduccion, apiCompras, apiVentas,
} from '../api';
import type {
  BodegaForm, MPForm, SKUForm, PeriodoForm, RecetaForm,
  InvMPForm, InvPTForm, ProduccionForm, CompraForm, VentaForm,
} from '../types';

// ─── BODEGAS ─────────────────────────────────────────────────────────────────
export function useBodegas() {
  const { getToken } = useAuth();
  return useQuery({ queryKey: ['bodegas'], queryFn: () => getToken().then(t => apiBodegas.getAll(t)), staleTime: 10 * 60 * 1000 });
}
export function useBodegaMutations() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['bodegas'] });
  const create = useMutation({ mutationFn: (d: BodegaForm) => getToken().then(t => apiBodegas.create(d, t)), onSuccess: inv });
  const update = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<BodegaForm> }) => getToken().then(t => apiBodegas.update(id, d, t)), onSuccess: inv });
  const remove = useMutation({ mutationFn: (id: string) => getToken().then(t => apiBodegas.delete(id, t)), onSuccess: inv });
  return { create, update, remove };
}

// ─── MATERIAS PRIMAS ─────────────────────────────────────────────────────────
export function useMP() {
  const { getToken } = useAuth();
  return useQuery({ queryKey: ['mp'], queryFn: () => getToken().then(t => apiMP.getAll(t)), staleTime: 10 * 60 * 1000 });
}
export function useMPMutations() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['mp'] });
  const create = useMutation({ mutationFn: (d: MPForm) => getToken().then(t => apiMP.create(d, t)), onSuccess: inv });
  const update = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<MPForm> }) => getToken().then(t => apiMP.update(id, d, t)), onSuccess: inv });
  const remove = useMutation({ mutationFn: (id: string) => getToken().then(t => apiMP.delete(id, t)), onSuccess: inv });
  return { create, update, remove };
}

// ─── SKUS ─────────────────────────────────────────────────────────────────────
export function useSKUs() {
  const { getToken } = useAuth();
  return useQuery({ queryKey: ['skus'], queryFn: () => getToken().then(t => apiSKU.getAll(t)), staleTime: 10 * 60 * 1000 });
}
export function useSKUMutations() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['skus'] });
  const create = useMutation({ mutationFn: (d: SKUForm) => getToken().then(t => apiSKU.create(d, t)), onSuccess: inv });
  const update = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<SKUForm> }) => getToken().then(t => apiSKU.update(id, d, t)), onSuccess: inv });
  const remove = useMutation({ mutationFn: (id: string) => getToken().then(t => apiSKU.delete(id, t)), onSuccess: inv });
  return { create, update, remove };
}

// ─── PERIODOS ─────────────────────────────────────────────────────────────────
export function usePeriodos() {
  const { getToken } = useAuth();
  return useQuery({ queryKey: ['periodos'], queryFn: () => getToken().then(t => apiPeriodos.getAll(t)) });
}
export function usePeriodoActivo() {
  const { getToken } = useAuth();
  return useQuery({ queryKey: ['periodoActivo'], queryFn: () => getToken().then(t => apiPeriodos.getActivo(t)) });
}
export function usePeriodoMutations() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const inv = () => { qc.invalidateQueries({ queryKey: ['periodos'] }); qc.invalidateQueries({ queryKey: ['periodoActivo'] }); };
  const create = useMutation({ mutationFn: (d: PeriodoForm) => getToken().then(t => apiPeriodos.create(d, t)), onSuccess: inv });
  const update = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<PeriodoForm> }) => getToken().then(t => apiPeriodos.update(id, d, t)), onSuccess: inv });
  return { create, update };
}

// ─── RECETAS ─────────────────────────────────────────────────────────────────
export function useRecetasBySKU(skuId: string | null) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['recetas', skuId],
    queryFn: () => getToken().then(t => apiRecetas.getBySKU(skuId!, t)),
    enabled: !!skuId,
  });
}
export function useAllRecetas() {
  const { getToken } = useAuth();
  return useQuery({ queryKey: ['recetas', 'all'], queryFn: () => getToken().then(t => apiRecetas.getAll(t)), staleTime: 10 * 60 * 1000 });
}
export function useRecetaMutations() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['recetas'] });
  const create = useMutation({ mutationFn: (d: RecetaForm) => getToken().then(t => apiRecetas.create(d, t)), onSuccess: inv });
  const update = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<RecetaForm> }) => getToken().then(t => apiRecetas.update(id, d, t)), onSuccess: inv });
  const remove = useMutation({ mutationFn: (id: string) => getToken().then(t => apiRecetas.delete(id, t)), onSuccess: inv });
  return { create, update, remove };
}

// ─── INVENTARIO MP ────────────────────────────────────────────────────────────
export function useInventarioMP(periodoId: string | null) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['invMP', periodoId],
    queryFn: () => getToken().then(t => apiInventarioMP.getByPeriodo(periodoId!, t)),
    enabled: !!periodoId,
  });
}
export function useInvMPMutations(periodoId: string | null) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['invMP', periodoId] });
  const create = useMutation({ mutationFn: (d: InvMPForm) => getToken().then(t => apiInventarioMP.create(d, t)), onSuccess: inv });
  const update = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<InvMPForm> }) => getToken().then(t => apiInventarioMP.update(id, d, t)), onSuccess: inv });
  const remove = useMutation({ mutationFn: (id: string) => getToken().then(t => apiInventarioMP.delete(id, t)), onSuccess: inv });
  return { create, update, remove };
}

// ─── INVENTARIO PT ────────────────────────────────────────────────────────────
export function useInventarioPT(periodoId: string | null) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['invPT', periodoId],
    queryFn: () => getToken().then(t => apiInventarioPT.getByPeriodo(periodoId!, t)),
    enabled: !!periodoId,
  });
}
export function useInvPTMutations(periodoId: string | null) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['invPT', periodoId] });
  const create = useMutation({ mutationFn: (d: InvPTForm) => getToken().then(t => apiInventarioPT.create(d, t)), onSuccess: inv });
  const update = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<InvPTForm> }) => getToken().then(t => apiInventarioPT.update(id, d, t)), onSuccess: inv });
  const remove = useMutation({ mutationFn: (id: string) => getToken().then(t => apiInventarioPT.delete(id, t)), onSuccess: inv });
  return { create, update, remove };
}

// ─── PRODUCCIÓN ───────────────────────────────────────────────────────────────
export function useProduccion(periodoId: string | null) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['produccion', periodoId],
    queryFn: () => getToken().then(t => apiProduccion.getByPeriodo(periodoId!, t)),
    enabled: !!periodoId,
  });
}
export function useProduccionMutations(periodoId: string | null) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['produccion', periodoId] });
  const create = useMutation({ mutationFn: (d: ProduccionForm) => getToken().then(t => apiProduccion.create(d, t)), onSuccess: inv });
  const update = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<ProduccionForm> }) => getToken().then(t => apiProduccion.update(id, d, t)), onSuccess: inv });
  const remove = useMutation({ mutationFn: (id: string) => getToken().then(t => apiProduccion.delete(id, t)), onSuccess: inv });
  return { create, update, remove };
}

// ─── COMPRAS ──────────────────────────────────────────────────────────────────
export function useCompras(periodoId: string | null) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['compras', periodoId],
    queryFn: () => getToken().then(t => apiCompras.getByPeriodo(periodoId!, t)),
    enabled: !!periodoId,
  });
}
export function useComprasMutations(periodoId: string | null) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['compras', periodoId] });
  const create = useMutation({ mutationFn: (d: CompraForm) => getToken().then(t => apiCompras.create(d, t)), onSuccess: inv });
  const update = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<CompraForm> }) => getToken().then(t => apiCompras.update(id, d, t)), onSuccess: inv });
  const remove = useMutation({ mutationFn: (id: string) => getToken().then(t => apiCompras.delete(id, t)), onSuccess: inv });
  return { create, update, remove };
}

// ─── VENTAS ───────────────────────────────────────────────────────────────────
export function useVentas(periodoId: string | null) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['ventas', periodoId],
    queryFn: () => getToken().then(t => apiVentas.getByPeriodo(periodoId!, t)),
    enabled: !!periodoId,
  });
}
export function useVentasMutations(periodoId: string | null) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['ventas', periodoId] });
  const create = useMutation({ mutationFn: (d: VentaForm) => getToken().then(t => apiVentas.create(d, t)), onSuccess: inv });
  const update = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<VentaForm> }) => getToken().then(t => apiVentas.update(id, d, t)), onSuccess: inv });
  const remove = useMutation({ mutationFn: (id: string) => getToken().then(t => apiVentas.delete(id, t)), onSuccess: inv });
  return { create, update, remove };
}
