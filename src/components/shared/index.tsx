import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fmtPeso, fmtNum, fmtPct } from '../../utils';

// ─── KPI CARD ────────────────────────────────────────────────────────────────
interface KPICardProps {
  title: string;
  value: string | number;
  format?: 'currency' | 'number' | 'percent' | 'text';
  delta?: number;
  deltaLabel?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

const kpiColors = {
  blue:   'bg-blue-50 text-primary border-blue-100',
  green:  'bg-green-50 text-success border-green-100',
  yellow: 'bg-yellow-50 text-warning border-yellow-100',
  red:    'bg-red-50 text-danger border-red-100',
};
const iconColors = {
  blue: 'bg-primary text-white', green: 'bg-success text-white',
  yellow: 'bg-warning text-white', red: 'bg-danger text-white',
};

export function KPICard({ title, value, format = 'number', delta, deltaLabel, icon, color = 'blue' }: KPICardProps) {
  const formatted = format === 'currency' ? fmtPeso(Number(value))
    : format === 'percent' ? `${fmtNum(Number(value))}%`
    : format === 'number' ? fmtNum(Number(value), 0)
    : String(value);

  return (
    <div className={`card border ${kpiColors[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider truncate">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 truncate">{formatted}</p>
          {delta !== undefined && (
            <div className="mt-1 flex items-center gap-1 text-xs">
              {delta > 0 ? <TrendingUp size={12} className="text-success" />
                : delta < 0 ? <TrendingDown size={12} className="text-danger" />
                : <Minus size={12} className="text-gray-400" />}
              <span className={delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-gray-400'}>
                {fmtPct(delta)}
              </span>
              {deltaLabel && <span className="text-gray-400">{deltaLabel}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className={`ml-4 p-2.5 rounded-lg ${iconColors[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'gray';
const badgeClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger:  'bg-red-100 text-red-800',
  info:    'bg-blue-100 text-blue-800',
  gray:    'bg-gray-100 text-gray-600',
};
export function Badge({ label, variant = 'info' }: { label: string; variant?: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClasses[variant]}`}>
      {label}
    </span>
  );
}

// ─── PAGE HEADER ──────────────────────────────────────────────────────────────
export function PageHeader({
  title, subtitle, action
}: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  );
}

// ─── CONFIRM DIALOG ───────────────────────────────────────────────────────────
import { Modal } from './Modal';
interface ConfirmProps {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  variant?: 'danger' | 'warning';
}
export function ConfirmDialog({ open, title = '¿Confirmar acción?', message, onConfirm, onCancel, loading, variant = 'danger' }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="btn-secondary" disabled={loading}>Cancelar</button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
        >
          {loading ? 'Procesando...' : 'Confirmar'}
        </button>
      </div>
    </Modal>
  );
}

// ─── SEARCH INPUT ─────────────────────────────────────────────────────────────
import { Search } from 'lucide-react';
export function SearchInput({ value, onChange, placeholder = 'Buscar...' }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="form-input pl-9 py-1.5 w-64"
      />
    </div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-16">
      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Minus size={24} className="text-gray-300" />
      </div>
      <p className="text-gray-500 text-sm">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── LOADING SPINNER ──────────────────────────────────────────────────────────
import { Loader2 } from 'lucide-react';
export function Spinner({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-gray-500">
      <Loader2 className="animate-spin" size={20} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

// ─── ERROR ALERT ──────────────────────────────────────────────────────────────
import { AlertTriangle } from 'lucide-react';
export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
      <AlertTriangle size={18} className="shrink-0" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
