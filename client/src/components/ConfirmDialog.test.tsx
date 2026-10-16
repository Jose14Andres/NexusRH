import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
    message: 'Are you sure you want to do this?',
  };

  it('renders correctly with given title and message', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to do this?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCloseMock = vi.fn();
    render(<ConfirmDialog {...defaultProps} onClose={onCloseMock} />);

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    await user.click(cancelButton);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirmMock = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirmMock} />);

    const confirmButton = screen.getByRole('button', { name: /eliminar/i });
    await user.click(confirmButton);

    expect(onConfirmMock).toHaveBeenCalledTimes(1);
  });

  it('disables buttons and shows loading text when isLoading is true', () => {
    render(<ConfirmDialog {...defaultProps} isLoading={true} />);

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    const confirmButton = screen.getByRole('button', { name: /eliminando/i });

    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();
    expect(screen.getByText('Eliminando...')).toBeInTheDocument();
  });

  it('renders with custom confirmLabel', () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="Accept" />);

    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    // The ConfirmDialog renders a Modal. If isOpen is false, the Modal handles not rendering the content (or visually hiding it).
    // Let's test if the content is not in the document.
    render(<ConfirmDialog {...defaultProps} isOpen={false} />);

    // In our Modal implementation it returns null if !isOpen
    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
  });
});
