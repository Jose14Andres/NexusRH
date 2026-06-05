import { Plus } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ElementType;
  };
  canAction?: boolean;
}

export default function PageHeader({ title, subtitle, action, canAction = true }: Props) {
  const Icon = action?.icon ?? Plus;
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action && canAction && (
        <button onClick={action.onClick} className="btn-primary shrink-0">
          <Icon className="h-4 w-4" />
          {action.label}
        </button>
      )}
    </div>
  );
}
