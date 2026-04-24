import { useState } from 'react';
import { Plus, Trash2, ChevronRight, FlaskConical } from 'lucide-react';
import { Modal } from '../../components/shared/Modal';
import { PageHeader, Badge, Spinner, ConfirmDialog } from '../../components/shared';
import { useSKUs, useMP, useRecetasBySKU, useRecetaMutations } from '../../hooks';
import { fmtNum } from '../../utils';
import type { SKU, LineaReceta, RecetaForm } from '../../types';
import { TIPO_INSUMO_LABEL, LINEA_LABEL, TIPO_EMPAQUE_LABEL } from '../../types';

const TIPO_INSUMO = [1, 2, 3] as const;

export default function RecetasPage() {
  const { data: skus = [], isLoading: loadingSKUs } = useSKUs();
  const { data: mps = [] } = useMP();
  const [selectedSKU, setSelectedSKU] = useState<SKU | null>(null);
  const { data: recetas = [], isLoading: loadingRecetas } = useRecetasBySKU(selectedSKU?.cre53_skuid ?? null);
  const { create, remove } = useRecetaMutations();

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LineaReceta | null>(null);
  const [form, setForm] = useState<Partial<LineaReceta>>({
    _cre53_mp_value: '', cre53_fdt_tipo_insumo: 1, cre53_fdt_qty_por_litro: 0, cre53_fdt_qty_por_botella: 0, cre53_fdt_unidad: 'KGS', cre53_fdt_activo: true,
  });

  const mpMap = Object.fromEntries(mps.map(m => [m.cre53_materiaprimaid, m]));

  // Auto-calc qty_por_botella when qty_por_litro or SKU changes
  function setQtyLitro(v: number) {
    const botella = selectedSKU ? v * (selectedSKU.cre53_fdt_mililitros / 1000) : 0;
    setForm(p => ({ ...p, cre53_fdt_qty_por_litro: v, cre53_fdt_qty_por_botella: botella }));
  }

  async function handleAdd() {
    if (!selectedSKU) return;
    await create.mutateAsync({ ...form, _cre53_sku_value: selectedSKU.cre53_skuid } as RecetaForm);
    setModalOpen(false);
    setForm({ _cre53_mp_value: '', cre53_fdt_tipo_insumo: 1, cre53_fdt_qty_por_litro: 0, cre53_fdt_qty_por_botella: 0, cre53_fdt_unidad: 'KGS', cre53_fdt_activo: true });
  }

  // Group recetas by tipo_insumo
  const byTipo = [1, 2, 3].map(t => ({
    tipo: t,
    label: TIPO_INSUMO_LABEL[t],
    items: recetas.filter(r => r.cre53_fdt_tipo_insumo === t),
  }));

  return (
    <div className="flex gap-6 h-full">
      {/* SKU list */}
      <div className="w-72 shrink-0">
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <p className="text-sm font-semibold text-gray-700">Selecciona un SKU</p>
          </div>
          {loadingSKUs ? <Spinner /> : (
            <div className="divide-y max-h-[70vh] overflow-y-auto">
              {skus.map(sku => (
                <button key={sku.cre53_skuid} onClick={() => setSelectedSKU(sku)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-blue-50
                    ${selectedSKU?.cre53_skuid === sku.cre53_skuid ? 'bg-blue-50 border-l-2 border-primary' : ''}`}>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{sku.cre53_fdt_presentacion}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-gray-400 font-mono">{sku.cre53_fdt_codigo}</span>
                      <Badge label={TIPO_EMPAQUE_LABEL[sku.cre53_fdt_tipo_empaque]} variant="gray" />
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-gray-300" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Receta detail */}
      <div className="flex-1">
        {!selectedSKU ? (
          <div className="card flex flex-col items-center justify-center py-20 text-center">
            <FlaskConical size={40} className="text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">Selecciona un SKU para ver o editar su receta</p>
          </div>
        ) : (
          <div>
            <PageHeader
              title={selectedSKU.cre53_fdt_presentacion}
              subtitle={`${selectedSKU.cre53_fdt_mililitros} ml · ${LINEA_LABEL[selectedSKU.cre53_fdt_linea]} · ${TIPO_EMPAQUE_LABEL[selectedSKU.cre53_fdt_tipo_empaque]}`}
              action={
                <button className="btn-primary" onClick={() => setModalOpen(true)}>
                  <Plus size={16} />Agregar insumo
                </button>
              }
            />

            {loadingRecetas ? <Spinner /> : (
              <div className="space-y-4">
                {byTipo.map(({ tipo, label, items }) => items.length > 0 && (
                  <div key={tipo} className="card p-0 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 border-b flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">{label}</span>
                      <span className="text-xs text-gray-400">{items.length} insumos</span>
                    </div>
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-4 py-2 text-xs text-gray-500 text-left">Materia Prima</th>
                          <th className="px-4 py-2 text-xs text-gray-500 text-right">Qty/Litro</th>
                          <th className="px-4 py-2 text-xs text-gray-500 text-right">Qty/Botella</th>
                          <th className="px-4 py-2 text-xs text-gray-500 text-left">Unidad</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {items.map(r => {
                          const mp = mpMap[r._cre53_mp_value];
                          return (
                            <tr key={r.cre53_recetaid} className="hover:bg-gray-50">
                              <td className="px-4 py-2.5 text-sm text-gray-800">{(r as any).cre53_fdt_mp?.cre53_fdt_alias ?? mp?.cre53_fdt_alias ?? (r as any).cre53_fdt_mp?.cre53_fdt_codigo ?? mp?.cre53_fdt_codigo ?? r._cre53_mp_value}</td>
                              <td className="px-4 py-2.5 text-sm text-right font-mono">{fmtNum(r.cre53_fdt_qty_por_litro, 6)}</td>
                              <td className="px-4 py-2.5 text-sm text-right font-mono text-primary">{fmtNum(r.cre53_fdt_qty_por_botella, 6)}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">{r.cre53_fdt_unidad}</td>
                              <td className="px-2 py-2.5">
                                <button onClick={() => setDeleteTarget(r)} className="p-1 text-gray-300 hover:text-danger rounded">
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
                {recetas.length === 0 && (
                  <div className="card text-center py-10 text-gray-400 text-sm">Sin insumos en la receta — agrega el primero</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add insumo modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Agregar Insumo a Receta" size="md">
        <div className="space-y-4">
          <div>
            <label className="form-label">Tipo de Insumo *</label>
            <select className="form-select" value={form.cre53_fdt_tipo_insumo} onChange={e => setForm(p => ({ ...p, cre53_fdt_tipo_insumo: Number(e.target.value) as 1|2|3 }))}>
              {TIPO_INSUMO.map(t => <option key={t} value={t}>{TIPO_INSUMO_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Materia Prima *</label>
            <select className="form-select" value={form.cre53_mp} onChange={e => setForm(p => ({ ...p, cre53_mp: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {mps.filter(m => m.cre53_fdt_grupo === form.cre53_fdt_tipo_insumo).map(m => (
                <option key={m.cre53_materiaprimaid} value={m.cre53_materiaprimaid}>{m.cre53_fdt_descripcion}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Cantidad por Litro *</label>
              <input type="number" step="0.000001" min="0" className="form-input font-mono"
                value={form.cre53_fdt_qty_por_litro} onChange={e => setQtyLitro(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="form-label">Cantidad por Botella ({selectedSKU?.cre53_fdt_mililitros}ml)</label>
              <input type="number" step="0.000001" className="form-input font-mono bg-gray-50" readOnly value={(form.cre53_fdt_qty_por_botella ?? 0).toFixed(8)} />
              <p className="text-xs text-gray-400 mt-0.5">= qty/litro × {(selectedSKU?.cre53_fdt_mililitros ?? 0) / 1000}</p>
            </div>
          </div>
          <div>
            <label className="form-label">Unidad</label>
            <input className="form-input" value={form.cre53_fdt_unidad} onChange={e => setForm(p => ({ ...p, cre53_fdt_unidad: e.target.value }))} placeholder="KGS, LTS, PZA, MT..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleAdd} disabled={create.isPending || !form.cre53_mp}>
              {create.isPending ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        message={`¿Eliminar "${(deleteTarget as any)?.cre53_fdt_mp?.cre53_fdt_codigo ?? mpMap[deleteTarget?._cre53_mp_value ?? '']?.cre53_fdt_codigo ?? ''}" de la receta?`}
        onConfirm={() => { remove.mutateAsync(deleteTarget!.cre53_recetaid); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
        loading={remove.isPending}
      />
    </div>
  );
}
