import { useMemo } from 'react';
import { Package, Boxes, TrendingDown, Building2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { KPICard, Spinner } from '../../components/shared';
import { useInventarioMP, useInventarioPT, useBodegas, usePeriodoActivo, useAllRecetas, useProduccion, useCompras, useMP } from '../../hooks';
import { consumoTeoricoMP, inventarioTeoricoMP, diferencia, pctDiferencia, semaforo, totalComprasPorMP, invFisicoPorMP, fmtPct } from '../../utils';

export default function DashboardPage() {
  const { data: periodo, isLoading: loadP } = usePeriodoActivo();
  const periodoId = periodo?.cre53_periodoid ?? null;

  const { data: invMP = [] } = useInventarioMP(periodoId);
  const { data: invPT = [] } = useInventarioPT(periodoId);
  const { data: bodegas = [] } = useBodegas();
  const { data: recetas = [] } = useAllRecetas();
  const { data: produccion = [] } = useProduccion(periodoId);
  const { data: compras = [] } = useCompras(periodoId);
  const { data: mps = [] } = useMP();

  const comprasMap = useMemo(() => totalComprasPorMP(compras), [compras]);
  const fisicoMPMap = useMemo(() => invFisicoPorMP(invMP), [invMP]);

  const totalValorMP = invMP.reduce((s, i) => s + i.cre53_fdt_valor, 0);
  const totalValorPT = invPT.reduce((s, i) => s + (i.cre53_fdt_valor ?? 0), 0);
  const bodegasConCaptura = new Set(invPT.map(i => i._cre53_bodega_value)).size;
  const totalBotellasProd = produccion.reduce((s, p) => s + p.cre53_fdt_cantidad_botellas, 0);

  const alertasMP = useMemo(() => mps.map(mp => {
    const consumo = consumoTeoricoMP(mp.cre53_materiaprimaid, recetas, produccion);
    const teorico = inventarioTeoricoMP(0, comprasMap[mp.cre53_materiaprimaid] ?? 0, consumo);
    const fisico = fisicoMPMap[mp.cre53_materiaprimaid] ?? 0;
    const pct = pctDiferencia(fisico, teorico);
    return { mp, teorico, fisico, diff: diferencia(fisico, teorico), pct, sem: semaforo(pct) };
  }).filter(a => a.teorico > 0 || a.fisico > 0).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)), [mps, recetas, produccion, comprasMap, fisicoMPMap]);

  const criticos = alertasMP.filter(a => a.sem === 'danger').length;
  const advertencias = alertasMP.filter(a => a.sem === 'warning').length;

  if (loadP) return <Spinner label="Cargando período activo..." />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Dashboard</h1>
        {periodo ? (
          <p className="text-sm text-gray-500 mt-1">Período activo: <strong className="text-primary">{periodo.cre53_id}</strong> · Corte: {periodo.cre53_fdt_fecha_corte?.split('T')[0]}</p>
        ) : (
          <div className="mt-2 inline-flex items-center gap-2 text-sm text-warning bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-lg">
            <AlertTriangle size={14} /> Sin período activo — crea uno en Catálogos › Períodos
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard title="Inventario MP" value={totalValorMP} format="currency" icon={<Package size={18} />} color="blue" />
        <KPICard title="Inventario PT" value={totalValorPT} format="currency" icon={<Boxes size={18} />} color="green" />
        <KPICard title="Botellas Producidas" value={totalBotellasProd} format="number" icon={<TrendingDown size={18} />} color="yellow" />
        <KPICard title="Bodegas Capturadas" value={`${bodegasConCaptura}/${bodegas.length}`} format="text" icon={<Building2 size={18} />} color={bodegasConCaptura === bodegas.length ? 'green' : 'yellow'} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Diferencias MP — Semáforo</h2>
            <div className="flex gap-2">
              {criticos > 0 && <span className="badge-danger">{criticos} críticos</span>}
              {advertencias > 0 && <span className="badge-warning">{advertencias} alertas</span>}
              {criticos === 0 && advertencias === 0 && alertasMP.length > 0 && <span className="badge-success">Todo OK</span>}
            </div>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {alertasMP.slice(0, 12).map(a => (
              <div key={a.mp.cre53_materiaprimaid} className={`flex items-center justify-between p-2.5 rounded-lg text-sm ${a.sem === 'danger' ? 'bg-red-50' : a.sem === 'warning' ? 'bg-yellow-50' : 'bg-green-50'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  {a.sem === 'success' ? <CheckCircle2 size={14} className="text-success shrink-0" /> : <AlertTriangle size={14} className={a.sem === 'danger' ? 'text-danger shrink-0' : 'text-warning shrink-0'} />}
                  <span className="truncate text-gray-700">{a.mp.cre53_fdt_alias || a.mp.cre53_fdt_descripcion}</span>
                </div>
                <span className={`ml-3 text-xs font-semibold shrink-0 ${a.diff < 0 ? 'text-danger' : a.diff > 0 ? 'text-warning' : 'text-success'}`}>
                  {fmtPct(a.pct)}
                </span>
              </div>
            ))}
            {alertasMP.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sin datos — captura el inventario del período</p>}
          </div>
        </div>

        <div className="card">
          <h2 className="section-title">Cobertura PT por Bodega</h2>
          <div className="space-y-2">
            {bodegas.map(b => {
              const registros = invPT.filter(i => i._cre53_bodega_value === b.cre53_bodegaid).length;
              return (
                <div key={b.cre53_bodegaid} className={`flex items-center justify-between p-2.5 rounded-lg ${registros > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className={registros > 0 ? 'text-success' : 'text-gray-400'} />
                    <span className="text-sm text-gray-700">{b.cre53_fdt_nombre}</span>
                    <span className="text-xs text-gray-400">({b.cre53_fdt_tipo === 1 ? 'MP+PT' : 'PT'})</span>
                  </div>
                  {registros > 0 ? <span className="badge-success">{registros} SKUs</span> : <span className="badge-warning">Sin captura</span>}
                </div>
              );
            })}
            {bodegas.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sin bodegas registradas</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
