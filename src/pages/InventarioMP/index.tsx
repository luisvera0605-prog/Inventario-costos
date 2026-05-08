import { useState, useMemo } from 'react';
import { Trash2, TrendingDown, ClipboardList, Loader2 } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';
import { Modal } from '../../components/shared/Modal';
import { PageHeader, Badge, KPICard, Spinner, ConfirmDialog } from '../../components/shared';
import {
  useInventarioMP, useInvMPMutations, useMP,
  usePeriodoActivo, useCompras, useProduccion, useAllRecetas,
} from '../../hooks';
import {
  fmtPeso, fmtNum, fmtPct, toAlmacen,
  consumoTeoricoMP, inventarioTeoricoMP, diferencia,
  pctDiferencia, semaforo, totalComprasPorMP, invFisicoPorMP,
} from '../../utils';
import type { InventarioMP } from '../../types';
import { GRUPO_MP_LABEL } from '../../types';

const SEM_BADGE: Record<string, 'success' | 'warning' | 'danger'> = {
  success: 'success', warning: 'warning', danger: 'danger',
};

const GRUPO_COLOR: Record<number, string> = {
  1: 'bg-blue-50 text-blue-700 border-blue-200',
  2: 'bg-orange-50 text-orange-700 border-orange-200',
  3: 'bg-purple-50 text-purple-700 border-purple-200',
};
const GRUPO_HEADER_BG: Record<number, string> = {
  1: 'bg-blue-600', 2: 'bg-orange-500', 3: 'bg-purple-600',
};

export default function InventarioMPPage() {
  const { data: periodo } = usePeriodoActivo();
  const periodoId = periodo?.cre53_periodoid ?? null;

  const { data: invMP = [], isLoading } = useInventarioMP(periodoId);
  const { data: mps = [] } = useMP();
  const { data: compras = [] } = useCompras(periodoId);
  const { data: produccion = [] } = useProduccion(periodoId);
  const { data: recetas = [] } = useAllRecetas();
  const { create, update, remove } = useInvMPMutations(periodoId);

  const [tab, setTab] = useState<'captura' | 'diferencias'>('captura');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InventarioMP | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Plantilla bulk
  const [fechaConteo, setFechaConteo] = useState(new Date().toISOString().split('T')[0]);
  const [capturadoPor, setCapturadoPor] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const mpMap = useMemo(() => Object.fromEntries(mps.map(m => [m.cre53_materiaprimaid, m])), [mps]);
  const existingByMP = useMemo(() => Object.fromEntries(invMP.map(r => [r._cre53_mp_value, r])), [invMP]);
  const comprasMap = useMemo(() => totalComprasPorMP(compras), [compras]);
  const fisicoMap = useMemo(() => invFisicoPorMP(invMP), [invMP]);

  const mpsByGrupo = useMemo(() => {
    const groups: Record<number, typeof mps> = { 1: [], 2: [], 3: [] };
    mps.forEach(m => { groups[m.cre53_fdt_grupo]?.push(m); });
    return groups;
  }, [mps]);

  const totalValor = invMP.reduce((s, i) => s + i.cre53_fdt_valor, 0);

  const resumen = useMemo(() => mps.map(mp => {
    const comprasMp = comprasMap[mp.cre53_materiaprimaid] ?? 0;
    const consumo = consumoTeoricoMP(mp.cre53_materiaprimaid, recetas, produccion);
    const teorico = inventarioTeoricoMP(0, comprasMp, consumo);
    const fisicoVal = fisicoMap[mp.cre53_materiaprimaid] ?? 0;
    return { mp, comprasMp, consumo, teorico, fisicoVal, diff: diferencia(fisicoVal, teorico), pct: pctDiferencia(fisicoVal, teorico) };
  }).filter(r => r.teorico !== 0 || r.fisicoVal !== 0), [mps, comprasMap, fisicoMap, recetas, produccion]);

  const mermaValor = resumen
    .filter(r => r.diff < 0)
    .reduce((s, r) => s + Math.abs(r.diff) * (mpMap[r.mp.cre53_materiaprimaid]?.cre53_fdt_precio_base ?? 0), 0);

  function calcValorRow(mpId: string): number {
    const mp = mpMap[mpId];
    if (!mp) return 0;
    const qtyAlmacen = parseFloat(quantities[mpId] ?? '0') || 0;
    return qtyAlmacen * (mp.cre53_fdt_factor_conversion ?? 1) * mp.cre53_fdt_precio_base;
  }

  const totalPlantilla = useMemo(() =>
    mps.reduce((s, m) => s + calcValorRow(m.cre53_materiaprimaid), 0),
  [mps, quantities]); // eslint-disable-line

  const filasCargadas = Object.values(quantities).filter(q => parseFloat(q || '0') > 0).length;

  function openCaptura() {
    const initial: Record<string, string> = {};
    invMP.forEach(r => {
      const mp = mpMap[r._cre53_mp_value];
      if (mp) {
        const qAlmacen = toAlmacen(r.cre53_fdt_cantidad_base, mp.cre53_fdt_factor_conversion);
        if (qAlmacen > 0) initial[r._cre53_mp_value] = String(qAlmacen);
      }
    });
    setQuantities(initial);
    setFechaConteo(new Date().toISOString().split('T')[0]);
    setCapturadoPor('');
    setModalOpen(true);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      for (const mp of mps) {
        const mpId = mp.cre53_materiaprimaid;
        const qtyAlmacen = parseFloat(quantities[mpId] ?? '0') || 0;
        const factor = mp.cre53_fdt_factor_conversion ?? 1;
        const cantBase = qtyAlmacen * factor;
        const precio = mp.cre53_fdt_precio_base ?? 0;
        const valor = cantBase * precio;
        const existing = existingByMP[mpId];

        if (existing) {
          await update.mutateAsync({
            id: existing.cre53_inventariompid,
            d: {
              cre53_fdt_cantidad_almacen: qtyAlmacen,
              cre53_fdt_cantidad_base: cantBase,
              cre53_fdt_precio_unitario: precio,
              cre53_fdt_valor: valor,
              cre53_fdt_fecha_conteo: fechaConteo,
              ...(capturadoPor ? { cre53_fdt_capturado_por: capturadoPor } : {}),
            },
          });
        } else if (qtyAlmacen > 0) {
          await create.mutateAsync({
            _cre53_periodo_value: periodoId!,
            _cre53_bodega_value: '',
            _cre53_mp_value: mpId,
            cre53_fdt_cantidad_almacen: qtyAlmacen,
            cre53_fdt_cantidad_base: cantBase,
            cre53_fdt_precio_unitario: precio,
            cre53_fdt_valor: valor,
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
        title="Inventario — Materia Prima"
        subtitle={periodo ? `Período: ${periodo.cre53_id}` : 'Sin período activo'}
        action={
          tab === 'captura' ? (
            <button className="btn-primary" onClick={openCaptura} disabled={!periodoId}>
              <ClipboardList size={16} />
              Capturar Inventario
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KPICard title="Valor Total Inventario MP" value={totalValor} format="currency" icon={<TrendingDown size={18} />} color="blue" />
        <KPICard title="Insumos Capturados" value={`${invMP.length}/${mps.length}`} format="text" color="green" />
        <KPICard title="Merma Estimada (valor)" value={mermaValor} format="currency" color={mermaValor > 5000 ? 'red' : 'green'} />
      </div>

      <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
        {(['captura', 'diferencias'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'captura' ? 'Captura física' : 'Teórico vs Físico'}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : tab === 'captura' ? (
        <div className="card p-0 overflow-hidden">
          <DataTable
            data={invMP}
            rowKey={r => r.cre53_inventariompid}
            emptyMessage="Sin registros — usa 'Capturar Inventario' para abrir la plantilla"
            columns={[
              {
                key: 'cre53_mp', header: 'Materia Prima',
                render: r => {
                  const mp = mpMap[r._cre53_mp_value];
                  return (
                    <div>
                      <p className="font-medium text-sm">{mp?.cre53_fdt_alias || mp?.cre53_fdt_descripcion || r._cre53_mp_value}</p>
                      <p className="text-xs text-gray-400 font-mono">{mp?.cre53_fdt_codigo}</p>
                    </div>
                  );
                },
              },
              {
                key: 'cre53_mp', header: 'Grupo',
                render: r => {
                  const mp = mpMap[r._cre53_mp_value];
                  return mp ? <Badge label={GRUPO_MP_LABEL[mp.cre53_fdt_grupo]} variant="info" /> : null;
                },
              },
              {
                key: 'cre53_fdt_cantidad_almacen', header: 'Cant. Almacén', align: 'right',
                render: r => <span className="font-semibold">{fmtNum(r.cre53_fdt_cantidad_almacen)} {mpMap[r._cre53_mp_value]?.cre53_fdt_unidad_almacen}</span>,
              },
              {
                key: 'cre53_fdt_cantidad_base', header: 'Cant. Base', align: 'right',
                render: r => <span className="text-gray-400 text-xs">{fmtNum(r.cre53_fdt_cantidad_base, 3)} {mpMap[r._cre53_mp_value]?.cre53_fdt_unidad_compra}</span>,
              },
              { key: 'cre53_fdt_precio_unitario', header: 'Precio/Base', align: 'right', render: r => fmtPeso(r.cre53_fdt_precio_unitario) },
              { key: 'cre53_fdt_valor', header: 'Valor', align: 'right', render: r => <span className="font-semibold">{fmtPeso(r.cre53_fdt_valor)}</span> },
              { key: 'cre53_fdt_fecha_conteo', header: 'Fecha', render: r => r.cre53_fdt_fecha_conteo?.split('T')[0] ?? '—' },
              {
                key: 'cre53_inventariompid', header: '', align: 'right', width: '50px',
                render: r => (
                  <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-gray-300 hover:text-danger hover:bg-red-50 rounded">
                    <Trash2 size={14} />
                  </button>
                ),
              },
            ]}
          />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <DataTable
            data={resumen}
            rowKey={r => r.mp.cre53_materiaprimaid}
            compact
            columns={[
              {
                key: 'mp', header: 'Materia Prima',
                render: r => (
                  <div>
                    <span className="font-medium">{r.mp.cre53_fdt_alias || r.mp.cre53_fdt_descripcion}</span>
                    <span className="ml-2 text-xs text-gray-400 font-mono">{r.mp.cre53_fdt_codigo}</span>
                  </div>
                ),
              },
              { key: 'comprasMp', header: 'Compras', align: 'right', render: r => fmtNum(r.comprasMp, 2) },
              { key: 'consumo', header: 'Consumo Teórico', align: 'right', render: r => <span className="text-orange-600">{fmtNum(r.consumo, 3)}</span> },
              { key: 'teorico', header: 'Inv. Teórico', align: 'right', render: r => <span className="font-medium">{fmtNum(r.teorico, 3)}</span> },
              { key: 'fisicoVal', header: 'Inv. Físico', align: 'right', render: r => <span className="font-medium">{fmtNum(r.fisicoVal, 3)}</span> },
              {
                key: 'diff', header: 'Diferencia', align: 'right',
                render: r => <span className={r.diff < 0 ? 'text-danger font-semibold' : r.diff > 0 ? 'text-warning' : 'text-success'}>{fmtNum(r.diff, 3)}</span>,
              },
              {
                key: 'pct', header: '%', align: 'right',
                render: r => <Badge label={fmtPct(r.pct)} variant={SEM_BADGE[semaforo(r.pct)]} />,
              },
            ]}
          />
        </div>
      )}

      {/* ── MODAL PLANTILLA BULK ─────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => !isSaving && setModalOpen(false)}
        title={`Captura de Inventario MP — ${periodo?.cre53_id ?? ''}`}
        size="xl"
      >
        {/* Cabecera */}
        <div className="flex flex-wrap gap-4 mb-5 pb-4 border-b">
          <div className="flex-1 min-w-40">
            <label className="form-label">Fecha de Conteo *</label>
            <input type="date" className="form-input" value={fechaConteo} onChange={e => setFechaConteo(e.target.value)} />
          </div>
          <div className="flex-1 min-w-48">
            <label className="form-label">Capturado por</label>
            <input className="form-input" placeholder="Nombre del responsable" value={capturadoPor} onChange={e => setCapturadoPor(e.target.value)} />
          </div>
          <div className="flex items-end pb-0.5">
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total capturado</p>
              <p className="text-xl font-bold text-primary">{fmtPeso(totalPlantilla)}</p>
              <p className="text-xs text-gray-400">{filasCargadas} insumos con cantidad</p>
            </div>
          </div>
        </div>

        {/* Tabla por grupo */}
        {([1, 2, 3] as const).map(grupo => {
          const grupMPs = mpsByGrupo[grupo] ?? [];
          if (grupMPs.length === 0) return null;
          const grupoValor = grupMPs.reduce((s, m) => s + calcValorRow(m.cre53_materiaprimaid), 0);

          return (
            <div key={grupo} className="mb-5">
              <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg text-white text-sm font-semibold ${GRUPO_HEADER_BG[grupo]}`}>
                <span>{GRUPO_MP_LABEL[grupo]} <span className="font-normal opacity-80">({grupMPs.length} insumos)</span></span>
                <span className="text-xs font-normal opacity-90">{fmtPeso(grupoValor)}</span>
              </div>
              <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-24">Código</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Alias / Descripción</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase w-20">Unidad</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-36">Cantidad</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-28">Precio/Base</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-28">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {grupMPs.map(mp => {
                      const mpId = mp.cre53_materiaprimaid;
                      const hasExisting = !!existingByMP[mpId];
                      const qty = quantities[mpId] ?? '';
                      const qtyNum = parseFloat(qty || '0');
                      const valor = calcValorRow(mpId);

                      return (
                        <tr
                          key={mpId}
                          className={`transition-colors ${qtyNum > 0 ? 'bg-green-50' : hasExisting ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-3 py-2">
                            <span className="text-xs font-mono text-gray-500">{mp.cre53_fdt_codigo}</span>
                          </td>
                          <td className="px-3 py-2">
                            <p className="text-sm font-medium text-gray-800 leading-tight">
                              {mp.cre53_fdt_alias || mp.cre53_fdt_descripcion}
                            </p>
                            {mp.cre53_fdt_alias && (
                              <p className="text-xs text-gray-400 leading-tight">{mp.cre53_fdt_descripcion}</p>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${GRUPO_COLOR[grupo]}`}>
                              {mp.cre53_fdt_unidad_almacen}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              placeholder="0"
                              className="w-full text-right text-sm font-semibold border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                              value={qty}
                              onChange={e => setQuantities(p => ({ ...p, [mpId]: e.target.value }))}
                            />
                            {qtyNum > 0 && mp.cre53_fdt_factor_conversion > 1 && (
                              <p className="text-xs text-gray-400 text-right mt-0.5">
                                = {fmtNum(qtyNum * mp.cre53_fdt_factor_conversion, 3)} {mp.cre53_fdt_unidad_compra}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="text-xs text-gray-500 font-mono">{fmtPeso(mp.cre53_fdt_precio_base)}</span>
                            <p className="text-xs text-gray-300">/{mp.cre53_fdt_unidad_compra}</p>
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
            </div>
          );
        })}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t mt-2">
          <p className="text-xs text-gray-400">
            💡 Solo se guardan filas con cantidad &gt; 0. Los registros existentes siempre se actualizan.
          </p>
          <div className="flex gap-3">
            <button className="btn-secondary" onClick={() => setModalOpen(false)} disabled={isSaving}>
              Cancelar
            </button>
            <button className="btn-primary min-w-36" onClick={handleSave} disabled={isSaving || !periodoId}>
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
        message={`¿Eliminar el conteo de "${mpMap[deleteTarget?._cre53_mp_value ?? '']?.cre53_fdt_alias || mpMap[deleteTarget?._cre53_mp_value ?? '']?.cre53_fdt_descripcion}"?`}
        onConfirm={() => { remove.mutateAsync(deleteTarget!.cre53_inventariompid); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
        loading={remove.isPending}
      />
    </div>
  );
}
