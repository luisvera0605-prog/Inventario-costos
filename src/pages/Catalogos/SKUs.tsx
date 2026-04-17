import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';
import { Modal } from '../../components/shared/Modal';
import { PageHeader, Badge, SearchInput, ConfirmDialog, Spinner } from '../../components/shared';
import { useSKUs, useSKUMutations } from '../../hooks';
import type { SKU, SKUForm } from '../../types';
import { LINEA_LABEL, TIPO_EMPAQUE_LABEL } from '../../types';

const LINEAS = [1, 2] as const;
const EMPAQUES = [1, 2, 3, 4] as const;
const ML_OPTIONS = [250, 500, 700, 1000, 2000, 3785];

const defaultForm = (): SKUForm => ({
  cre53_codigo: '', cre53_presentacion: '', cre53_linea: 1, cre53_mililitros: 700,
  cre53_tipo_empaque: 1, cre53_codigo_barras: '', cre53_costo_estandar: 0, cre53_activo: true,
});

export default function SKUsPage() {
  const { data: skus = [], isLoading } = useSKUs();
  const { create, update, remove } = useSKUMutations();

  const [search, setSearch] = useState('');
  const [lineaFilter, setLineaFilter] = useState<number | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SKU | null>(null);
  const [form, setForm] = useState<SKUForm>(defaultForm());
  const [deleteTarget, setDeleteTarget] = useState<SKU | null>(null);

  const filtered = useMemo(() => skus.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.cre53_codigo.toLowerCase().includes(q) || s.cre53_presentacion.toLowerCase().includes(q);
    return matchSearch && (lineaFilter === '' || s.cre53_linea === lineaFilter);
  }), [skus, search, lineaFilter]);

  function openEdit(s: SKU) {
    setEditing(s);
    setForm({ cre53_codigo: s.cre53_codigo, cre53_presentacion: s.cre53_presentacion, cre53_linea: s.cre53_linea,
      cre53_mililitros: s.cre53_mililitros, cre53_tipo_empaque: s.cre53_tipo_empaque,
      cre53_codigo_barras: s.cre53_codigo_barras ?? '', cre53_costo_estandar: s.cre53_costo_estandar ?? 0, cre53_activo: s.cre53_activo });
    setModalOpen(true);
  }

  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const saving = create.isPending || update.isPending;

  async function handleSave() {
    if (editing) await update.mutateAsync({ id: editing.cre53_skuid, d: form });
    else await create.mutateAsync(form);
    setModalOpen(false);
  }

  // Group by mililitros for display
  const byML = useMemo(() => {
    const groups: Record<number, SKU[]> = {};
    filtered.forEach(s => { if (!groups[s.cre53_mililitros]) groups[s.cre53_mililitros] = []; groups[s.cre53_mililitros].push(s); });
    return groups;
  }, [filtered]);

  return (
    <div>
      <PageHeader
        title="SKUs — Productos Terminados"
        subtitle={`${skus.length} SKUs activos`}
        action={<button className="btn-primary" onClick={() => { setEditing(null); setForm(defaultForm()); setModalOpen(true); }}><Plus size={16} />Nuevo SKU</button>}
      />

      <div className="flex gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Código o presentación..." />
        <select className="form-select w-44 py-1.5" value={lineaFilter} onChange={e => setLineaFilter(e.target.value === '' ? '' : Number(e.target.value))}>
          <option value="">Todas las líneas</option>
          {LINEAS.map(l => <option key={l} value={l}>{LINEA_LABEL[l]}</option>)}
        </select>
      </div>

      {isLoading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          <DataTable
            data={filtered}
            rowKey={r => r.cre53_skuid}
            columns={[
              { key: 'cre53_codigo', header: 'Código SKU', sortable: true, width: '120px' },
              { key: 'cre53_presentacion', header: 'Presentación', sortable: true },
              { key: 'cre53_linea', header: 'Línea', render: r => <Badge label={LINEA_LABEL[r.cre53_linea]} variant={r.cre53_linea === 1 ? 'info' : 'warning'} /> },
              { key: 'cre53_mililitros', header: 'ml', align: 'right', sortable: true, render: r => `${r.cre53_mililitros} ml` },
              { key: 'cre53_tipo_empaque', header: 'Empaque', render: r => <Badge label={TIPO_EMPAQUE_LABEL[r.cre53_tipo_empaque]} variant="gray" /> },
              { key: 'cre53_codigo_barras', header: 'Cód. Barras', render: r => <span className="font-mono text-xs">{r.cre53_codigo_barras || '—'}</span> },
              { key: 'cre53_costo_estandar', header: 'Costo Est.', align: 'right', render: r => r.cre53_costo_estandar ? `$${r.cre53_costo_estandar.toFixed(4)}` : '—' },
              {
                key: 'actions', header: '', align: 'right', width: '80px',
                render: r => (
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded"><Pencil size={14} /></button>
                    <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-gray-400 hover:text-danger hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                  </div>
                )
              },
            ]}
          />
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar SKU' : 'Nuevo SKU'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Código SKU *</label>
              <input className="form-input font-mono" value={form.cre53_codigo} onChange={e => f('cre53_codigo', e.target.value)} placeholder="F03010101" />
            </div>
            <div>
              <label className="form-label">Línea *</label>
              <select className="form-select" value={form.cre53_linea} onChange={e => f('cre53_linea', Number(e.target.value))}>
                {LINEAS.map(l => <option key={l} value={l}>{LINEA_LABEL[l]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Presentación *</label>
            <input className="form-input" value={form.cre53_presentacion} onChange={e => f('cre53_presentacion', e.target.value)} placeholder="Flor 700 ml" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Mililitros *</label>
              <select className="form-select" value={form.cre53_mililitros} onChange={e => f('cre53_mililitros', Number(e.target.value))}>
                {ML_OPTIONS.map(ml => <option key={ml} value={ml}>{ml} ml</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Tipo Empaque *</label>
              <select className="form-select" value={form.cre53_tipo_empaque} onChange={e => f('cre53_tipo_empaque', Number(e.target.value))}>
                {EMPAQUES.map(e => <option key={e} value={e}>{TIPO_EMPAQUE_LABEL[e]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Código de Barras</label>
              <input className="form-input font-mono" value={form.cre53_codigo_barras} onChange={e => f('cre53_codigo_barras', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Costo Estándar (ref.)</label>
              <input type="number" step="0.0001" className="form-input" value={form.cre53_costo_estandar} onChange={e => f('cre53_costo_estandar', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !form.cre53_codigo}>
              {saving ? 'Guardando...' : editing ? 'Guardar' : 'Crear SKU'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        message={`¿Eliminar SKU "${deleteTarget?.cre53_codigo}"?`}
        onConfirm={() => { remove.mutateAsync(deleteTarget!.cre53_skuid); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
        loading={remove.isPending}
      />
    </div>
  );
}
