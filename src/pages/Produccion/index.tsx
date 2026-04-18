// ─── PRODUCCIÓN ───────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';
import { Modal } from '../../components/shared/Modal';
import { PageHeader, KPICard, Spinner, ConfirmDialog } from '../../components/shared';
import { useProduccion, useProduccionMutations, useSKUs, usePeriodoActivo } from '../../hooks';
import { fmtNum } from '../../utils';
import type { ProduccionForm } from '../../types';
import { TIPO_EMPAQUE_LABEL, TURNO_LABEL } from '../../types';

export function ProduccionPage() {
  const { data: periodo } = usePeriodoActivo();
  const periodoId = periodo?.cre53_periodoid ?? null;
  const { data: produccion = [], isLoading } = useProduccion(periodoId);
  const { data: skus = [] } = useSKUs();
  const { create, remove } = useProduccionMutations(periodoId);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm] = useState<Partial<ProduccionForm>>({ _cre53_periodo_value: periodoId ?? '', cre53_fdt_cantidad_botellas: 0, cre53_fdt_semana: 1, cre53_fdt_turno: 1, cre53_fdt_fecha: new Date().toISOString().split('T')[0] });

  const skuMap = useMemo(() => Object.fromEntries(skus.map(s => [s.cre53_skuid, s])), [skus]);
  const totalBotellas = produccion.reduce((s, p) => s + p.cre53_fdt_cantidad_botellas, 0);
  const totalLitros = produccion.reduce((s, p) => s + (p.cre53_fdt_litros ?? 0), 0);

  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    const sku = skuMap[form.cre53_sku ?? ''];
    const litros = sku ? (form.cre53_fdt_cantidad_botellas ?? 0) * (sku.cre53_fdt_mililitros / 1000) : 0;
    await create.mutateAsync({ ...form, _cre53_periodo_value: periodoId!, cre53_fdt_litros: litros } as ProduccionForm);
    setModalOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Producción"
        subtitle={periodo?.cre53_fdt_nombre ?? 'Sin período activo'}
        action={<button className="btn-primary" onClick={() => { setForm({ _cre53_periodo_value: periodoId ?? '', cre53_fdt_cantidad_botellas: 0, cre53_fdt_semana: 1, cre53_fdt_turno: 1, cre53_fdt_fecha: new Date().toISOString().split('T')[0] }); setModalOpen(true); }} disabled={!periodoId}><Plus size={16} />Registrar</button>}
      />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KPICard title="Total Botellas Producidas" value={totalBotellas} format="number" color="blue" />
        <KPICard title="Total Litros Producidos" value={totalLitros} format="number" color="green" />
        <KPICard title="Registros" value={produccion.length} format="number" color="yellow" />
      </div>
      {isLoading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          <DataTable
            data={produccion} rowKey={r => r.cre53_produccionid}
            columns={[
              { key: 'cre53_sku', header: 'SKU', render: r => { const s = skuMap[r._cre53_sku_value]; return s ? `${s.cre53_fdt_presentacion} (${TIPO_EMPAQUE_LABEL[s.cre53_fdt_tipo_empaque]})` : r._cre53_sku_value; } },
              { key: 'cre53_fdt_cantidad_botellas', header: 'Botellas', align: 'right', render: r => <span className="font-semibold">{fmtNum(r.cre53_fdt_cantidad_botellas, 0)}</span> },
              { key: 'cre53_fdt_litros', header: 'Litros', align: 'right', render: r => fmtNum(r.cre53_fdt_litros ?? 0, 1) },
              { key: 'cre53_fdt_semana', header: 'Semana', align: 'center', render: r => r.cre53_fdt_semana ? `Sem ${r.cre53_fdt_semana}` : '—' },
              { key: 'cre53_fdt_turno', header: 'Turno', render: r => r.cre53_fdt_turno ? TURNO_LABEL[r.cre53_fdt_turno] : '—' },
              { key: 'cre53_fdt_fecha', header: 'Fecha', render: r => r.cre53_fdt_fecha?.split('T')[0] ?? '—' },
              { key: 'actions', header: '', align: 'right', width: '50px', render: r => <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-gray-300 hover:text-danger rounded"><Trash2 size={14} /></button> },
            ]}
          />
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar Producción" size="md">
        <div className="space-y-4">
          <div>
            <label className="form-label">SKU *</label>
            <select className="form-select" value={form.cre53_sku ?? ''} onChange={e => f('_cre53_sku_value', e.target.value)}>
              <option value="">Seleccionar...</option>
              {skus.map(s => <option key={s.cre53_skuid} value={s.cre53_skuid}>{s.cre53_fdt_codigo} — {s.cre53_fdt_presentacion}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">Botellas *</label>
              <input type="number" min="0" className="form-input" value={form.cre53_fdt_cantidad_botellas ?? 0} onChange={e => f('cre53_fdt_cantidad_botellas', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="form-label">Semana</label>
              <input type="number" min="1" max="6" className="form-input" value={form.cre53_fdt_semana ?? ''} onChange={e => f('cre53_fdt_semana', parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className="form-label">Turno</label>
              <select className="form-select" value={form.cre53_fdt_turno ?? 1} onChange={e => f('cre53_fdt_turno', Number(e.target.value))}>
                <option value={1}>Turno 1</option>
                <option value={2}>Turno 2</option>
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Fecha *</label>
            <input type="date" className="form-input" value={form.cre53_fdt_fecha?.split('T')[0] ?? ''} onChange={e => f('cre53_fdt_fecha', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={create.isPending || !form.cre53_sku}>
              {create.isPending ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} message="¿Eliminar este registro de producción?"
        onConfirm={() => { remove.mutateAsync(deleteTarget.cre53_produccionid); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)} loading={remove.isPending} />
    </div>
  );
}

export default ProduccionPage;
