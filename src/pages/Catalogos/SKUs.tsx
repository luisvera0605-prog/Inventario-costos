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
  fdt_codigo: '', fdt_presentacion: '', fdt_linea: 1, fdt_mililitros: 700,
  fdt_tipo_empaque: 1, fdt_codigo_barras: '', fdt_costo_estandar: 0, fdt_activo: true,
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
    const matchSearch = !q || s.fdt_codigo.toLowerCase().includes(q) || s.fdt_presentacion.toLowerCase().includes(q);
    return matchSearch && (lineaFilter === '' || s.fdt_linea === lineaFilter);
  }), [skus, search, lineaFilter]);

  function openEdit(s: SKU) {
    setEditing(s);
    setForm({ fdt_codigo: s.fdt_codigo, fdt_presentacion: s.fdt_presentacion, fdt_linea: s.fdt_linea,
      fdt_mililitros: s.fdt_mililitros, fdt_tipo_empaque: s.fdt_tipo_empaque,
      fdt_codigo_barras: s.fdt_codigo_barras ?? '', fdt_costo_estandar: s.fdt_costo_estandar ?? 0, fdt_activo: s.fdt_activo });
    setModalOpen(true);
  }

  const f = (k: keyof SKUForm, v: any) => setForm(p => ({ ...p, [k]: v }));
  const saving = create.isPending || update.isPending;

  async function handleSave() {
    if (editing) await update.mutateAsync({ id: editing.fdt_skuid, d: form });
    else await create.mutateAsync(form);
    setModalOpen(false);
  }

  // Group by mililitros for display
  const byML = useMemo(() => {
    const groups: Record<number, SKU[]> = {};
    filtered.forEach(s => { if (!groups[s.fdt_mililitros]) groups[s.fdt_mililitros] = []; groups[s.fdt_mililitros].push(s); });
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
            rowKey={r => r.fdt_skuid}
            columns={[
              { key: 'fdt_codigo', header: 'Código SKU', sortable: true, width: '120px' },
              { key: 'fdt_presentacion', header: 'Presentación', sortable: true },
              { key: 'fdt_linea', header: 'Línea', render: r => <Badge label={LINEA_LABEL[r.fdt_linea]} variant={r.fdt_linea === 1 ? 'info' : 'warning'} /> },
              { key: 'fdt_mililitros', header: 'ml', align: 'right', sortable: true, render: r => `${r.fdt_mililitros} ml` },
              { key: 'fdt_tipo_empaque', header: 'Empaque', render: r => <Badge label={TIPO_EMPAQUE_LABEL[r.fdt_tipo_empaque]} variant="gray" /> },
              { key: 'fdt_codigo_barras', header: 'Cód. Barras', render: r => <span className="font-mono text-xs">{r.fdt_codigo_barras || '—'}</span> },
              { key: 'fdt_costo_estandar', header: 'Costo Est.', align: 'right', render: r => r.fdt_costo_estandar ? `$${r.fdt_costo_estandar.toFixed(4)}` : '—' },
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
              <input className="form-input font-mono" value={form.fdt_codigo} onChange={e => f('fdt_codigo', e.target.value)} placeholder="F03010101" />
            </div>
            <div>
              <label className="form-label">Línea *</label>
              <select className="form-select" value={form.fdt_linea} onChange={e => f('fdt_linea', Number(e.target.value))}>
                {LINEAS.map(l => <option key={l} value={l}>{LINEA_LABEL[l]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Presentación *</label>
            <input className="form-input" value={form.fdt_presentacion} onChange={e => f('fdt_presentacion', e.target.value)} placeholder="Flor 700 ml" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Mililitros *</label>
              <select className="form-select" value={form.fdt_mililitros} onChange={e => f('fdt_mililitros', Number(e.target.value))}>
                {ML_OPTIONS.map(ml => <option key={ml} value={ml}>{ml} ml</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Tipo Empaque *</label>
              <select className="form-select" value={form.fdt_tipo_empaque} onChange={e => f('fdt_tipo_empaque', Number(e.target.value))}>
                {EMPAQUES.map(e => <option key={e} value={e}>{TIPO_EMPAQUE_LABEL[e]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Código de Barras</label>
              <input className="form-input font-mono" value={form.fdt_codigo_barras} onChange={e => f('fdt_codigo_barras', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Costo Estándar (ref.)</label>
              <input type="number" step="0.0001" className="form-input" value={form.fdt_costo_estandar} onChange={e => f('fdt_costo_estandar', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !form.fdt_codigo}>
              {saving ? 'Guardando...' : editing ? 'Guardar' : 'Crear SKU'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        message={`¿Eliminar SKU "${deleteTarget?.fdt_codigo}"?`}
        onConfirm={() => { remove.mutateAsync(deleteTarget!.fdt_skuid); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
        loading={remove.isPending}
      />
    </div>
  );
}
