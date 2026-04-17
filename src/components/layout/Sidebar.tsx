import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Boxes, FlaskConical,
  Warehouse, Building2, ClipboardList, TrendingDown, LogOut,
  Factory, DollarSign, BookOpen, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../auth/useAuth';

interface NavItem {
  label: string;
  to?: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: <LayoutDashboard size={18} /> },
  {
    label: 'Catálogos', icon: <BookOpen size={18} />,
    children: [
      { label: 'Materias Primas', to: '/catalogos/mp', icon: <Package size={16} /> },
      { label: 'SKUs / PT', to: '/catalogos/skus', icon: <Boxes size={16} /> },
      { label: 'Bodegas', to: '/catalogos/bodegas', icon: <Building2 size={16} /> },
      { label: 'Recetas', to: '/catalogos/recetas', icon: <FlaskConical size={16} /> },
      { label: 'Períodos', to: '/catalogos/periodos', icon: <ClipboardList size={16} /> },
    ],
  },
  {
    label: 'Inventario', icon: <Warehouse size={18} />,
    children: [
      { label: 'Materia Prima', to: '/inventario/mp', icon: <Package size={16} /> },
      { label: 'Producto Terminado', to: '/inventario/pt', icon: <Boxes size={16} /> },
    ],
  },
  {
    label: 'Operaciones', icon: <Factory size={18} />,
    children: [
      { label: 'Producción', to: '/produccion', icon: <Factory size={16} /> },
      { label: 'Compras MP', to: '/compras', icon: <ShoppingCart size={16} /> },
      { label: 'Ventas', to: '/ventas', icon: <DollarSign size={16} /> },
    ],
  },
  { label: 'Costeo', to: '/costeo', icon: <TrendingDown size={18} /> },
];

function NavGroup({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-blue-200 uppercase tracking-wider hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">{item.icon}{item.label}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="pl-4 pb-1 space-y-0.5">
          {item.children?.map(child => (
            <NavLink
              key={child.to}
              to={child.to!}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-accent text-primary font-semibold'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {child.icon}
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { account, logout } = useAuth();

  return (
    <aside className="w-64 min-h-screen bg-primary flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center">
            <Boxes size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Flor de Tabasco</p>
            <p className="text-blue-200 text-xs">Inventario & Costeo</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item =>
          item.to ? (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-accent text-primary font-semibold'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ) : (
            <NavGroup key={item.label} item={item} />
          )
        )}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {account?.name ?? 'Usuario'}
            </p>
            <p className="text-blue-300 text-xs truncate">
              {account?.username ?? ''}
            </p>
          </div>
          <button
            onClick={logout}
            title="Cerrar sesión"
            className="ml-2 p-1.5 text-blue-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
