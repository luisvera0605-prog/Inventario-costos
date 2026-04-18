import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, TrendingDown } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';
import { Modal } from '../../components/shared/Modal';
import { PageHeader, Badge, KPICard, Spinner, ConfirmDialog } from '../../components/shared';
import { useInventarioMP, useInvMPMutations, useMP, usePeriodoActivo, useCompras, useProduccion, useAllRecetas } from '../../hooks';
import { fmtPeso, fmtNum, fmtPct, toAlmacen, consumoTeoricoMP, inventarioTeoricoMP, diferencia, pctDiferencia, semaforo, totalComprasPorMP, invFisicoPorMP } from '../../utils';
import type { InventarioMP, InvMPForm } from '../../types';
import { GRUPO_MP_LABEL } from '../../types';

const SEM_BADGE: Record<string, 'success' | 'warning' | 'danger'> = { success: 'success', warning: 'warning', danger: 'danger' };

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
  const [editing, setEditing] = useState<InventarioMP | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventarioMP | null>(null);
  const [form, setForm] = useState<InvMPForm>({
    _cre53_periodo_value: '', _cre53_bodega_value: '', _cre53_mp_value: '',
    cre53_fdt_cantidad_base: 0, cre53_fdt_cantidad_almacen: 0,
    cre53_fdt_precio_unitario: 0, cre53_fdt_valor: 0,
    cre53_fdt_fecha_conteo: new Date().toISOString().split('T')[0],
  });

  const mpMap = useMemo(() => Object.fromEntries(mps.map(m => [m.cre53_materiaprimaid, m])), [mps]);
  const comprasMap = useMemo(() => totalComprasPorMP(compras), [compras]);
  const fisicoMap = useMemo(() => invFisicoPorMP(invMP), [invMP]);

  const resumen = useMemo(() => mps.map(mp => {
    const comprasMp = comprasMap[mp.cre53_materiaprimaid] ?? 0;
    const consumo = consumoTeoricoMP(mp.cre53_materiaprimaid, recetas, produccion);
    const teorico = inventarioTeoricoMP(0, comprasMp, consumo);
    const fisicoVal = fisicoMap[mp.cre53_materiaprimaid] ?? 0;
    const diff = diferencia(fisicoVal, teorico);
    const pct = pctDiferencia(fisicoVal, teorico);
    return { mp, comprasMp, consumo, teorico, fisicoVal, diff, pct };
  }).filter(r => r.teorico !== 0 || r.fisicoVal !== 0), [mps, comprasMap, fisicoMap, recetas, produccion]);

  const totalValor = invMP.reduce((s, i) => s + i.cre53_fdt_valor, 0);
  const mermaValor = resumen
    .filter(r => r.diff < 0)
    .reduce((s, r) => s + Math.abs(r.diff) * (mpMap[r.mp.cre53_materiaprimaid]?.cre53_fdt_precio_base ?? 0), 0);

  function openCreate() {
    setEditing(null);
    setForm({ _cre53_periodo_value: periodoId ?? '', _cre53_bodega_value: '', _cre53_mp_value: '', cre53_fdt_cantidad_base: 0, cre53_fdt_cantidad_almacen: 0, cre53_fdt_precio_unitario: 0, cre53_fdt_valor: 0, cre53_fdt_fecha_conteo: new Date().toISOString().split('T')[0] });
    setModalOpen(true);
  }

  function openEdit(inv: InventarioMP) {
    setEditing(inv);
    setForm({ _cre53_periodo_value: inv._cre53_periodo_value, _cre53_bodega_value: inv._cre53_bodega_value, _cre53_mp_value: inv._cre53_mp_value, cre53_fdt_cantidad_base: inv.cre53_fdt_cantidad_base, cre53_fdt_cantidad_almacen: inv.cre53_fdt_cantidad_almacen, cre53_fdt_precio_unitario: inv.cre53_fdt_precio_unitario, cre53_fdt_valor: inv.cre53_fdt_valor, cre53_fdt_fecha_conteo: inv.cre53_fdt_fecha_conteo, cre53_fdt_capturado_por: inv.cre53_fdt_capturado_por, cre53_fdt_observaciones: inv.cre53_fdt_observaciones });
    setModalOpen(true);
  }

  function updateField(k: keyof InvMPForm, v: unknown) {
    setForm(p => {
      const next = { ...p, [k]: v } as InvMPForm;
      if (k === 'cre53_mp') {
        const mp = mpMap[v as string];
        if (mp) next.cre53_fdt_precio_unitario = mp.cre53_fdt_precio_base;
      }
      next.cre53_fdt_valor = next.cre53_fdt_cantidad_base * next.cre53_fdt_precio_unitario;
      next.cre53_fdt_cantidad_almacen = toAlmacen(next.cre53_fdt_cantidad_base, mpMap[next._cre53_mp_value ?? ""]?.cre53_fdt_factor_conversion ?? 1);
      return next;
    });
  }

  async function handleSave() {
    if (editing) await update.mutateAsync({ id: editing.cre53_inventariompid, d: form });
    else await create.mutateAsync(form);
    setModalOpen(false);
  }

  const selectedMP = mpMap[form._cre53_mp_value ?? ''];

  return (
    <div>
      <PageHeader
        title="Inventario — Materia Prima"
        subtitle={periodo ? `Período: ${periodo.cre53_id}` : 'Sin período activo'}
        action={tab === 'captura' ? <button className="btn-primary" onClick={openCreate} disabled={!periodoId}><Plus size={16} />Capturar</button> : undefined}
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KPICard title="Valor Total Inventario MP" value={totalValor} format="currency" icon={<TrendingDown size={18} />} color="blue" />
        <KPICard title="Registros Capturados" value={invMP.length} format="number" color="green" />
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
            data={invMP} rowKey={r => r.cre53_inventariompid}
            columns={[
              { key: 'cre53_mp', header: 'Materia Prima', render: r => mpMap[r._cre53_mp_value]?.cre53_fdt_descripcion ?? r._cre53_mp_value },
              { key: 'cre53_mp', header: 'Grupo', render: r => { const mp = mpMap[r._cre53_mp_value]; return mp ? <Badge label={GRUPO_MP_LABEL[mp.cre53_fdt_grupo]} variant="info" /> : null; } },
              { key: 'cre53_fdt_cantidad_almacen', header: 'Cant. Almacén', align: 'right', render: r => `${fmtNum(r.cre53_fdt_cantidad_almacen)} ${mpMap[r._cre53_mp_value]?.cre53_fdt_unidad_almacen ?? ''}` },
              { key: 'cre53_fdt_cantidad_base', header: 'Cant. Base', align: 'right', render: r => <span className="text-gray-400 text-xs">{fmtNum(r.cre53_fdt_cantidad_base, 3)} {mpMap[r._cre53_mp_value]?.cre53_fdt_unidad_compra}</span> },
              { key: 'cre53_fdt_precio_unitario', header: 'Precio/Base', align: 'right', render: r => fmtPeso(r.cre53_fdt_precio_unitario) },
              { key: 'cre53_fdt_valor', header: 'Valor', align: 'right', render: r => <span className="font-semibold">{fmtPeso(r.cre53_fdt_valor)}</span> },
              { key: 'cre53_fdt_fecha_conteo', header: 'Fecha', render: r => r.cre53_fdt_fecha_conteo?.split('T')[0] ?? '—' },
              { key: 'cre53_inventariompid', header: '', align: 'right', width: '80px', render: r => (
                <div className="flex justify-end gap-1">
                  <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-gray-400 hover:text-danger hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                </div>
              )},
            ]}
          />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <DataTable
            data={resumen} rowKey={r => r.mp.cre53_materiaprimaid} compact
            columns={[
              { key: 'mp', header: 'Materia Prima', render: r => <span className="font-medium">{r.mp.cre53_fdt_alias || r.mp.cre53_fdt_descripcion}</span> },
              { key: 'comprasMp', header: 'Compras', align: 'right', render: r => fmtNum(r.comprasMp, 2) },
              { key: 'consumo', header: 'Consumo Teórico', align: 'right', render: r => <span className="text-orange-600">{fmtNum(r.consumo, 3)}</span> },
              { key: 'teorico', header: 'Inv. Teórico', align: 'right', render: r => <span className="font-medium">{fmtNum(r.teorico, 3)}</span> },
              { key: 'fisicoVal', header: 'Inv. Físico', align: 'right', render: r => <span className="font-medium">{fmtNum(r.fisicoVal, 3)}</span> },
              { key: 'diff', header: 'Diferencia', align: 'right', render: r => <span className={r.diff < 0 ? 'text-danger font-semibold' : r.diff > 0 ? 'text-warning' : 'text-success'}>{fmtNum(r.diff, 3)}</span> },
              { key: 'pct', header: '%', align: 'right', render: r => <Badge label={fmtPct(r.pct)} variant={SEM_BADGE[semaforo(r.pct)]} /> },
            ]}
          />
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Conteo MP' : 'Capturar Inventario MP'} size="md">
        <div className="space-y-4">
          <div>
            <label className="form-label">Materia Prima *</label>
            <select className="form-select" value={form.cre53_mp} onChange={e => updateField('_cre53_mp_value', e.target.value)}>
              <option value="">Seleccionar...</option>
              {mps.map(m => <option key={m.cre53_materiaprimaid} value={m.cre53_materiaprimaid}>{m.cre53_fdt_codigo} — {m.cre53_fdt_descripcion}</option>)}
            </select>
          </div>

          {selectedMP && (
            <div className="bg-blue-50 rounded-lg p-3 text-xs grid grid-cols-3 gap-2">
              <div><span className="text-gray-500">Unidad compra</span><p className="font-semibold">{selectedMP.cre53_fdt_unidad_compra}</p></div>
              <div><span className="text-gray-500">Factor</span><p className="font-semibold">1 {selectedMP.cre53_fdt_unidad_almacen} = {selectedMP.cre53_fdt_factor_conversion} {selectedMP.cre53_fdt_unidad_compra}</p></div>
              <div><span className="text-gray-500">Precio base</span><p className="font-semibold">{fmtPeso(selectedMP.cre53_fdt_precio_base)}/{selectedMP.cre53_fdt_unidad_compra}</p></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Cantidad ({selectedMP?.cre53_fdt_unidad_almacen ?? 'almacén'}) *</label>
              <input type="number" step="0.001" min="0" className="form-input"
                value={selectedMP ? toAlmacen(form.cre53_fdt_cantidad_base, selectedMP.cre53_fdt_factor_conversion) : form.cre53_fdt_cantidad_base}
                onChange={e => {
                  const almacen = parseFloat(e.target.value) || 0;
                  updateField('cre53_fdt_cantidad_base', almacen * (selectedMP?.cre53_fdt_factor_conversion ?? 1));
                }} />
              {selectedMP && form.cre53_fdt_cantidad_base > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">= {fmtNum(form.cre53_fdt_cantidad_base, 3)} {selectedMP.cre53_fdt_unidad_compra}</p>
              )}
            </div>
            <div>
              <label className="form-label">Precio ({selectedMP?.cre53_fdt_unidad_compra ?? 'base'})</label>
              <input type="number" step="0.01" className="form-input" value={form.cre53_fdt_precio_unitario}
                onChange={e => updateField('cre53_fdt_precio_unitario', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Valor Total</label>
              <input className="form-input bg-gray-50" readOnly value={fmtPeso(form.cre53_fdt_valor)} />
            </div>
            <div>
              <label className="form-label">Fecha de Conteo *</label>
              <input type="date" className="form-input" value={form.cre53_fdt_fecha_conteo?.split('T')[0] ?? ''}
                onChange={e => updateField('cre53_fdt_fecha_conteo', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="form-label">Capturado por</label>
            <input className="form-input" value={form.cre53_fdt_capturado_por ?? ''} onChange={e => updateField('cre53_fdt_capturado_por', e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={create.isPending || update.isPending || !form.cre53_mp}>
              {create.isPending || update.isPending ? 'Guardando...' : editing ? 'Guardar' : 'Registrar'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        message={`¿Eliminar conteo de "${mpMap[deleteTarget?.cre53_mp ?? '']?.cre53_fdt_descripcion}"?`}
        onConfirm={() => { remove.mutateAsync(deleteTarget!.cre53_inventariompid); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)} loading={remove.isPending}
      />
    </div>
  );
}
