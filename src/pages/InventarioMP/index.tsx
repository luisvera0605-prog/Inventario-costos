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
  const periodoId = periodo?.fdt_periodoid ?? null;

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
    fdt_periodo: '', fdt_bodega: '', fdt_mp: '',
    fdt_cantidad_base: 0, fdt_cantidad_almacen: 0,
    fdt_precio_unitario: 0, fdt_valor: 0,
    fdt_fecha_conteo: new Date().toISOString().split('T')[0],
  });

  const mpMap = useMemo(() => Object.fromEntries(mps.map(m => [m.fdt_mpid, m])), [mps]);
  const comprasMap = useMemo(() => totalComprasPorMP(compras), [compras]);
  const fisicoMap = useMemo(() => invFisicoPorMP(invMP), [invMP]);

  const resumen = useMemo(() => mps.map(mp => {
    const comprasMp = comprasMap[mp.fdt_mpid] ?? 0;
    const consumo = consumoTeoricoMP(mp.fdt_mpid, recetas, produccion);
    const teorico = inventarioTeoricoMP(0, comprasMp, consumo);
    const fisicoVal = fisicoMap[mp.fdt_mpid] ?? 0;
    const diff = diferencia(fisicoVal, teorico);
    const pct = pctDiferencia(fisicoVal, teorico);
    return { mp, comprasMp, consumo, teorico, fisicoVal, diff, pct };
  }).filter(r => r.teorico !== 0 || r.fisicoVal !== 0), [mps, comprasMap, fisicoMap, recetas, produccion]);

  const totalValor = invMP.reduce((s, i) => s + i.fdt_valor, 0);
  const mermaValor = resumen
    .filter(r => r.diff < 0)
    .reduce((s, r) => s + Math.abs(r.diff) * (mpMap[r.mp.fdt_mpid]?.fdt_precio_base ?? 0), 0);

  function openCreate() {
    setEditing(null);
    setForm({ fdt_periodo: periodoId ?? '', fdt_bodega: '', fdt_mp: '', fdt_cantidad_base: 0, fdt_cantidad_almacen: 0, fdt_precio_unitario: 0, fdt_valor: 0, fdt_fecha_conteo: new Date().toISOString().split('T')[0] });
    setModalOpen(true);
  }

  function openEdit(inv: InventarioMP) {
    setEditing(inv);
    setForm({ fdt_periodo: inv.fdt_periodo, fdt_bodega: inv.fdt_bodega, fdt_mp: inv.fdt_mp, fdt_cantidad_base: inv.fdt_cantidad_base, fdt_cantidad_almacen: inv.fdt_cantidad_almacen, fdt_precio_unitario: inv.fdt_precio_unitario, fdt_valor: inv.fdt_valor, fdt_fecha_conteo: inv.fdt_fecha_conteo, fdt_capturado_por: inv.fdt_capturado_por, fdt_observaciones: inv.fdt_observaciones });
    setModalOpen(true);
  }

  function updateField(k: keyof InvMPForm, v: unknown) {
    setForm(p => {
      const next = { ...p, [k]: v } as InvMPForm;
      if (k === 'fdt_mp') {
        const mp = mpMap[v as string];
        if (mp) next.fdt_precio_unitario = mp.fdt_precio_base;
      }
      next.fdt_valor = next.fdt_cantidad_base * next.fdt_precio_unitario;
      next.fdt_cantidad_almacen = toAlmacen(next.fdt_cantidad_base, mpMap[next.fdt_mp]?.fdt_factor_conversion ?? 1);
      return next;
    });
  }

  async function handleSave() {
    if (editing) await update.mutateAsync({ id: editing.fdt_inventario_mpid, d: form });
    else await create.mutateAsync(form);
    setModalOpen(false);
  }

  const selectedMP = mpMap[form.fdt_mp];

  return (
    <div>
      <PageHeader
        title="Inventario — Materia Prima"
        subtitle={periodo ? `Período: ${periodo.fdt_nombre}` : 'Sin período activo'}
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
            data={invMP} rowKey={r => r.fdt_inventario_mpid}
            columns={[
              { key: 'fdt_mp', header: 'Materia Prima', render: r => mpMap[r.fdt_mp]?.fdt_descripcion ?? r.fdt_mp },
              { key: 'fdt_mp', header: 'Grupo', render: r => { const mp = mpMap[r.fdt_mp]; return mp ? <Badge label={GRUPO_MP_LABEL[mp.fdt_grupo]} variant="info" /> : null; } },
              { key: 'fdt_cantidad_almacen', header: 'Cant. Almacén', align: 'right', render: r => `${fmtNum(r.fdt_cantidad_almacen)} ${mpMap[r.fdt_mp]?.fdt_unidad_almacen ?? ''}` },
              { key: 'fdt_cantidad_base', header: 'Cant. Base', align: 'right', render: r => <span className="text-gray-400 text-xs">{fmtNum(r.fdt_cantidad_base, 3)} {mpMap[r.fdt_mp]?.fdt_unidad_compra}</span> },
              { key: 'fdt_precio_unitario', header: 'Precio/Base', align: 'right', render: r => fmtPeso(r.fdt_precio_unitario) },
              { key: 'fdt_valor', header: 'Valor', align: 'right', render: r => <span className="font-semibold">{fmtPeso(r.fdt_valor)}</span> },
              { key: 'fdt_fecha_conteo', header: 'Fecha', render: r => r.fdt_fecha_conteo?.split('T')[0] ?? '—' },
              { key: 'fdt_inventario_mpid', header: '', align: 'right', width: '80px', render: r => (
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
            data={resumen} rowKey={r => r.mp.fdt_mpid} compact
            columns={[
              { key: 'mp', header: 'Materia Prima', render: r => <span className="font-medium">{r.mp.fdt_alias || r.mp.fdt_descripcion}</span> },
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
            <select className="form-select" value={form.fdt_mp} onChange={e => updateField('fdt_mp', e.target.value)}>
              <option value="">Seleccionar...</option>
              {mps.map(m => <option key={m.fdt_mpid} value={m.fdt_mpid}>{m.fdt_codigo} — {m.fdt_descripcion}</option>)}
            </select>
          </div>

          {selectedMP && (
            <div className="bg-blue-50 rounded-lg p-3 text-xs grid grid-cols-3 gap-2">
              <div><span className="text-gray-500">Unidad compra</span><p className="font-semibold">{selectedMP.fdt_unidad_compra}</p></div>
              <div><span className="text-gray-500">Factor</span><p className="font-semibold">1 {selectedMP.fdt_unidad_almacen} = {selectedMP.fdt_factor_conversion} {selectedMP.fdt_unidad_compra}</p></div>
              <div><span className="text-gray-500">Precio base</span><p className="font-semibold">{fmtPeso(selectedMP.fdt_precio_base)}/{selectedMP.fdt_unidad_compra}</p></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Cantidad ({selectedMP?.fdt_unidad_almacen ?? 'almacén'}) *</label>
              <input type="number" step="0.001" min="0" className="form-input"
                value={selectedMP ? toAlmacen(form.fdt_cantidad_base, selectedMP.fdt_factor_conversion) : form.fdt_cantidad_base}
                onChange={e => {
                  const almacen = parseFloat(e.target.value) || 0;
                  updateField('fdt_cantidad_base', almacen * (selectedMP?.fdt_factor_conversion ?? 1));
                }} />
              {selectedMP && form.fdt_cantidad_base > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">= {fmtNum(form.fdt_cantidad_base, 3)} {selectedMP.fdt_unidad_compra}</p>
              )}
            </div>
            <div>
              <label className="form-label">Precio ({selectedMP?.fdt_unidad_compra ?? 'base'})</label>
              <input type="number" step="0.01" className="form-input" value={form.fdt_precio_unitario}
                onChange={e => updateField('fdt_precio_unitario', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Valor Total</label>
              <input className="form-input bg-gray-50" readOnly value={fmtPeso(form.fdt_valor)} />
            </div>
            <div>
              <label className="form-label">Fecha de Conteo *</label>
              <input type="date" className="form-input" value={form.fdt_fecha_conteo?.split('T')[0] ?? ''}
                onChange={e => updateField('fdt_fecha_conteo', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="form-label">Capturado por</label>
            <input className="form-input" value={form.fdt_capturado_por ?? ''} onChange={e => updateField('fdt_capturado_por', e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={create.isPending || update.isPending || !form.fdt_mp}>
              {create.isPending || update.isPending ? 'Guardando...' : editing ? 'Guardar' : 'Registrar'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        message={`¿Eliminar conteo de "${mpMap[deleteTarget?.fdt_mp ?? '']?.fdt_descripcion}"?`}
        onConfirm={() => { remove.mutateAsync(deleteTarget!.fdt_inventario_mpid); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)} loading={remove.isPending}
      />
    </div>
  );
}
