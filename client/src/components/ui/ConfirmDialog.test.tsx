import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';
import { TextField } from './TextField';

function Harness({ onConfirm = vi.fn() }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Rejani o'chirish
      </button>
      <ConfirmDialog
        open={open}
        title="Rejani o'chirish"
        description="Bu amalni ortga qaytarib bo'lmaydi."
        confirmLabel="O'chirish"
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

describe('ConfirmDialog', () => {
  it('opens as an accessible alertdialog with Uzbek buttons and focuses cancel', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: "Rejani o'chirish" }));
    const dialog = screen.getByRole('alertdialog', { name: "Rejani o'chirish" });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription("Bu amalni ortga qaytarib bo'lmaydi.");
    expect(screen.getByRole('button', { name: "O'chirish" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Bekor qilish' })).toHaveFocus());
  });

  it('Esc closes the dialog without confirming and restores focus', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    const trigger = screen.getByRole('button', { name: "Rejani o'chirish" });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it('confirm button calls onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: "Rejani o'chirish" }));
    await user.click(screen.getByRole('button', { name: "O'chirish" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('keeps Tab focus inside the dialog', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: "Rejani o'chirish" }));
    const cancel = screen.getByRole('button', { name: 'Bekor qilish' });
    const confirm = screen.getByRole('button', { name: "O'chirish" });
    await waitFor(() => expect(cancel).toHaveFocus());
    await user.tab();
    expect(confirm).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();
  });

  it('blocks Esc while loading', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="X" loading onConfirm={() => {}} onCancel={onCancel} />);
    await user.keyboard('{Escape}');
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Tasdiqlash' })).toBeDisabled();
  });
});

describe('TextField', () => {
  it('renders the error under the input with role="alert" and wires aria attributes', () => {
    render(<TextField label="Kunlar soni" error="Kunlar soni kamida 1 bo'lishi kerak." />);
    const input = screen.getByLabelText('Kunlar soni');
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent("Kunlar soni kamida 1 bo'lishi kerak.");
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription("Kunlar soni kamida 1 bo'lishi kerak.");
    // The error paragraph comes after the input in the DOM (i.e. visually under it).
    expect(input.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows a hint when there is no error and never sets the native required attribute', () => {
    render(<TextField label="Reja nomi" hint="Masalan: Matematika imtihoni" required />);
    const input = screen.getByLabelText(/Reja nomi/);
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('required');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAccessibleDescription('Masalan: Matematika imtihoni');
  });

  it('password fields can be revealed', async () => {
    const user = userEvent.setup();
    render(<TextField label="Parol" type="password" defaultValue="secret" />);
    const input = screen.getByLabelText('Parol');
    expect(input).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: "Parolni ko'rsatish" }));
    expect(input).toHaveAttribute('type', 'text');
  });
});
