import { useState, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';
import { Modal } from '../../components/shared/Modal';
import { PageHeader, KPICard, Spinner, ConfirmDialog } from '../../components/shared';
import { useCompras, useComprasMutations, useMP, usePeriodoActivo } from '../../hooks';
import { fmtPeso, fmtNum, toAlmacen } from '../../utils';
import type { CompraForm } from '../../types';

export default function ComprasPage() {
  const { data: periodo } = usePeriodoActivo();
  const periodoId = periodo?.cre53_periodoid ?? null;
  const { data: compras = [], isLoading } = useCompras(periodoId);
  const { data: mps = [] } = useMP();
  const { create, remove } = useComprasMutations(periodoId);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm] = useState<Partial<CompraForm>>({ _cre53_periodo_value: periodoId ?? '', cre53_cantidad_base: 0, cre53_precio_unitario: 0, cre53_fecha: new Date().toISOString().split('T')[0] });

  const mpMap = useMemo(() => Object.fromEntries(mps.map(m => [m.cre53_materiaprimaid, m])), [mps]);
  const totalValor = compras.reduce((s, c) => s + c.cre53_valor, 0);

  function updateField(k: keyof CompraForm, v: any) {
    setForm(p => {
      const next = { ...p, [k]: v };
      if (k === 'cre53_mp') { const mp = mpMap[v]; if (mp) next.cre53_precio_unitario = mp.cre53_precio_base; }
      next.cre53_valor = (next.cre53_cantidad_base ?? 0) * (next.cre53_precio_unitario ?? 0);
      return next;
    });
  }

  async function handleSave() {
    await create.mutateAsync({ ...form, _cre53_periodo_value: periodoId!, cre53_valor: (form.cre53_cantidad_base ?? 0) * (form.cre53_precio_unitario ?? 0) } as CompraForm);
    setModalOpen(false);
  }

  const selectedMP = mpMap[form.cre53_mp ?? ''];

  return (
    <div>
      <PageHeader
        title="Compras de Materia Prima"
        subtitle={periodo?.cre53_nombre ?? 'Sin período activo'}
        action={<button className="btn-primary" onClick={() => { setForm({ _cre53_periodo_value: periodoId ?? '', cre53_cantidad_base: 0, cre53_precio_unitario: 0, cre53_fecha: new Date().toISOString().split('T')[0] }); setModalOpen(true); }} disabled={!periodoId}><Plus size={16} />Nueva compra</button>}
      />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KPICard title="Total Compras (valor)" value={totalValor} format="currency" color="blue" />
        <KPICard title="Registros" value={compras.length} format="number" color="green" />
      </div>
      {isLoading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          <DataTable
            data={compras} rowKey={r => r.cre53_comprampid}
            columns={[
              { key: 'cre53_mp', header: 'Materia Prima', render: r => mpMap[r._cre53_mp_value]?.cre53_descripcion ?? r._cre53_mp_value },
              {
                key: 'cre53_cantidad_base', header: 'Cantidad', align: 'right',
                render: r => {
                  const mp = mpMap[r._cre53_mp_value];
                  return (
                    <div className="text-right text-xs">
                      <div className="font-medium">{fmtNum(toAlmacen(r.cre53_cantidad_base, mp?.cre53_factor_conversion ?? 1))} {mp?.cre53_unidad_almacen}</div>
                      <div className="text-gray-400">{fmtNum(r.cre53_cantidad_base, 3)} {mp?.cre53_unidad_compra}</div>
                    </div>
                  );
                }
              },
              { key: 'cre53_precio_unitario', header: 'Precio Base', align: 'right', render: r => fmtPeso(r.cre53_precio_unitario) },
              { key: 'cre53_valor', header: 'Valor', align: 'right', render: r => <span className="font-semibold">{fmtPeso(r.cre53_valor)}</span> },
              { key: 'cre53_proveedor', header: 'Proveedor', render: r => r.cre53_proveedor ?? '—' },
              { key: 'cre53_folio', header: 'Folio', render: r => r.cre53_folio ?? '—' },
              { key: 'cre53_fecha', header: 'Fecha', render: r => r.cre53_fecha?.split('T')[0] ?? '—' },
              { key: 'actions', header: '', align: 'right', width: '50px', render: r => <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-gray-300 hover:text-danger rounded"><Trash2 size={14} /></button> },
            ]}
          />
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar Compra MP" size="md">
        <div className="space-y-4">
          <div>
            <label className="form-label">Materia Prima *</label>
            <select className="form-select" value={form.cre53_mp ?? ''} onChange={e => updateField('_cre53_mp_value', e.target.value)}>
              <option value="">Seleccionar...</option>
              {mps.map(m => <option key={m.cre53_materiaprimaid} value={m.cre53_materiaprimaid}>{m.cre53_codigo} — {m.cre53_descripcion}</option>)}
            </select>
          </div>
          {selectedMP && (
            <div className="bg-blue-50 rounded p-3 text-xs">
              1 {selectedMP.cre53_unidad_almacen} = {selectedMP.cre53_factor_conversion} {selectedMP.cre53_unidad_compra} · Precio ref: {fmtPeso(selectedMP.cre53_precio_base)}/{selectedMP.cre53_unidad_compra}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Cantidad ({selectedMP?.cre53_unidad_almacen ?? 'almacén'}) *</label>
              <input type="number" step="0.001" min="0" className="form-input"
                value={selectedMP && form.cre53_cantidad_base ? toAlmacen(form.cre53_cantidad_base, selectedMP.cre53_factor_conversion) : ''}
                onChange={e => {
                  const almacen = parseFloat(e.target.value) || 0;
                  updateField('cre53_cantidad_base', almacen * (selectedMP?.cre53_factor_conversion ?? 1));
                }} />
            </div>
            <div>
              <label className="form-label">Precio ({selectedMP?.cre53_unidad_compra ?? 'base'})</label>
              <input type="number" step="0.01" className="form-input" value={form.cre53_precio_unitario ?? 0} onChange={e => updateField('cre53_precio_unitario', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Proveedor</label>
              <input className="form-input" value={form.cre53_proveedor ?? ''} onChange={e => setForm(p => ({ ...p, cre53_proveedor: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Folio / Factura</label>
              <input className="form-input" value={form.cre53_folio ?? ''} onChange={e => setForm(p => ({ ...p, cre53_folio: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="form-label">Fecha *</label>
            <input type="date" className="form-input" value={form.cre53_fecha?.split('T')[0] ?? ''} onChange={e => setForm(p => ({ ...p, cre53_fecha: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Valor Total</label>
            <input className="form-input bg-gray-50" readOnly value={fmtPeso((form.cre53_cantidad_base ?? 0) * (form.cre53_precio_unitario ?? 0))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={create.isPending || !form.cre53_mp}>
              {create.isPending ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} message="¿Eliminar esta compra?"
        onConfirm={() => { remove.mutateAsync(deleteTarget.cre53_comprampid); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)} loading={remove.isPending} />
    </div>
  );
}
