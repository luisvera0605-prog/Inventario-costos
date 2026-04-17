import { useMemo } from 'react';
import { PageHeader, Spinner, Badge } from '../../components/shared';
import { DataTable } from '../../components/shared/DataTable';
import { useSKUs, useMP, useAllRecetas, usePeriodoActivo } from '../../hooks';
import { fmtPeso, fmtNum, costoMPPorBotella } from '../../utils';
import { LINEA_LABEL, TIPO_EMPAQUE_LABEL } from '../../types';

export default function CosteoPage() {
  const { data: skus = [], isLoading: loadSKU } = useSKUs();
  const { data: mps = [] } = useMP();
  const { data: recetas = [], isLoading: loadRec } = useAllRecetas();
  const { data: periodo } = usePeriodoActivo();

  const preciosMap = useMemo(() => Object.fromEntries(mps.map(m => [m.cre53_materiaprimaid, m.cre53_precio_base])), [mps]);
  const recetasMap = useMemo(() => {
    const map: Record<string, typeof recetas> = {};
    recetas.forEach(r => { if (!map[r._cre53_sku_value]) map[r._cre53_sku_value] = []; map[r._cre53_sku_value].push(r); });
    return map;
  }, [recetas]);

  const costos = useMemo(() => skus.map(sku => {
    const recSKU = recetasMap[sku.cre53_skuid] ?? [];
    const recConc = recSKU.filter(r => r.cre53_tipo_insumo === 1);
    const recEmp = recSKU.filter(r => r.cre53_tipo_insumo === 2);
    const recEmb = recSKU.filter(r => r.cre53_tipo_insumo === 3);
    const costoConc = costoMPPorBotella(recConc, preciosMap);
    const costoEmp = costoMPPorBotella(recEmp, preciosMap);
    const costoEmb = costoMPPorBotella(recEmb, preciosMap);
    const total = costoConc + costoEmp + costoEmb;
    return { sku, costoConc, costoEmp, costoEmb, total, lineasReceta: recSKU.length };
  }), [skus, recetasMap, preciosMap]);

  const loading = loadSKU || loadRec;

  return (
    <div>
      <PageHeader
        title="Costeo Teórico"
        subtitle={`Costo de MP por botella · Precios actuales del catálogo${periodo ? ` · ${periodo.cre53_nombre}` : ''}`}
      />

      <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
        <strong>Nota:</strong> Este costeo incluye únicamente el costo de materia prima (MP + empaque + embalaje) según las recetas registradas. El costo de MOD (mano de obra directa) y CIF se gestionan como parámetros separados.
      </div>

      {loading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          <DataTable
            data={costos}
            rowKey={r => r.sku.cre53_skuid}
            columns={[
              {
                key: 'sku', header: 'SKU / Presentación',
                render: r => (
                  <div>
                    <p className="font-medium text-sm">{r.sku.cre53_presentacion}</p>
                    <p className="text-xs text-gray-400 font-mono">{r.sku.cre53_codigo}</p>
                  </div>
                )
              },
              { key: 'sku', header: 'Línea', render: r => <Badge label={LINEA_LABEL[r.sku.cre53_linea]} variant={r.sku.cre53_linea === 1 ? 'info' : 'warning'} /> },
              { key: 'sku', header: 'Empaque', render: r => <Badge label={TIPO_EMPAQUE_LABEL[r.sku.cre53_tipo_empaque]} variant="gray" /> },
              { key: 'sku', header: 'ml', align: 'right', render: r => `${r.sku.cre53_mililitros}` },
              {
                key: 'costoConc', header: 'Concentrado', align: 'right',
                render: r => r.costoConc > 0
                  ? <span className="text-blue-700 font-mono text-xs">{fmtPeso(r.costoConc)}</span>
                  : <span className="text-gray-300 text-xs">—</span>
              },
              {
                key: 'costoEmp', header: 'Empaque', align: 'right',
                render: r => r.costoEmp > 0
                  ? <span className="text-orange-600 font-mono text-xs">{fmtPeso(r.costoEmp)}</span>
                  : <span className="text-gray-300 text-xs">—</span>
              },
              {
                key: 'costoEmb', header: 'Embalaje', align: 'right',
                render: r => r.costoEmb > 0
                  ? <span className="text-purple-600 font-mono text-xs">{fmtPeso(r.costoEmb)}</span>
                  : <span className="text-gray-300 text-xs">—</span>
              },
              {
                key: 'total', header: 'Costo MP Total', align: 'right', sortable: true,
                render: r => r.total > 0
                  ? <span className="font-bold text-gray-900">{fmtPeso(r.total)}</span>
                  : <span className="badge-warning">Sin receta</span>
              },
              {
                key: 'lineasReceta', header: 'Insumos', align: 'center',
                render: r => <span className={`text-xs ${r.lineasReceta === 0 ? 'text-danger font-semibold' : 'text-gray-500'}`}>{r.lineasReceta}</span>
              },
            ]}
          />
        </div>
      )}

      {/* Desglose detallado por SKU seleccionado */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {costos.filter(c => c.total > 0).slice(0, 4).map(c => (
          <div key={c.sku.cre53_skuid} className="card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-sm">{c.sku.cre53_presentacion}</p>
                <p className="text-xs text-gray-400">{TIPO_EMPAQUE_LABEL[c.sku.cre53_tipo_empaque]}</p>
              </div>
              <span className="text-lg font-bold text-primary">{fmtPeso(c.total)}</span>
            </div>
            <div className="space-y-1.5">
              {(recetasMap[c.sku.cre53_skuid] ?? []).map(r => {
                const mp = mps.find(m => m.cre53_materiaprimaid === r._cre53_mp_value);
                const costo = r.cre53_qty_por_botella * (preciosMap[r._cre53_mp_value] ?? 0);
                return (
                  <div key={r.cre53_recetaid} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 truncate max-w-xs">{mp?.cre53_alias || mp?.cre53_descripcion}</span>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-gray-400 font-mono">{fmtNum(r.cre53_qty_por_botella, 6)} {r.cre53_unidad}</span>
                      <span className="font-medium text-gray-800 w-16 text-right">{fmtPeso(costo)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 pt-2 border-t flex justify-between text-xs font-semibold">
              <span className="text-gray-500">Total MP</span>
              <span className="text-primary">{fmtPeso(c.total)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
