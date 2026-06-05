import Modal from './Modal';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isLoading?: boolean;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
}

export default function ConfirmDialog({
  isOpen, onClose, onConfirm,
  title, message, isLoading = false,
  confirmLabel = 'Eliminar',
  variant = 'danger',
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex gap-4">
        <div className={`shrink-0 rounded-full p-2.5 ${
          variant === 'danger' ? 'bg-red-100' : 'bg-yellow-100'
        }`}>
          <AlertTriangle className={`h-5 w-5 ${
            variant === 'danger' ? 'text-red-600' : 'text-yellow-600'
          }`} />
        </div>
        <p className="text-sm text-gray-600">{message}</p>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button onClick={onClose} disabled={isLoading} className="btn-secondary">
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
        >
          {isLoading
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            : <Trash2 className="h-4 w-4" />
          }
          {isLoading ? 'Eliminando...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
