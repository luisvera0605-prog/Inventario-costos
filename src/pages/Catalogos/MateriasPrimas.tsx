import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';
import { Modal } from '../../components/shared/Modal';
import { PageHeader, Badge, SearchInput, ConfirmDialog, Spinner, ErrorAlert } from '../../components/shared';
import { useMP, useMPMutations } from '../../hooks';
import { fmtPeso, fmtNum, toAlmacen, precioAlmacen } from '../../utils';
import type { MateriaPrima, MPForm } from '../../types';
import { GRUPO_MP_LABEL } from '../../types';

const GRUPOS = [1, 2, 3] as const;
const BADGE_GRUPO: Record<number, 'info' | 'warning' | 'gray'> = { 1: 'info', 2: 'warning', 3: 'gray' };

const defaultForm = (): MPForm => ({
  fdt_codigo: '', fdt_descripcion: '', fdt_alias: '', fdt_grupo: 1,
  fdt_unidad_compra: 'KGS', fdt_factor_conversion: 1,
  fdt_unidad_almacen: 'KGS', fdt_unidad_venta: '',
  fdt_precio_base: 0, fdt_activo: true,
});

export default function MateriasPrimasPage() {
  const { data: mps = [], isLoading, error } = useMP();
  const { create, update, remove } = useMPMutations();

  const [search, setSearch] = useState('');
  const [grupoFilter, setGrupoFilter] = useState<number | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MateriaPrima | null>(null);
  const [form, setForm] = useState<MPForm>(defaultForm());
  const [deleteTarget, setDeleteTarget] = useState<MateriaPrima | null>(null);

  const filtered = useMemo(() => mps.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.fdt_codigo.toLowerCase().includes(q) || m.fdt_descripcion.toLowerCase().includes(q) || (m.fdt_alias ?? '').toLowerCase().includes(q);
    const matchGrupo = grupoFilter === '' || m.fdt_grupo === grupoFilter;
    return matchSearch && matchGrupo;
  }), [mps, search, grupoFilter]);

  function openCreate() { setEditing(null); setForm(defaultForm()); setModalOpen(true); }
  function openEdit(mp: MateriaPrima) {
    setEditing(mp);
    setForm({ fdt_codigo: mp.fdt_codigo, fdt_descripcion: mp.fdt_descripcion, fdt_alias: mp.fdt_alias ?? '',
      fdt_grupo: mp.fdt_grupo, fdt_unidad_compra: mp.fdt_unidad_compra,
      fdt_factor_conversion: mp.fdt_factor_conversion, fdt_unidad_almacen: mp.fdt_unidad_almacen,
      fdt_unidad_venta: mp.fdt_unidad_venta ?? '', fdt_precio_base: mp.fdt_precio_base, fdt_activo: mp.fdt_activo });
    setModalOpen(true);
  }

  async function handleSave() {
    if (editing) await update.mutateAsync({ id: editing.fdt_mpid, d: form });
    else await create.mutateAsync(form);
    setModalOpen(false);
  }

  const saving = create.isPending || update.isPending;
  const f = (k: keyof MPForm, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div>
      <PageHeader
        title="Materias Primas"
        subtitle={`${mps.length} ingredientes y materiales registrados`}
        action={<button className="btn-primary" onClick={openCreate}><Plus size={16} />Nueva MP</button>}
      />

      {error && <ErrorAlert message="Error al cargar materias primas" />}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar código, descripción..." />
        <select className="form-select w-44 py-1.5" value={grupoFilter} onChange={e => setGrupoFilter(e.target.value === '' ? '' : Number(e.target.value))}>
          <option value="">Todos los grupos</option>
          {GRUPOS.map(g => <option key={g} value={g}>{GRUPO_MP_LABEL[g]}</option>)}
        </select>
      </div>

      {isLoading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          <DataTable
            data={filtered}
            rowKey={r => r.fdt_mpid}
            columns={[
              { key: 'fdt_codigo', header: 'Código', sortable: true, width: '90px' },
              { key: 'fdt_descripcion', header: 'Descripción', sortable: true },
              { key: 'fdt_alias', header: 'Alias', render: r => r.fdt_alias || '—' },
              { key: 'fdt_grupo', header: 'Grupo', render: r => <Badge label={GRUPO_MP_LABEL[r.fdt_grupo]} variant={BADGE_GRUPO[r.fdt_grupo]} /> },
              {
                key: 'fdt_unidad_almacen', header: 'Unidad / Factor',
                render: r => (
                  <div className="text-xs">
                    <span className="font-medium">{r.fdt_unidad_almacen}</span>
                    {r.fdt_factor_conversion !== 1 && (
                      <span className="text-gray-400 ml-1">({r.fdt_factor_conversion} {r.fdt_unidad_compra})</span>
                    )}
                  </div>
                )
              },
              {
                key: 'fdt_precio_base', header: 'Precio Base', align: 'right', sortable: true,
                render: r => (
                  <div className="text-right text-xs">
                    <div className="font-medium">{fmtPeso(r.fdt_precio_base)}/{r.fdt_unidad_compra}</div>
                    {r.fdt_factor_conversion !== 1 && (
                      <div className="text-gray-400">{fmtPeso(precioAlmacen(r.fdt_precio_base, r.fdt_factor_conversion))}/{r.fdt_unidad_almacen}</div>
                    )}
                  </div>
                )
              },
              {
                key: 'fdt_activo', header: 'Estado', align: 'center',
                render: r => <Badge label={r.fdt_activo ? 'Activo' : 'Inactivo'} variant={r.fdt_activo ? 'success' : 'gray'} />
              },
              {
                key: 'actions', header: '', align: 'right', width: '80px',
                render: r => (
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-gray-400 hover:text-danger hover:bg-red-50 rounded transition-colors"><Trash2 size={14} /></button>
                  </div>
                )
              },
            ]}
          />
        </div>
      )}

      {/* Totales */}
      <div className="mt-3 text-xs text-gray-400 text-right">
        Mostrando {filtered.length} de {mps.length} registros
      </div>

      {/* Modal Form */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Materia Prima' : 'Nueva Materia Prima'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Código *</label>
              <input className="form-input" value={form.fdt_codigo} onChange={e => f('fdt_codigo', e.target.value)} placeholder="1.0001" />
            </div>
            <div>
              <label className="form-label">Alias / Nombre corto</label>
              <input className="form-input" value={form.fdt_alias} onChange={e => f('fdt_alias', e.target.value)} placeholder="AZUCAR" />
            </div>
          </div>

          <div>
            <label className="form-label">Descripción completa *</label>
            <input className="form-input" value={form.fdt_descripcion} onChange={e => f('fdt_descripcion', e.target.value)} placeholder="AZUCAR ESTANDAR 25 KILOS" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Grupo *</label>
              <select className="form-select" value={form.fdt_grupo} onChange={e => f('fdt_grupo', Number(e.target.value))}>
                {GRUPOS.map(g => <option key={g} value={g}>{GRUPO_MP_LABEL[g]}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Unidad de Compra (base) *</label>
              <input className="form-input" value={form.fdt_unidad_compra} onChange={e => f('fdt_unidad_compra', e.target.value)} placeholder="KGS, LTS, PZAS..." />
            </div>
          </div>

          {/* Factor de conversión — el fix del problema H/J */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <p className="text-xs font-semibold text-primary mb-3 uppercase tracking-wide">Unidad de Almacenamiento</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="form-label">Unidad Almacén *</label>
                <input className="form-input" value={form.fdt_unidad_almacen} onChange={e => f('fdt_unidad_almacen', e.target.value)} placeholder="BULTO, ROLLO..." />
              </div>
              <div>
                <label className="form-label">Factor de Conversión *</label>
                <input type="number" step="0.001" min="0.001" className="form-input" value={form.fdt_factor_conversion}
                  onChange={e => f('fdt_factor_conversion', parseFloat(e.target.value) || 1)} />
                <p className="text-xs text-gray-400 mt-0.5">1 {form.fdt_unidad_almacen} = {form.fdt_factor_conversion} {form.fdt_unidad_compra}</p>
              </div>
              <div>
                <label className="form-label">Unidad Venta</label>
                <input className="form-input" value={form.fdt_unidad_venta} onChange={e => f('fdt_unidad_venta', e.target.value)} placeholder="BOLSAS..." />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Precio Base (por {form.fdt_unidad_compra}) *</label>
              <input type="number" step="0.01" min="0" className="form-input" value={form.fdt_precio_base}
                onChange={e => f('fdt_precio_base', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="form-label">Precio por {form.fdt_unidad_almacen}</label>
              <input className="form-input bg-gray-50" readOnly
                value={fmtPeso(precioAlmacen(form.fdt_precio_base, form.fdt_factor_conversion))} />
              <p className="text-xs text-gray-400 mt-0.5">Calculado automáticamente</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => f('fdt_activo', !form.fdt_activo)}
              className={`flex items-center gap-2 text-sm ${form.fdt_activo ? 'text-success' : 'text-gray-400'}`}>
              {form.fdt_activo ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
              {form.fdt_activo ? 'Activo' : 'Inactivo'}
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !form.fdt_codigo || !form.fdt_descripcion}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear MP'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        message={`¿Eliminar "${deleteTarget?.fdt_descripcion}"? Esta acción no se puede deshacer.`}
        onConfirm={() => { remove.mutateAsync(deleteTarget!.fdt_mpid); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
        loading={remove.isPending}
      />
    </div>
  );
}
