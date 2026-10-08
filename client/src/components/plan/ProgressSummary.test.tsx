import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { PlanDay } from '@/api/types';
import { buildDays } from '@/test/fixtures';
import { DayGrid } from './DayGrid';
import { ProgressSummary } from './ProgressSummary';

describe('ProgressSummary', () => {
  it('shows 50% when 3 of 6 topics are completed (judge test #6)', () => {
    render(<ProgressSummary days={buildDays({ completed: ['t1', 't3', 't5'] })} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('3 / 6 mavzu')).toBeInTheDocument();
  });

  it('shows 100% when all 6 topics are completed (judge test #7)', () => {
    render(<ProgressSummary days={buildDays({ completed: ['t1', 't2', 't3', 't4', 't5', 't6'] })} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('shows 0% when nothing is completed (judge test #8)', () => {
    render(<ProgressSummary days={buildDays()} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('renders the three stat cards: Jami 6 mavzu / Bajarildi N mavzu / Natija P% bajarilgan', () => {
    render(<ProgressSummary days={buildDays({ completed: ['t2'] })} />);
    expect(screen.getByText('Jami')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('Bajarildi')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getAllByText('mavzu')).toHaveLength(2);
    expect(screen.getByText('Natija')).toBeInTheDocument();
    expect(screen.getByText('17%')).toBeInTheDocument();
    expect(screen.getByText('bajarilgan')).toBeInTheDocument();
  });

  it('review days do not affect the percent (6 topics over 8 days)', () => {
    render(<ProgressSummary days={buildDays({ daysCount: 8, completed: ['t1', 't2', 't3'] })} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('3 / 6 mavzu')).toBeInTheDocument();
  });

  it('announces changes through a polite live region', () => {
    render(<ProgressSummary days={buildDays({ completed: ['t1', 't2', 't3'] })} />);
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live).toHaveTextContent('Natija: 50 foiz');
  });

  it('updates live as checkboxes are toggled in DayCards', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [days, setDays] = useState<PlanDay[]>(() => buildDays());
      const toggle = (topicId: string, next: boolean) =>
        setDays((prev) =>
          prev.map((d) => ({
            ...d,
            topics: d.topics.map((t) => (t.topicId === topicId ? { ...t, completed: next } : t)),
          })),
        );
      return (
        <>
          <ProgressSummary days={days} />
          <DayGrid days={days} onToggle={toggle} />
        </>
      );
    }
    render(<Harness />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Mavzu 1/ }));
    await user.click(screen.getByRole('checkbox', { name: /Mavzu 4/ }));
    await user.click(screen.getByRole('checkbox', { name: /Mavzu 6/ }));
    expect(screen.getByText('50%')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Mavzu 6/ }));
    expect(screen.getByText('33%')).toBeInTheDocument();
  });
});
