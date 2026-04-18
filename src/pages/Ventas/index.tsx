import { useState, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';
import { Modal } from '../../components/shared/Modal';
import { PageHeader, KPICard, Spinner, ConfirmDialog } from '../../components/shared';
import { useVentas, useVentasMutations, useSKUs, useBodegas, usePeriodoActivo } from '../../hooks';
import { fmtPeso, fmtNum } from '../../utils';
import type { VentaForm } from '../../types';
import { TIPO_EMPAQUE_LABEL } from '../../types';

export default function VentasPage() {
  const { data: periodo } = usePeriodoActivo();
  const periodoId = periodo?.cre53_periodoid ?? null;
  const { data: ventas = [], isLoading } = useVentas(periodoId);
  const { data: skus = [] } = useSKUs();
  const { data: bodegas = [] } = useBodegas();
  const { create, remove } = useVentasMutations(periodoId);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm] = useState<Partial<VentaForm>>({ _cre53_periodo_value: periodoId ?? '', cre53_fdt_cantidad: 0, cre53_fdt_fecha: new Date().toISOString().split('T')[0] });

  const skuMap = useMemo(() => Object.fromEntries(skus.map(s => [s.cre53_skuid, s])), [skus]);
  const bodegaMap = useMemo(() => Object.fromEntries(bodegas.map(b => [b.cre53_bodegaid, b])), [bodegas]);

  const totalUnidades = ventas.reduce((s, v) => s + v.cre53_fdt_cantidad, 0);
  const totalValor = ventas.reduce((s, v) => s + (v.cre53_fdt_valor ?? 0), 0);

  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    await create.mutateAsync({
      ...form, _cre53_periodo_value: periodoId!,
      cre53_fdt_valor: (form.cre53_fdt_cantidad ?? 0) * (form.cre53_fdt_precio_venta ?? 0),
    } as VentaForm);
    setModalOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Ventas y Despachos"
        subtitle={periodo?.cre53_fdt_nombre ?? 'Sin período activo'}
        action={<button className="btn-primary" onClick={() => { setForm({ _cre53_periodo_value: periodoId ?? '', cre53_fdt_cantidad: 0, cre53_fdt_fecha: new Date().toISOString().split('T')[0] }); setModalOpen(true); }} disabled={!periodoId}><Plus size={16} />Registrar venta</button>}
      />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KPICard title="Unidades Vendidas" value={totalUnidades} format="number" color="blue" />
        <KPICard title="Valor Total Ventas" value={totalValor} format="currency" color="green" />
        <KPICard title="Registros" value={ventas.length} format="number" color="yellow" />
      </div>
      {isLoading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          <DataTable
            data={ventas} rowKey={r => r.cre53_ventainventariosid}
            columns={[
              { key: 'cre53_bodega', header: 'Bodega', render: r => bodegaMap[r._cre53_bodega_value ?? '']?.cre53_fdt_nombre ?? '—' },
              { key: 'cre53_sku', header: 'SKU', render: r => { const s = skuMap[r._cre53_sku_value ?? '']; return s ? `${s.cre53_fdt_presentacion} · ${TIPO_EMPAQUE_LABEL[s.cre53_fdt_tipo_empaque]}` : r._cre53_sku_value; } },
              { key: 'cre53_fdt_cantidad', header: 'Unidades', align: 'right', render: r => <span className="font-semibold">{fmtNum(r.cre53_fdt_cantidad, 0)}</span> },
              { key: 'cre53_fdt_precio_venta', header: 'Precio', align: 'right', render: r => r.cre53_fdt_precio_venta ? fmtPeso(r.cre53_fdt_precio_venta) : '—' },
              { key: 'cre53_fdt_valor', header: 'Valor', align: 'right', render: r => r.cre53_fdt_valor ? <span className="font-semibold">{fmtPeso(r.cre53_fdt_valor)}</span> : '—' },
              { key: 'cre53_fdt_folio', header: 'Folio', render: r => r.cre53_fdt_folio ?? '—' },
              { key: 'cre53_fdt_fecha', header: 'Fecha', render: r => r.cre53_fdt_fecha?.split('T')[0] ?? '—' },
              { key: 'actions', header: '', align: 'right', width: '50px', render: r => <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-gray-300 hover:text-danger rounded"><Trash2 size={14} /></button> },
            ]}
          />
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar Venta / Despacho" size="md">
        <div className="space-y-4">
          <div>
            <label className="form-label">Bodega *</label>
            <select className="form-select" value={form.cre53_bodega ?? ''} onChange={e => f('_cre53_bodega_value', e.target.value)}>
              <option value="">Seleccionar...</option>
              {bodegas.map(b => <option key={b.cre53_bodegaid} value={b.cre53_bodegaid}>{b.cre53_fdt_nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">SKU *</label>
            <select className="form-select" value={form.cre53_sku ?? ''} onChange={e => f('_cre53_sku_value', e.target.value)}>
              <option value="">Seleccionar...</option>
              {skus.map(s => <option key={s.cre53_skuid} value={s.cre53_skuid}>{s.cre53_fdt_codigo} — {s.cre53_fdt_presentacion} ({TIPO_EMPAQUE_LABEL[s.cre53_fdt_tipo_empaque]})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">Cantidad *</label>
              <input type="number" min="0" className="form-input" value={form.cre53_fdt_cantidad ?? 0} onChange={e => f('cre53_fdt_cantidad', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="form-label">Precio Venta</label>
              <input type="number" step="0.01" className="form-input" value={form.cre53_fdt_precio_venta ?? ''} onChange={e => f('cre53_fdt_precio_venta', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="form-label">Folio</label>
              <input className="form-input" value={form.cre53_fdt_folio ?? ''} onChange={e => f('cre53_fdt_folio', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="form-label">Fecha *</label>
            <input type="date" className="form-input" value={form.cre53_fdt_fecha?.split('T')[0] ?? ''} onChange={e => f('cre53_fdt_fecha', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={create.isPending || !form.cre53_sku || !form.cre53_bodega}>
              {create.isPending ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} message="¿Eliminar este registro de venta?"
        onConfirm={() => { remove.mutateAsync(deleteTarget.cre53_ventainventariosid); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)} loading={remove.isPending} />
    </div>
  );
}
