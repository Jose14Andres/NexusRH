import { Plus } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  /** Icono decorativo mostrado junto al título (dentro de un badge). */
  icon?: React.ReactNode;
  /** Acciones personalizadas a la derecha (tiene prioridad sobre `action`). */
  actions?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ElementType;
  };
  canAction?: boolean;
}

export default function PageHeader({
  title, subtitle, icon, actions, action, canAction = true,
}: Props) {
  const Icon = action?.icon ?? Plus;
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>

      {actions ? (
        <div className="shrink-0">{actions}</div>
      ) : action && canAction ? (
        <button onClick={action.onClick} className="btn-primary shrink-0">
          <Icon className="h-4 w-4" />
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
