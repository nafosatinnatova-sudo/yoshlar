import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar, clampPercent, progressTone } from './ProgressBar';

describe('ProgressBar', () => {
  it('exposes an accessible progressbar with aria values', () => {
    render(<ProgressBar value={50} />);
    const bar = screen.getByRole('progressbar', { name: 'Bajarilish foizi' });
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuetext', '50%');
  });

  it('renders the visible "50%" label when showValue is set', () => {
    render(<ProgressBar value={50} showValue />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('does not render the value text by default', () => {
    render(<ProgressBar value={50} />);
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('shows a custom label as the accessible name and caption', () => {
    render(<ProgressBar value={33} label="Umumiy bajarilish" showLabel showValue />);
    expect(screen.getByRole('progressbar', { name: 'Umumiy bajarilish' })).toBeInTheDocument();
    expect(screen.getByText('Umumiy bajarilish')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('clamps and rounds values into 0–100', () => {
    const { rerender } = render(<ProgressBar value={150} showValue />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    rerender(<ProgressBar value={-20} showValue />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    rerender(<ProgressBar value={66.6} showValue />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67');
    expect(screen.getByText('67%')).toBeInTheDocument();
    rerender(<ProgressBar value={Number.NaN} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('sets the fill width from the value', () => {
    render(<ProgressBar value={50} />);
    const fill = screen.getByRole('progressbar').firstElementChild as HTMLElement;
    expect(fill.style.width).toBe('50%');
  });

  it('colors by value: 100 → success, ≥50 → primary, >0 → warning, 0 → neutral', () => {
    expect(progressTone(100)).toBe('success');
    expect(progressTone(50)).toBe('primary');
    expect(progressTone(17)).toBe('warning');
    expect(progressTone(0)).toBe('neutral');

    const { rerender } = render(<ProgressBar value={100} />);
    expect(screen.getByRole('progressbar').firstElementChild).toHaveClass('bg-emerald-500');
    rerender(<ProgressBar value={17} />);
    expect(screen.getByRole('progressbar').firstElementChild).toHaveClass('bg-amber-500');
    rerender(<ProgressBar value={17} tone="danger" />);
    expect(screen.getByRole('progressbar').firstElementChild).toHaveClass('bg-rose-500');
  });

  it('clampPercent handles edge values', () => {
    expect(clampPercent(Infinity)).toBe(0);
    expect(clampPercent(49.5)).toBe(50);
    expect(clampPercent(101)).toBe(100);
  });
});
