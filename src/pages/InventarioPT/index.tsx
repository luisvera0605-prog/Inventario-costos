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
  const periodoId = periodo?.fdt_periodoid ?? null;

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

  const skuMap = useMemo(() => Object.fromEntries(skus.map(s => [s.fdt_skuid, s])), [skus]);
  const bodegaMap = useMemo(() => Object.fromEntries(bodegas.map(b => [b.fdt_bodegaid, b])), [bodegas]);

  const filtered = useMemo(() => bodegaFilter ? invPT.filter(i => i.fdt_bodega === bodegaFilter) : invPT, [invPT, bodegaFilter]);

  // Cobertura por bodega
  const bodegasConCaptura = useMemo(() => new Set(invPT.map(i => i.fdt_bodega)).size, [invPT]);
  const totalValor = useMemo(() => invPT.reduce((s, i) => s + (i.fdt_valor ?? 0), 0), [invPT]);

  // Inventario teórico PT por SKU
  const teoricoMap = useMemo(() => {
    const prodMap: Record<string, number> = {};
    produccion.forEach(p => { prodMap[p.fdt_sku] = (prodMap[p.fdt_sku] ?? 0) + p.fdt_cantidad_botellas; });
    const ventasMap: Record<string, number> = {};
    ventas.forEach(v => { ventasMap[v.fdt_sku] = (ventasMap[v.fdt_sku] ?? 0) + v.fdt_cantidad; });
    const result: Record<string, number> = {};
    skus.forEach(s => { result[s.fdt_skuid] = (prodMap[s.fdt_skuid] ?? 0) - (ventasMap[s.fdt_skuid] ?? 0); });
    return result;
  }, [produccion, ventas, skus]);

  function openCreate() {
    setEditing(null);
    setForm({ fdt_periodo: periodoId ?? '', fdt_bodega: bodegaFilter || '', fdt_sku: '', fdt_cantidad: 0, fdt_fecha_conteo: new Date().toISOString().split('T')[0] });
    setModalOpen(true);
  }
  function openEdit(inv: InventarioPT) {
    setEditing(inv);
    setForm({ fdt_bodega: inv.fdt_bodega, fdt_sku: inv.fdt_sku, fdt_cantidad: inv.fdt_cantidad, fdt_costo_unitario: inv.fdt_costo_unitario, fdt_fecha_conteo: inv.fdt_fecha_conteo, fdt_capturado_por: inv.fdt_capturado_por });
    setModalOpen(true);
  }

  const f = (k: keyof InvPTForm, v: any) => setForm(p => ({ ...p, [k]: v }));
  async function handleSave() {
    const payload = { ...form, fdt_valor: (form.fdt_cantidad ?? 0) * (form.fdt_costo_unitario ?? 0) };
    if (editing) await update.mutateAsync({ id: editing.fdt_inventario_ptid, d: payload as Partial<InvPTForm> });
    else await create.mutateAsync(payload as InvPTForm);
    setModalOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Inventario — Producto Terminado"
        subtitle={periodo ? `Período: ${periodo.fdt_nombre} · ${bodegasConCaptura} de ${bodegas.length} bodegas capturadas` : 'Sin período activo'}
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
          <button key={b.fdt_bodegaid} onClick={() => setBodegaFilter(b.fdt_bodegaid)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${bodegaFilter === b.fdt_bodegaid ? 'bg-primary text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            <Building2 size={13} />
            {b.fdt_nombre}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          <DataTable
            data={filtered}
            rowKey={r => r.fdt_inventario_ptid}
            columns={[
              { key: 'fdt_bodega', header: 'Bodega', render: r => bodegaMap[r.fdt_bodega]?.fdt_nombre ?? '—' },
              {
                key: 'fdt_sku', header: 'SKU', render: r => {
                  const sku = skuMap[r.fdt_sku];
                  return sku ? (
                    <div>
                      <p className="text-sm font-medium">{sku.fdt_presentacion}</p>
                      <p className="text-xs text-gray-400 font-mono">{sku.fdt_codigo}</p>
                    </div>
                  ) : r.fdt_sku;
                }
              },
              { key: 'fdt_sku', header: 'Línea', render: r => { const s = skuMap[r.fdt_sku]; return s ? <Badge label={LINEA_LABEL[s.fdt_linea]} variant={s.fdt_linea === 1 ? 'info' : 'warning'} /> : null; } },
              { key: 'fdt_cantidad', header: 'Físico (Bot.)', align: 'right', render: r => <span className="font-semibold">{fmtNum(r.fdt_cantidad, 0)}</span> },
              {
                key: 'fdt_sku', header: 'Teórico', align: 'right',
                render: r => {
                  const t = teoricoMap[r.fdt_sku];
                  return t != null ? <span className="text-gray-500">{fmtNum(t, 0)}</span> : '—';
                }
              },
              {
                key: 'fdt_cantidad', header: 'Diferencia', align: 'right',
                render: r => {
                  const t = teoricoMap[r.fdt_sku];
                  if (t == null) return '—';
                  const d = diferencia(r.fdt_cantidad, t);
                  return <span className={d < 0 ? 'text-danger font-semibold' : d > 0 ? 'text-warning' : 'text-success'}>{d > 0 ? '+' : ''}{fmtNum(d, 0)}</span>;
                }
              },
              { key: 'fdt_costo_unitario', header: 'Costo Unit.', align: 'right', render: r => r.fdt_costo_unitario ? fmtPeso(r.fdt_costo_unitario) : '—' },
              { key: 'fdt_valor', header: 'Valor', align: 'right', render: r => r.fdt_valor ? <span className="font-semibold">{fmtPeso(r.fdt_valor)}</span> : '—' },
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
            <select className="form-select" value={form.fdt_bodega} onChange={e => f('fdt_bodega', e.target.value)}>
              <option value="">Seleccionar...</option>
              {bodegas.map(b => <option key={b.fdt_bodegaid} value={b.fdt_bodegaid}>{b.fdt_nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">SKU *</label>
            <select className="form-select" value={form.fdt_sku} onChange={e => f('fdt_sku', e.target.value)}>
              <option value="">Seleccionar...</option>
              {skus.map(s => <option key={s.fdt_skuid} value={s.fdt_skuid}>{s.fdt_codigo} — {s.fdt_presentacion} ({TIPO_EMPAQUE_LABEL[s.fdt_tipo_empaque]})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Cantidad (botellas) *</label>
              <input type="number" step="1" min="0" className="form-input" value={form.fdt_cantidad ?? 0} onChange={e => f('fdt_cantidad', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="form-label">Costo Unitario (ref.)</label>
              <input type="number" step="0.0001" className="form-input" value={form.fdt_costo_unitario ?? ''} onChange={e => f('fdt_costo_unitario', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Fecha de Conteo *</label>
              <input type="date" className="form-input" value={form.fdt_fecha_conteo?.split('T')[0] ?? ''} onChange={e => f('fdt_fecha_conteo', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Capturado por</label>
              <input className="form-input" value={form.fdt_capturado_por ?? ''} onChange={e => f('fdt_capturado_por', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={create.isPending || update.isPending || !form.fdt_bodega || !form.fdt_sku}>
              {create.isPending || update.isPending ? 'Guardando...' : editing ? 'Guardar' : 'Registrar'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        message="¿Eliminar este registro de inventario?"
        onConfirm={() => { remove.mutateAsync(deleteTarget!.fdt_inventario_ptid); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
        loading={remove.isPending}
      />
    </div>
  );
}
