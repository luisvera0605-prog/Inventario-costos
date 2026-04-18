// ─── BODEGAS ─────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';
import { Modal } from '../../components/shared/Modal';
import { PageHeader, Badge, ConfirmDialog, Spinner } from '../../components/shared';
import { useBodegas, useBodegaMutations } from '../../hooks';
import type { Bodega, BodegaForm } from '../../types';
import { TIPO_BODEGA_LABEL } from '../../types';

const defaultBodega = (): BodegaForm => ({ cre53_fdt_nombre: '', cre53_fdt_tipo: 2, cre53_fdt_ubicacion: '', cre53_fdt_activo: true });

export function BodegasPage() {
  const { data: bodegas = [], isLoading } = useBodegas();
  const { create, update, remove } = useBodegaMutations();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Bodega | null>(null);
  const [form, setForm] = useState<BodegaForm>(defaultBodega());
  const [deleteTarget, setDeleteTarget] = useState<Bodega | null>(null);

  function openEdit(b: Bodega) { setEditing(b); setForm({ cre53_fdt_nombre: b.cre53_fdt_nombre, cre53_fdt_tipo: b.cre53_fdt_tipo, cre53_fdt_ubicacion: b.cre53_fdt_ubicacion ?? '', cre53_fdt_activo: b.cre53_fdt_activo }); setModalOpen(true); }
  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const saving = create.isPending || update.isPending;

  async function handleSave() {
    if (editing) await update.mutateAsync({ id: editing.cre53_bodegaid, d: form });
    else await create.mutateAsync(form);
    setModalOpen(false);
  }

  return (
    <div>
      <PageHeader title="Bodegas" subtitle={`${bodegas.length} bodegas registradas`}
        action={<button className="btn-primary" onClick={() => { setEditing(null); setForm(defaultBodega()); setModalOpen(true); }}><Plus size={16} />Nueva Bodega</button>} />
      {isLoading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          <DataTable data={bodegas} rowKey={r => r.cre53_bodegaid} columns={[
            { key: 'cre53_id', header: 'Nombre', sortable: true },
            { key: 'cre53_fdt_tipo', header: 'Tipo', render: r => <Badge label={TIPO_BODEGA_LABEL[r.cre53_fdt_tipo]} variant={r.cre53_fdt_tipo === 1 ? 'info' : 'gray'} /> },
            { key: 'cre53_fdt_ubicacion', header: 'Ubicación', render: r => r.cre53_fdt_ubicacion || '—' },
            { key: 'cre53_fdt_activo', header: 'Estado', render: r => <Badge label={r.cre53_fdt_activo ? 'Activa' : 'Inactiva'} variant={r.cre53_fdt_activo ? 'success' : 'gray'} /> },
            { key: 'actions', header: '', align: 'right', width: '80px', render: r => (
              <div className="flex justify-end gap-1">
                <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded"><Pencil size={14} /></button>
                <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-gray-400 hover:text-danger hover:bg-red-50 rounded"><Trash2 size={14} /></button>
              </div>
            )},
          ]} />
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Bodega' : 'Nueva Bodega'} size="sm">
        <div className="space-y-4">
          <div><label className="form-label">Nombre *</label><input className="form-input" value={form.cre53_fdt_nombre} onChange={e => f('cre53_fdt_nombre', e.target.value)} /></div>
          <div><label className="form-label">Tipo *</label>
            <select className="form-select" value={form.cre53_fdt_tipo} onChange={e => f('cre53_fdt_tipo', Number(e.target.value))}>
              <option value={1}>MP + PT (Teapa)</option><option value={2}>Solo PT</option>
            </select>
          </div>
          <div><label className="form-label">Ubicación</label><input className="form-input" value={form.cre53_fdt_ubicacion ?? ''} onChange={e => f('cre53_fdt_ubicacion', e.target.value)} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !form.cre53_fdt_nombre}>{saving ? 'Guardando...' : editing ? 'Guardar' : 'Crear'}</button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} message={`¿Eliminar bodega "${deleteTarget?.cre53_fdt_nombre}"?`}
        onConfirm={() => { remove.mutateAsync(deleteTarget!.cre53_bodegaid); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)} loading={remove.isPending} />
    </div>
  );
}

// ─── PERIODOS ─────────────────────────────────────────────────────────────────
import { usePeriodos, usePeriodoMutations } from '../../hooks';
import type { Periodo, PeriodoForm } from '../../types';
import { MES_LABEL } from '../../types';
import { fmtFecha } from '../../utils';
import { Lock, Unlock } from 'lucide-react';

const defaultPeriodo = (): PeriodoForm => {
  const now = new Date();
  return { cre53_id: `${MES_LABEL[now.getMonth() + 1]} ${now.getFullYear()}`, cre53_fdt_anio: now.getFullYear(), cre53_fdt_mes: now.getMonth() + 1, cre53_fdt_fecha_inicio: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, cre53_fdt_fecha_corte: '', cre53_fdt_cerrado: false };
};

export function PeriodosPage() {
  const { data: periodos = [], isLoading } = usePeriodos();
  const { create, update } = usePeriodoMutations();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PeriodoForm>(defaultPeriodo());

  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() { await create.mutateAsync(form); setModalOpen(false); }
  async function toggleCierre(p: Periodo) { await update.mutateAsync({ id: p.cre53_periodoid, d: { cre53_fdt_cerrado: !p.cre53_fdt_cerrado } }); }

  return (
    <div>
      <PageHeader title="Períodos" subtitle="Gestión de períodos de inventario"
        action={<button className="btn-primary" onClick={() => { setForm(defaultPeriodo()); setModalOpen(true); }}><Plus size={16} />Nuevo Período</button>} />
      {isLoading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          <DataTable data={periodos} rowKey={r => r.cre53_periodoid} columns={[
            { key: 'cre53_id', header: 'Período', render: r => <span className="font-medium">{r.cre53_id}</span> },
            { key: 'cre53_fdt_anio', header: 'Año', align: 'center' },
            { key: 'cre53_fdt_mes', header: 'Mes', render: r => MES_LABEL[r.cre53_fdt_mes] },
            { key: 'cre53_fdt_fecha_inicio', header: 'Inicio', render: r => fmtFecha(r.cre53_fdt_fecha_inicio) },
            { key: 'cre53_fdt_fecha_corte', header: 'Corte', render: r => r.cre53_fdt_fecha_corte ? fmtFecha(r.cre53_fdt_fecha_corte) : '—' },
            { key: 'cre53_fdt_cerrado', header: 'Estado', render: r => <Badge label={r.cre53_fdt_cerrado ? 'Cerrado' : 'Abierto'} variant={r.cre53_fdt_cerrado ? 'gray' : 'success'} /> },
            { key: 'actions', header: '', align: 'right', width: '80px', render: r => (
              <button onClick={() => toggleCierre(r)} title={r.cre53_fdt_cerrado ? 'Reabrir' : 'Cerrar período'}
                className={`p-1.5 rounded transition-colors ${r.cre53_fdt_cerrado ? 'text-gray-400 hover:text-success hover:bg-green-50' : 'text-gray-400 hover:text-warning hover:bg-yellow-50'}`}>
                {r.cre53_fdt_cerrado ? <Unlock size={14} /> : <Lock size={14} />}
              </button>
            )},
          ]} />
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo Período" size="sm">
        <div className="space-y-4">
          <div><label className="form-label">Nombre *</label><input className="form-input" value={form.cre53_id} onChange={e => f('cre53_id', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Año</label><input type="number" className="form-input" value={form.cre53_fdt_anio} onChange={e => f('cre53_fdt_anio', parseInt(e.target.value))} /></div>
            <div><label className="form-label">Mes</label>
              <select className="form-select" value={form.cre53_fdt_mes} onChange={e => f('cre53_fdt_mes', parseInt(e.target.value))}>
                {Object.entries(MES_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Fecha Inicio</label><input type="date" className="form-input" value={form.cre53_fdt_fecha_inicio} onChange={e => f('cre53_fdt_fecha_inicio', e.target.value)} /></div>
            <div><label className="form-label">Fecha Corte</label><input type="date" className="form-input" value={form.cre53_fdt_fecha_corte} onChange={e => f('cre53_fdt_fecha_corte', e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={create.isPending || !form.cre53_id}>{create.isPending ? 'Guardando...' : 'Crear'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
