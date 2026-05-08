import { useState, useMemo, useEffect } from 'react';
import { Trash2, Building2, ClipboardList, Loader2, Package } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';
import { Modal } from '../../components/shared/Modal';
import { PageHeader, Badge, KPICard, Spinner, ConfirmDialog } from '../../components/shared';
import { useInventarioPT, useInvPTMutations, useSKUs, useBodegas, usePeriodoActivo, useVentas, useProduccion } from '../../hooks';
import { fmtPeso, fmtNum, diferencia } from '../../utils';
import type { InventarioPT } from '../../types';
import { LINEA_LABEL } from '../../types';

// Solo tipo_empaque === 3 → Caja
const TIPO_CAJA = 3;

export default function InventarioPTPage() {
  const { data: periodo } = usePeriodoActivo();
  const periodoId = periodo?.cre53_periodoid ?? null;

  const { data: invPT = [], isLoading } = useInventarioPT(periodoId);
  const { data: skus = [] } = useSKUs();
  const { data: bodegas = [] } = useBodegas();
  const { data: ventas = [] } = useVentas(periodoId);
  const { data: produccion = [] } = useProduccion(periodoId);
  const { create, update, remove } = useInvPTMutations(periodoId);

  const [bodegaFilter, setBodegaFilter] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InventarioPT | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Estado plantilla bulk
  const [modalBodega, setModalBodega] = useState<string>('');
  const [fechaConteo, setFechaConteo] = useState(new Date().toISOString().split('T')[0]);
  const [capturadoPor, setCapturadoPor] = useState('');
  // quantities: skuId → cantidad botellas (como string para el input)
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  // costos: skuId → costo unitario
  const [costos, setCostos] = useState<Record<string, string>>({});

  // Maps
  const skuMap = useMemo(() => Object.fromEntries(skus.map(s => [s.cre53_skuid, s])), [skus]);
  const bodegaMap = useMemo(() => Object.fromEntries(bodegas.map(b => [b.cre53_bodegaid, b])), [bodegas]);

  // Solo SKUs tipo Caja, ordenados por línea y ml
  const cajaSKUs = useMemo(() =>
    skus
      .filter(s => s.cre53_fdt_tipo_empaque === TIPO_CAJA)
      .sort((a, b) => a.cre53_fdt_linea - b.cre53_fdt_linea || a.cre53_fdt_mililitros - b.cre53_fdt_mililitros),
    [skus]
  );

  // Solo registros de invPT donde el SKU es Caja
  const invPTCaja = useMemo(() =>
    invPT.filter(r => skuMap[r._cre53_sku_value]?.cre53_fdt_tipo_empaque === TIPO_CAJA),
    [invPT, skuMap]
  );

  // Registro existente por bodega+sku
  const existingByBodegaSKU = useMemo(() => {
    const map: Record<string, InventarioPT> = {};
    invPTCaja.forEach(r => { map[`${r._cre53_bodega_value}__${r._cre53_sku_value}`] = r; });
    return map;
  }, [invPTCaja]);

  // Filtro de vista
  const filtered = useMemo(() =>
    bodegaFilter ? invPTCaja.filter(i => i._cre53_bodega_value === bodegaFilter) : invPTCaja,
    [invPTCaja, bodegaFilter]
  );

  // KPIs
  const bodegasConCaptura = useMemo(() => new Set(invPTCaja.map(i => i._cre53_bodega_value)).size, [invPTCaja]);
  const totalValor = useMemo(() => invPTCaja.reduce((s, i) => s + (i.cre53_fdt_valor ?? 0), 0), [invPTCaja]);

  // Teórico PT por SKU (producción - ventas) — solo Caja
  const teoricoMap = useMemo(() => {
    const prodMap: Record<string, number> = {};
    produccion.forEach(p => { prodMap[p._cre53_sku_value] = (prodMap[p._cre53_sku_value] ?? 0) + p.cre53_fdt_cantidad_botellas; });
    const ventasMap: Record<string, number> = {};
    ventas.forEach(v => { ventasMap[v._cre53_sku_value] = (ventasMap[v._cre53_sku_value] ?? 0) + v.cre53_fdt_cantidad; });
    const result: Record<string, number> = {};
    cajaSKUs.forEach(s => { result[s.cre53_skuid] = (prodMap[s.cre53_skuid] ?? 0) - (ventasMap[s.cre53_skuid] ?? 0); });
    return result;
  }, [produccion, ventas, cajaSKUs]);

  // Pre-poblar quantities cuando cambia la bodega seleccionada en el modal
  useEffect(() => {
    if (!modalBodega) return;
    const initQ: Record<string, string> = {};
    const initC: Record<string, string> = {};
    cajaSKUs.forEach(s => {
      const key = `${modalBodega}__${s.cre53_skuid}`;
      const existing = existingByBodegaSKU[key];
      if (existing) {
        initQ[s.cre53_skuid] = existing.cre53_fdt_cantidad > 0 ? String(existing.cre53_fdt_cantidad) : '';
        if (existing.cre53_fdt_costo_unitario) initC[s.cre53_skuid] = String(existing.cre53_fdt_costo_unitario);
      }
    });
    setQuantities(initQ);
    setCostos(initC);
  }, [modalBodega, existingByBodegaSKU, cajaSKUs]);

  function openCaptura() {
    setModalBodega(bodegaFilter || '');
    setFechaConteo(new Date().toISOString().split('T')[0]);
    setCapturadoPor('');
    setQuantities({});
    setCostos({});
    setModalOpen(true);
  }

  // Valor calculado por fila en la plantilla
  function calcValorPT(skuId: string): number {
    const qty = parseFloat(quantities[skuId] ?? '0') || 0;
    const costo = parseFloat(costos[skuId] ?? '0') || 0;
    return qty * costo;
  }

  const totalPlantilla = useMemo(() =>
    cajaSKUs.reduce((s, sk) => s + calcValorPT(sk.cre53_skuid), 0),
  [cajaSKUs, quantities, costos]); // eslint-disable-line

  const filasCargadas = Object.values(quantities).filter(q => parseFloat(q || '0') > 0).length;

  async function handleSave() {
    if (!modalBodega) return;
    setIsSaving(true);
    try {
      for (const sku of cajaSKUs) {
        const skuId = sku.cre53_skuid;
        const qty = parseFloat(quantities[skuId] ?? '0') || 0;
        const costo = parseFloat(costos[skuId] ?? '0') || 0;
        const valor = qty * costo;
        const key = `${modalBodega}__${skuId}`;
        const existing = existingByBodegaSKU[key];

        if (existing) {
          await update.mutateAsync({
            id: existing.cre53_inventarioptid,
            d: {
              cre53_fdt_cantidad: qty,
              cre53_fdt_costo_unitario: costo || undefined,
              cre53_fdt_valor: valor || undefined,
              cre53_fdt_fecha_conteo: fechaConteo,
              ...(capturadoPor ? { cre53_fdt_capturado_por: capturadoPor } : {}),
            },
          });
        } else if (qty > 0) {
          await create.mutateAsync({
            _cre53_periodo_value: periodoId!,
            _cre53_bodega_value: modalBodega,
            _cre53_sku_value: skuId,
            cre53_fdt_cantidad: qty,
            cre53_fdt_costo_unitario: costo || undefined,
            cre53_fdt_valor: valor || undefined,
            cre53_fdt_fecha_conteo: fechaConteo,
            ...(capturadoPor ? { cre53_fdt_capturado_por: capturadoPor } : {}),
          });
        }
      }
      setModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Inventario — Producto Terminado"
        subtitle={periodo
          ? `Período: ${periodo.cre53_id} · ${bodegasConCaptura} de ${bodegas.length} bodegas capturadas · Solo Caja`
          : 'Sin período activo'
        }
        action={
          <button className="btn-primary" onClick={openCaptura} disabled={!periodoId}>
            <ClipboardList size={16} />
            Capturar Inventario
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KPICard title="Valor Total PT (Caja)" value={totalValor} format="currency" color="blue" />
        <KPICard title="Bodegas Capturadas" value={`${bodegasConCaptura}/${bodegas.length}`} format="text" color="green" />
        <KPICard title="Registros" value={invPTCaja.length} format="number" color="yellow" />
      </div>

      {/* Filtro bodega */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setBodegaFilter('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!bodegaFilter ? 'bg-primary text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
        >
          Todas
        </button>
        {bodegas.map(b => (
          <button
            key={b.cre53_bodegaid}
            onClick={() => setBodegaFilter(b.cre53_bodegaid)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${bodegaFilter === b.cre53_bodegaid ? 'bg-primary text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
          >
            <Building2 size={13} />
            {b.cre53_fdt_nombre}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          <DataTable
            data={filtered}
            rowKey={r => r.cre53_inventarioptid}
            emptyMessage="Sin registros — usa 'Capturar Inventario' para abrir la plantilla"
            columns={[
              { key: 'cre53_bodega', header: 'Bodega', render: r => bodegaMap[r._cre53_bodega_value ?? '']?.cre53_fdt_nombre ?? '—' },
              {
                key: 'cre53_sku', header: 'SKU', render: r => {
                  const sku = skuMap[r._cre53_sku_value ?? ''];
                  return sku ? (
                    <div>
                      <p className="text-sm font-medium">{sku.cre53_fdt_presentacion}</p>
                      <p className="text-xs text-gray-400 font-mono">{sku.cre53_fdt_codigo}</p>
                    </div>
                  ) : r._cre53_sku_value;
                },
              },
              {
                key: 'cre53_sku', header: 'Línea',
                render: r => { const s = skuMap[r._cre53_sku_value ?? '']; return s ? <Badge label={LINEA_LABEL[s.cre53_fdt_linea]} variant={s.cre53_fdt_linea === 1 ? 'info' : 'warning'} /> : null; },
              },
              { key: 'cre53_fdt_cantidad', header: 'Físico (Cajas)', align: 'right', render: r => <span className="font-semibold">{fmtNum(r.cre53_fdt_cantidad, 0)}</span> },
              {
                key: 'cre53_sku', header: 'Teórico', align: 'right',
                render: r => { const t = teoricoMap[r._cre53_sku_value ?? '']; return t != null ? <span className="text-gray-500">{fmtNum(t, 0)}</span> : '—'; },
              },
              {
                key: 'cre53_fdt_cantidad', header: 'Diferencia', align: 'right',
                render: r => {
                  const t = teoricoMap[r._cre53_sku_value ?? ''];
                  if (t == null) return '—';
                  const d = diferencia(r.cre53_fdt_cantidad, t);
                  return <span className={d < 0 ? 'text-danger font-semibold' : d > 0 ? 'text-warning' : 'text-success'}>{d > 0 ? '+' : ''}{fmtNum(d, 0)}</span>;
                },
              },
              { key: 'cre53_fdt_costo_unitario', header: 'Costo Unit.', align: 'right', render: r => r.cre53_fdt_costo_unitario ? fmtPeso(r.cre53_fdt_costo_unitario) : '—' },
              { key: 'cre53_fdt_valor', header: 'Valor', align: 'right', render: r => r.cre53_fdt_valor ? <span className="font-semibold">{fmtPeso(r.cre53_fdt_valor)}</span> : '—' },
              {
                key: 'actions', header: '', align: 'right', width: '50px',
                render: r => (
                  <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-gray-300 hover:text-danger hover:bg-red-50 rounded">
                    <Trash2 size={14} />
                  </button>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* ── MODAL PLANTILLA BULK PT ──────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => !isSaving && setModalOpen(false)}
        title={`Captura de Inventario PT — ${periodo?.cre53_id ?? ''}`}
        size="xl"
      >
        {/* Selección de bodega + cabecera */}
        <div className="flex flex-wrap gap-4 mb-5 pb-4 border-b">
          <div className="flex-1 min-w-48">
            <label className="form-label">Bodega *</label>
            <select
              className="form-select"
              value={modalBodega}
              onChange={e => setModalBodega(e.target.value)}
            >
              <option value="">Seleccionar bodega...</option>
              {bodegas.map(b => (
                <option key={b.cre53_bodegaid} value={b.cre53_bodegaid}>{b.cre53_fdt_nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-36">
            <label className="form-label">Fecha de Conteo *</label>
            <input type="date" className="form-input" value={fechaConteo} onChange={e => setFechaConteo(e.target.value)} />
          </div>
          <div className="flex-1 min-w-40">
            <label className="form-label">Capturado por</label>
            <input className="form-input" placeholder="Nombre del responsable" value={capturadoPor} onChange={e => setCapturadoPor(e.target.value)} />
          </div>
          <div className="flex items-end pb-0.5">
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total capturado</p>
              <p className="text-xl font-bold text-primary">{fmtPeso(totalPlantilla)}</p>
              <p className="text-xs text-gray-400">{filasCargadas} SKUs con cantidad</p>
            </div>
          </div>
        </div>

        {/* Aviso bodega no seleccionada */}
        {!modalBodega ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Building2 size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">Selecciona una bodega para comenzar la captura</p>
          </div>
        ) : (
          <>
            {/* Info de bodega seleccionada */}
            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-primary/5 rounded-lg border border-primary/10">
              <Building2 size={15} className="text-primary shrink-0" />
              <span className="text-sm font-medium text-primary">{bodegaMap[modalBodega]?.cre53_fdt_nombre}</span>
              <span className="text-xs text-gray-400 ml-1">— Solo presentaciones Caja</span>
              <div className="ml-auto flex items-center gap-1.5">
                <Package size={13} className="text-gray-400" />
                <span className="text-xs text-gray-500">{cajaSKUs.length} SKUs</span>
              </div>
            </div>

            {/* Tabla de SKUs Caja */}
            {cajaSKUs.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">Sin SKUs tipo Caja en el catálogo</p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-28">Código</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Presentación</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase w-16">ml</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase w-20">Línea</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-36">Cantidad (Cajas)</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-32">Costo Unit. (ref.)</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-28">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {cajaSKUs.map(sku => {
                      const skuId = sku.cre53_skuid;
                      const key = `${modalBodega}__${skuId}`;
                      const hasExisting = !!existingByBodegaSKU[key];
                      const qty = quantities[skuId] ?? '';
                      const costo = costos[skuId] ?? '';
                      const qtyNum = parseFloat(qty || '0');
                      const valor = calcValorPT(skuId);

                      return (
                        <tr
                          key={skuId}
                          className={`transition-colors ${qtyNum > 0 ? 'bg-green-50' : hasExisting ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-3 py-2">
                            <span className="text-xs font-mono text-gray-500">{sku.cre53_fdt_codigo}</span>
                          </td>
                          <td className="px-3 py-2">
                            <p className="text-sm font-medium text-gray-800">{sku.cre53_fdt_presentacion}</p>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="text-xs text-gray-500">{sku.cre53_fdt_mililitros}</span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Badge
                              label={sku.cre53_fdt_linea === 1 ? 'Flor' : 'Mosaico'}
                              variant={sku.cre53_fdt_linea === 1 ? 'info' : 'warning'}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              placeholder="0"
                              className="w-full text-right text-sm font-semibold border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                              value={qty}
                              onChange={e => setQuantities(p => ({ ...p, [skuId]: e.target.value }))}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.0001"
                              min="0"
                              placeholder="0.00"
                              className="w-full text-right text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-gray-600"
                              value={costo}
                              onChange={e => setCostos(p => ({ ...p, [skuId]: e.target.value }))}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className={`text-sm font-semibold ${valor > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                              {valor > 0 ? fmtPeso(valor) : '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-xs text-gray-400">
            💡 Solo se guardan filas con cantidad &gt; 0. Los registros existentes siempre se actualizan.
          </p>
          <div className="flex gap-3">
            <button className="btn-secondary" onClick={() => setModalOpen(false)} disabled={isSaving}>
              Cancelar
            </button>
            <button
              className="btn-primary min-w-36"
              onClick={handleSave}
              disabled={isSaving || !modalBodega || !periodoId}
            >
              {isSaving
                ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Guardando...</span>
                : 'Guardar Inventario'
              }
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        message="¿Eliminar este registro de inventario PT?"
        onConfirm={() => { remove.mutateAsync(deleteTarget!.cre53_inventarioptid); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
        loading={remove.isPending}
      />
    </div>
  );
}
