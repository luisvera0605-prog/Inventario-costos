# Sistema de Inventario y Costeo — Flor de Tabasco

React + TypeScript + Vite · MSAL PKCE · Dataverse · TanStack Query

## Setup rápido

### 1. App Registration Azure AD
- portal.azure.com → AAD → App Registrations → New
- Nombre: `InventarioCostos` · Single tenant · Redirect URI SPA: `http://localhost:5173`
- API Permissions: Dynamics CRM → user_impersonation
- Authentication → Allow public client flows = Yes
- Copiar el **Client ID**

### 2. .env.local
```
VITE_DATAVERSE_URL=https://orge90b3312.crm.dynamics.com
VITE_TENANT_ID=746b050c-a1ff-45b9-9858-e142490982b7
VITE_CLIENT_ID=<client-id>
VITE_REDIRECT_URI=http://localhost:5173
```

### 3. Crear tablas Dataverse
Ver `scripts/dataverse-tables.md`

### 4. Correr
```bash
npm install && npm run dev
```

## Módulos
Dashboard · Catálogos (MP, SKU, Bodegas, Períodos, Recetas) · Inventario MP · Inventario PT · Producción · Compras · Ventas · Costeo
