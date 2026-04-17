import { Routes, Route, Navigate } from 'react-router-dom';
import { MsalAuthenticationTemplate } from '@azure/msal-react';
import { InteractionType } from '@azure/msal-browser';
import { AppShell } from './components/layout/AppShell';
import DashboardPage from './pages/Dashboard';
import MateriasPrimasPage from './pages/Catalogos/MateriasPrimas';
import SKUsPage from './pages/Catalogos/SKUs';
import { BodegasPage, PeriodosPage } from './pages/Catalogos/BodegasPeriodos';
import RecetasPage from './pages/Catalogos/Recetas';
import InventarioMPPage from './pages/InventarioMP';
import InventarioPTPage from './pages/InventarioPT';
import ProduccionPage from './pages/Produccion';
import ComprasPage from './pages/Compras';
import VentasPage from './pages/Ventas';
import CosteoPage from './pages/Costeo';
import { dataverseScopes } from './auth/authConfig';

function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#1B4F72', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, background: '#F4D03F', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, fontWeight: 700, color: '#1B4F72' }}>FT</div>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 500, margin: '0 0 8px' }}>Flor de Tabasco</h1>
        <p style={{ color: '#93C6E7', fontSize: 14, margin: '0 0 16px' }}>Sistema de Inventario y Costeo</p>
        <p style={{ color: '#5B9EC9', fontSize: 13 }}>Iniciando sesión con tu cuenta Microsoft...</p>
      </div>
    </div>
  );
}

function ErrorPage({ error }: { error: Error | null }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: 32 }}>
        <p style={{ color: '#E74C3C', fontWeight: 500 }}>Error de autenticación</p>
        <p style={{ fontSize: 13, color: '#666', marginTop: 8 }}>{error?.message}</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <MsalAuthenticationTemplate
      interactionType={InteractionType.Redirect}
      authenticationRequest={{ scopes: dataverseScopes }}
      loadingComponent={LoginPage}
      errorComponent={ErrorPage}
    >
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="catalogos/mp" element={<MateriasPrimasPage />} />
          <Route path="catalogos/skus" element={<SKUsPage />} />
          <Route path="catalogos/bodegas" element={<BodegasPage />} />
          <Route path="catalogos/periodos" element={<PeriodosPage />} />
          <Route path="catalogos/recetas" element={<RecetasPage />} />
          <Route path="inventario/mp" element={<InventarioMPPage />} />
          <Route path="inventario/pt" element={<InventarioPTPage />} />
          <Route path="produccion" element={<ProduccionPage />} />
          <Route path="compras" element={<ComprasPage />} />
          <Route path="ventas" element={<VentasPage />} />
          <Route path="costeo" element={<CosteoPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </MsalAuthenticationTemplate>
  );
}
