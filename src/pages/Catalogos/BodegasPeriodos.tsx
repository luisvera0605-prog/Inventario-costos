// ─── BODEGAS ─────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';
import { Modal } from '../../components/shared/Modal';
import { PageHeader, Badge, ConfirmDialog, Spinner } from '../../components/shared';
import { useBodegas, useBodegaMutations } from '../../hooks';
import type { Bodega, BodegaForm } from '../../types';
import { TIPO_BODEGA_LABEL } from '../../types';

const defaultBodega = (): BodegaForm => ({ fdt_nombre: '', fdt_tipo: 2, fdt_ubicacion: '', fdt_activo: true });

export function BodegasPage() {
  const { data: bodegas = [], isLoading } = useBodegas();
  const { create, update, remove } = useBodegaMutations();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Bodega | null>(null);
  const [form, setForm] = useState<BodegaForm>(defaultBodega());
  const [deleteTarget, setDeleteTarget] = useState<Bodega | null>(null);

  function openEdit(b: Bodega) { setEditing(b); setForm({ fdt_nombre: b.fdt_nombre, fdt_tipo: b.fdt_tipo, fdt_ubicacion: b.fdt_ubicacion ?? '', fdt_activo: b.fdt_activo }); setModalOpen(true); }
  const f = (k: keyof BodegaForm, v: any) => setForm(p => ({ ...p, [k]: v }));
  const saving = create.isPending || update.isPending;

  async function handleSave() {
    if (editing) await update.mutateAsync({ id: editing.fdt_bodegaid, d: form });
    else await create.mutateAsync(form);
    setModalOpen(false);
  }

  return (
    <div>
      <PageHeader title="Bodegas" subtitle={`${bodegas.length} bodegas registradas`}
        action={<button className="btn-primary" onClick={() => { setEditing(null); setForm(defaultBodega()); setModalOpen(true); }}><Plus size={16} />Nueva Bodega</button>} />
      {isLoading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          <DataTable data={bodegas} rowKey={r => r.fdt_bodegaid} columns={[
            { key: 'fdt_nombre', header: 'Nombre', sortable: true },
            { key: 'fdt_tipo', header: 'Tipo', render: r => <Badge label={TIPO_BODEGA_LABEL[r.fdt_tipo]} variant={r.fdt_tipo === 1 ? 'info' : 'gray'} /> },
            { key: 'fdt_ubicacion', header: 'Ubicación', render: r => r.fdt_ubicacion || '—' },
            { key: 'fdt_activo', header: 'Estado', render: r => <Badge label={r.fdt_activo ? 'Activa' : 'Inactiva'} variant={r.fdt_activo ? 'success' : 'gray'} /> },
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
          <div><label className="form-label">Nombre *</label><input className="form-input" value={form.fdt_nombre} onChange={e => f('fdt_nombre', e.target.value)} /></div>
          <div><label className="form-label">Tipo *</label>
            <select className="form-select" value={form.fdt_tipo} onChange={e => f('fdt_tipo', Number(e.target.value))}>
              <option value={1}>MP + PT (Teapa)</option><option value={2}>Solo PT</option>
            </select>
          </div>
          <div><label className="form-label">Ubicación</label><input className="form-input" value={form.fdt_ubicacion ?? ''} onChange={e => f('fdt_ubicacion', e.target.value)} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !form.fdt_nombre}>{saving ? 'Guardando...' : editing ? 'Guardar' : 'Crear'}</button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} message={`¿Eliminar bodega "${deleteTarget?.fdt_nombre}"?`}
        onConfirm={() => { remove.mutateAsync(deleteTarget!.fdt_bodegaid); setDeleteTarget(null); }}
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
  return { fdt_nombre: `${MES_LABEL[now.getMonth() + 1]} ${now.getFullYear()}`, fdt_anio: now.getFullYear(), fdt_mes: now.getMonth() + 1, fdt_fecha_inicio: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, fdt_fecha_corte: '', fdt_cerrado: false };
};

export function PeriodosPage() {
  const { data: periodos = [], isLoading } = usePeriodos();
  const { create, update } = usePeriodoMutations();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PeriodoForm>(defaultPeriodo());

  const f = (k: keyof PeriodoForm, v: any) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() { await create.mutateAsync(form); setModalOpen(false); }
  async function toggleCierre(p: Periodo) { await update.mutateAsync({ id: p.fdt_periodoid, d: { fdt_cerrado: !p.fdt_cerrado } }); }

  return (
    <div>
      <PageHeader title="Períodos" subtitle="Gestión de períodos de inventario"
        action={<button className="btn-primary" onClick={() => { setForm(defaultPeriodo()); setModalOpen(true); }}><Plus size={16} />Nuevo Período</button>} />
      {isLoading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          <DataTable data={periodos} rowKey={r => r.fdt_periodoid} columns={[
            { key: 'fdt_nombre', header: 'Período', render: r => <span className="font-medium">{r.fdt_nombre}</span> },
            { key: 'fdt_anio', header: 'Año', align: 'center' },
            { key: 'fdt_mes', header: 'Mes', render: r => MES_LABEL[r.fdt_mes] },
            { key: 'fdt_fecha_inicio', header: 'Inicio', render: r => fmtFecha(r.fdt_fecha_inicio) },
            { key: 'fdt_fecha_corte', header: 'Corte', render: r => r.fdt_fecha_corte ? fmtFecha(r.fdt_fecha_corte) : '—' },
            { key: 'fdt_cerrado', header: 'Estado', render: r => <Badge label={r.fdt_cerrado ? 'Cerrado' : 'Abierto'} variant={r.fdt_cerrado ? 'gray' : 'success'} /> },
            { key: 'actions', header: '', align: 'right', width: '80px', render: r => (
              <button onClick={() => toggleCierre(r)} title={r.fdt_cerrado ? 'Reabrir' : 'Cerrar período'}
                className={`p-1.5 rounded transition-colors ${r.fdt_cerrado ? 'text-gray-400 hover:text-success hover:bg-green-50' : 'text-gray-400 hover:text-warning hover:bg-yellow-50'}`}>
                {r.fdt_cerrado ? <Unlock size={14} /> : <Lock size={14} />}
              </button>
            )},
          ]} />
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo Período" size="sm">
        <div className="space-y-4">
          <div><label className="form-label">Nombre *</label><input className="form-input" value={form.fdt_nombre} onChange={e => f('fdt_nombre', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Año</label><input type="number" className="form-input" value={form.fdt_anio} onChange={e => f('fdt_anio', parseInt(e.target.value))} /></div>
            <div><label className="form-label">Mes</label>
              <select className="form-select" value={form.fdt_mes} onChange={e => f('fdt_mes', parseInt(e.target.value))}>
                {Object.entries(MES_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Fecha Inicio</label><input type="date" className="form-input" value={form.fdt_fecha_inicio} onChange={e => f('fdt_fecha_inicio', e.target.value)} /></div>
            <div><label className="form-label">Fecha Corte</label><input type="date" className="form-input" value={form.fdt_fecha_corte} onChange={e => f('fdt_fecha_corte', e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={create.isPending || !form.fdt_nombre}>{create.isPending ? 'Guardando...' : 'Crear'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
