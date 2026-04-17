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
  const periodoId = periodo?.fdt_periodoid ?? null;
  const { data: compras = [], isLoading } = useCompras(periodoId);
  const { data: mps = [] } = useMP();
  const { create, remove } = useComprasMutations(periodoId);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm] = useState<Partial<CompraForm>>({ fdt_periodo: periodoId ?? '', fdt_cantidad_base: 0, fdt_precio_unitario: 0, fdt_fecha: new Date().toISOString().split('T')[0] });

  const mpMap = useMemo(() => Object.fromEntries(mps.map(m => [m.fdt_mpid, m])), [mps]);
  const totalValor = compras.reduce((s, c) => s + c.fdt_valor, 0);

  function updateField(k: keyof CompraForm, v: any) {
    setForm(p => {
      const next = { ...p, [k]: v };
      if (k === 'fdt_mp') { const mp = mpMap[v]; if (mp) next.fdt_precio_unitario = mp.fdt_precio_base; }
      next.fdt_valor = (next.fdt_cantidad_base ?? 0) * (next.fdt_precio_unitario ?? 0);
      return next;
    });
  }

  async function handleSave() {
    await create.mutateAsync({ ...form, fdt_periodo: periodoId!, fdt_valor: (form.fdt_cantidad_base ?? 0) * (form.fdt_precio_unitario ?? 0) } as CompraForm);
    setModalOpen(false);
  }

  const selectedMP = mpMap[form.fdt_mp ?? ''];

  return (
    <div>
      <PageHeader
        title="Compras de Materia Prima"
        subtitle={periodo?.fdt_nombre ?? 'Sin período activo'}
        action={<button className="btn-primary" onClick={() => { setForm({ fdt_periodo: periodoId ?? '', fdt_cantidad_base: 0, fdt_precio_unitario: 0, fdt_fecha: new Date().toISOString().split('T')[0] }); setModalOpen(true); }} disabled={!periodoId}><Plus size={16} />Nueva compra</button>}
      />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KPICard title="Total Compras (valor)" value={totalValor} format="currency" color="blue" />
        <KPICard title="Registros" value={compras.length} format="number" color="green" />
      </div>
      {isLoading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          <DataTable
            data={compras} rowKey={r => r.fdt_compra_mpid}
            columns={[
              { key: 'fdt_mp', header: 'Materia Prima', render: r => mpMap[r.fdt_mp]?.fdt_descripcion ?? r.fdt_mp },
              {
                key: 'fdt_cantidad_base', header: 'Cantidad', align: 'right',
                render: r => {
                  const mp = mpMap[r.fdt_mp];
                  return (
                    <div className="text-right text-xs">
                      <div className="font-medium">{fmtNum(toAlmacen(r.fdt_cantidad_base, mp?.fdt_factor_conversion ?? 1))} {mp?.fdt_unidad_almacen}</div>
                      <div className="text-gray-400">{fmtNum(r.fdt_cantidad_base, 3)} {mp?.fdt_unidad_compra}</div>
                    </div>
                  );
                }
              },
              { key: 'fdt_precio_unitario', header: 'Precio Base', align: 'right', render: r => fmtPeso(r.fdt_precio_unitario) },
              { key: 'fdt_valor', header: 'Valor', align: 'right', render: r => <span className="font-semibold">{fmtPeso(r.fdt_valor)}</span> },
              { key: 'fdt_proveedor', header: 'Proveedor', render: r => r.fdt_proveedor ?? '—' },
              { key: 'fdt_folio', header: 'Folio', render: r => r.fdt_folio ?? '—' },
              { key: 'fdt_fecha', header: 'Fecha', render: r => r.fdt_fecha?.split('T')[0] ?? '—' },
              { key: 'actions', header: '', align: 'right', width: '50px', render: r => <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-gray-300 hover:text-danger rounded"><Trash2 size={14} /></button> },
            ]}
          />
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar Compra MP" size="md">
        <div className="space-y-4">
          <div>
            <label className="form-label">Materia Prima *</label>
            <select className="form-select" value={form.fdt_mp ?? ''} onChange={e => updateField('fdt_mp', e.target.value)}>
              <option value="">Seleccionar...</option>
              {mps.map(m => <option key={m.fdt_mpid} value={m.fdt_mpid}>{m.fdt_codigo} — {m.fdt_descripcion}</option>)}
            </select>
          </div>
          {selectedMP && (
            <div className="bg-blue-50 rounded p-3 text-xs">
              1 {selectedMP.fdt_unidad_almacen} = {selectedMP.fdt_factor_conversion} {selectedMP.fdt_unidad_compra} · Precio ref: {fmtPeso(selectedMP.fdt_precio_base)}/{selectedMP.fdt_unidad_compra}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Cantidad ({selectedMP?.fdt_unidad_almacen ?? 'almacén'}) *</label>
              <input type="number" step="0.001" min="0" className="form-input"
                value={selectedMP && form.fdt_cantidad_base ? toAlmacen(form.fdt_cantidad_base, selectedMP.fdt_factor_conversion) : ''}
                onChange={e => {
                  const almacen = parseFloat(e.target.value) || 0;
                  updateField('fdt_cantidad_base', almacen * (selectedMP?.fdt_factor_conversion ?? 1));
                }} />
            </div>
            <div>
              <label className="form-label">Precio ({selectedMP?.fdt_unidad_compra ?? 'base'})</label>
              <input type="number" step="0.01" className="form-input" value={form.fdt_precio_unitario ?? 0} onChange={e => updateField('fdt_precio_unitario', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Proveedor</label>
              <input className="form-input" value={form.fdt_proveedor ?? ''} onChange={e => setForm(p => ({ ...p, fdt_proveedor: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Folio / Factura</label>
              <input className="form-input" value={form.fdt_folio ?? ''} onChange={e => setForm(p => ({ ...p, fdt_folio: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="form-label">Fecha *</label>
            <input type="date" className="form-input" value={form.fdt_fecha?.split('T')[0] ?? ''} onChange={e => setForm(p => ({ ...p, fdt_fecha: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Valor Total</label>
            <input className="form-input bg-gray-50" readOnly value={fmtPeso((form.fdt_cantidad_base ?? 0) * (form.fdt_precio_unitario ?? 0))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={create.isPending || !form.fdt_mp}>
              {create.isPending ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} message="¿Eliminar esta compra?"
        onConfirm={() => { remove.mutateAsync(deleteTarget.fdt_compra_mpid); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)} loading={remove.isPending} />
    </div>
  );
}
