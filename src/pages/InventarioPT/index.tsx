import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';
import { Modal } from '../../components/shared/Modal';
import { PageHeader, Badge, KPICard, Spinner, ConfirmDialog } from '../../components/shared';
import { useInventarioPT, useInvPTMutations, useSKUs, useBodegas, usePeriodoActivo, useVentas, useProduccion } from '../../hooks';
import { fmtPeso, fmtNum, diferencia } from '../../utils';
import type { InventarioPT, InvPTForm } from '../../types';
import { TIPO_EMPAQUE_LABEL, LINEA_LABEL } from '../../types';

export default function InventarioPTPage() {
  const { data: periodo } = usePeriodoActivo();
  const periodoId = periodo?.cre53_periodoid ?? null;

  const { data: invPT = [], isLoading } = useInventarioPT(periodoId);
  const { data: skus = [] } = useSKUs();
  const { data: bodegas = [] } = useBodegas();
  const { data: ventas = [] } = useVentas(periodoId);
  const { data: produccion = [] } = useProduccion(periodoId);
  const { create, update, remove } = useInvPTMutations(periodoId);

  const [bodegaFilter, setBodegaFilter] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventarioPT | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventarioPT | null>(null);
  const [form, setForm] = useState<Partial<InvPTForm>>({});

  const skuMap = useMemo(() => Object.fromEntries(skus.map(s => [s.cre53_skuid, s])), [skus]);
  const bodegaMap = useMemo(() => Object.fromEntries(bodegas.map(b => [b.cre53_bodegaid, b])), [bodegas]);

  const filtered = useMemo(() => bodegaFilter ? invPT.filter(i => i._cre53_bodega_value === bodegaFilter) : invPT, [invPT, bodegaFilter]);

  // Cobertura por bodega
  const bodegasConCaptura = useMemo(() => new Set(invPT.map(i => i._cre53_bodega_value)).size, [invPT]);
  const totalValor = useMemo(() => invPT.reduce((s, i) => s + (i.cre53_fdt_valor ?? 0), 0), [invPT]);

  // Inventario teórico PT por SKU
  const teoricoMap = useMemo(() => {
    const prodMap: Record<string, number> = {};
    produccion.forEach(p => { prodMap[p._cre53_sku_value] = (prodMap[p._cre53_sku_value] ?? 0) + p.cre53_fdt_cantidad_botellas; });
    const ventasMap: Record<string, number> = {};
    ventas.forEach(v => { ventasMap[v._cre53_sku_value] = (ventasMap[v._cre53_sku_value] ?? 0) + v.cre53_fdt_cantidad; });
    const result: Record<string, number> = {};
    skus.forEach(s => { result[s.cre53_skuid] = (prodMap[s.cre53_skuid] ?? 0) - (ventasMap[s.cre53_skuid] ?? 0); });
    return result;
  }, [produccion, ventas, skus]);

  function openCreate() {
    setEditing(null);
    setForm({ _cre53_periodo_value: periodoId ?? '', _cre53_bodega_value: bodegaFilter || '', _cre53_sku_value: '', cre53_fdt_cantidad: 0, cre53_fdt_fecha_conteo: new Date().toISOString().split('T')[0] });
    setModalOpen(true);
  }
  function openEdit(inv: InventarioPT) {
    setEditing(inv);
    setForm({ _cre53_bodega_value: inv._cre53_bodega_value, cre53_sku: inv._cre53_sku_value, cre53_fdt_cantidad: inv.cre53_fdt_cantidad, cre53_fdt_costo_unitario: inv.cre53_fdt_costo_unitario, cre53_fdt_fecha_conteo: inv.cre53_fdt_fecha_conteo, cre53_fdt_capturado_por: inv.cre53_fdt_capturado_por });
    setModalOpen(true);
  }

  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  async function handleSave() {
    const payload = { ...form, cre53_fdt_valor: (form.cre53_fdt_cantidad ?? 0) * (form.cre53_fdt_costo_unitario ?? 0) };
    if (editing) await update.mutateAsync({ id: editing.cre53_inventarioptid, d: payload as Partial<InvPTForm> });
    else await create.mutateAsync(payload as InvPTForm);
    setModalOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Inventario — Producto Terminado"
        subtitle={periodo ? `Período: ${periodo.cre53_fdt_nombre} · ${bodegasConCaptura} de ${bodegas.length} bodegas capturadas` : 'Sin período activo'}
        action={<button className="btn-primary" onClick={openCreate} disabled={!periodoId}><Plus size={16} />Capturar</button>}
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KPICard title="Valor Total PT" value={totalValor} format="currency" color="blue" />
        <KPICard title="Bodegas Capturadas" value={`${bodegasConCaptura}/${bodegas.length}`} format="text" color="green" />
        <KPICard title="Registros" value={invPT.length} format="number" color="yellow" />
      </div>

      {/* Filtro bodega */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <button onClick={() => setBodegaFilter('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!bodegaFilter ? 'bg-primary text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
          Todas
        </button>
        {bodegas.map(b => (
          <button key={b.cre53_bodegaid} onClick={() => setBodegaFilter(b.cre53_bodegaid)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${bodegaFilter === b.cre53_bodegaid ? 'bg-primary text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            <Building2 size={13} />
            {b.cre53_fdt_nombre}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          <DataTable
            data={filtered}
            rowKey={r => r.cre53_inventarioptid}
            columns={[
              { key: 'cre53_bodega', header: 'Bodega', render: r => bodegaMap[r._cre53_bodega_value ?? '']?.cre53_fdt_nombre ?? '—' },
              {
                key: 'cre53_sku', header: 'SKU', render: r => {
                  const sku = skuMap[r._cre53_sku_value ?? ''];
                  return sku ? (
                    <div>
                      <p className="text-sm font-medium">{sku.cre53_fdt_presentacion}</p>
                      <p className="text-xs text-gray-400 font-mono">{sku.cre53_fdt_codigo}</p>
                    </div>
                  ) : r._cre53_sku_value;
                }
              },
              { key: 'cre53_sku', header: 'Línea', render: r => { const s = skuMap[r._cre53_sku_value ?? '']; return s ? <Badge label={LINEA_LABEL[s.cre53_fdt_linea]} variant={s.cre53_fdt_linea === 1 ? 'info' : 'warning'} /> : null; } },
              { key: 'cre53_fdt_cantidad', header: 'Físico (Bot.)', align: 'right', render: r => <span className="font-semibold">{fmtNum(r.cre53_fdt_cantidad, 0)}</span> },
              {
                key: 'cre53_sku', header: 'Teórico', align: 'right',
                render: r => {
                  const t = teoricoMap[r._cre53_sku_value];
                  return t != null ? <span className="text-gray-500">{fmtNum(t, 0)}</span> : '—';
                }
              },
              {
                key: 'cre53_fdt_cantidad', header: 'Diferencia', align: 'right',
                render: r => {
                  const t = teoricoMap[r._cre53_sku_value];
                  if (t == null) return '—';
                  const d = diferencia(r.cre53_fdt_cantidad, t);
                  return <span className={d < 0 ? 'text-danger font-semibold' : d > 0 ? 'text-warning' : 'text-success'}>{d > 0 ? '+' : ''}{fmtNum(d, 0)}</span>;
                }
              },
              { key: 'cre53_fdt_costo_unitario', header: 'Costo Unit.', align: 'right', render: r => r.cre53_fdt_costo_unitario ? fmtPeso(r.cre53_fdt_costo_unitario) : '—' },
              { key: 'cre53_fdt_valor', header: 'Valor', align: 'right', render: r => r.cre53_fdt_valor ? <span className="font-semibold">{fmtPeso(r.cre53_fdt_valor)}</span> : '—' },
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Conteo PT' : 'Capturar Inventario PT'} size="md">
        <div className="space-y-4">
          <div>
            <label className="form-label">Bodega *</label>
            <select className="form-select" value={form.cre53_bodega} onChange={e => f('_cre53_bodega_value', e.target.value)}>
              <option value="">Seleccionar...</option>
              {bodegas.map(b => <option key={b.cre53_bodegaid} value={b.cre53_bodegaid}>{b.cre53_fdt_nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">SKU *</label>
            <select className="form-select" value={form.cre53_sku} onChange={e => f('_cre53_sku_value', e.target.value)}>
              <option value="">Seleccionar...</option>
              {skus.map(s => <option key={s.cre53_skuid} value={s.cre53_skuid}>{s.cre53_fdt_codigo} — {s.cre53_fdt_presentacion} ({TIPO_EMPAQUE_LABEL[s.cre53_fdt_tipo_empaque]})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Cantidad (botellas) *</label>
              <input type="number" step="1" min="0" className="form-input" value={form.cre53_fdt_cantidad ?? 0} onChange={e => f('cre53_fdt_cantidad', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="form-label">Costo Unitario (ref.)</label>
              <input type="number" step="0.0001" className="form-input" value={form.cre53_fdt_costo_unitario ?? ''} onChange={e => f('cre53_fdt_costo_unitario', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Fecha de Conteo *</label>
              <input type="date" className="form-input" value={form.cre53_fdt_fecha_conteo?.split('T')[0] ?? ''} onChange={e => f('cre53_fdt_fecha_conteo', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Capturado por</label>
              <input className="form-input" value={form.cre53_fdt_capturado_por ?? ''} onChange={e => f('cre53_fdt_capturado_por', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={create.isPending || update.isPending || !form.cre53_bodega || !form.cre53_sku}>
              {create.isPending || update.isPending ? 'Guardando...' : editing ? 'Guardar' : 'Registrar'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        message="¿Eliminar este registro de inventario?"
        onConfirm={() => { remove.mutateAsync(deleteTarget!.cre53_inventarioptid); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
        loading={remove.isPending}
      />
    </div>
  );
}
