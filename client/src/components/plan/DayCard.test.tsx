import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { REVIEW_DAY_LABEL } from '@shared/planner';
import { buildDays } from '@/test/fixtures';
import { DayCard } from './DayCard';

describe('DayCard', () => {
  it('renders the day header: "1-kun", formatted date and "60 daqiqa"', () => {
    const [day] = buildDays(); // 6 topics, 3 days, 60 min, start 2026-10-10
    render(<DayCard day={day} isToday={false} />);
    expect(screen.getByRole('heading', { name: '1-kun' })).toBeInTheDocument();
    expect(screen.getByText('10-oktabr, 2026')).toBeInTheDocument();
    expect(screen.getByText('60 daqiqa')).toBeInTheDocument();
  });

  it('lists the day topics as labelled checkboxes with "30 daq."', () => {
    const [day] = buildDays();
    render(<DayCard day={day} onToggle={() => {}} isToday={false} />);
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(2);
    expect(screen.getByRole('checkbox', { name: /Mavzu 1/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Mavzu 2/ })).not.toBeChecked();
    expect(screen.getAllByText('30 daq.')).toHaveLength(2);
  });

  it('calls onToggle(topicId, true) when an unchecked topic is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const [day] = buildDays();
    render(<DayCard day={day} onToggle={onToggle} isToday={false} />);
    await user.click(screen.getByRole('checkbox', { name: /Mavzu 2/ }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith('t2', true);
  });

  it('calls onToggle(topicId, false) for a completed topic and also toggles via the label text', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const [day] = buildDays({ completed: ['t1'] });
    render(<DayCard day={day} onToggle={onToggle} isToday={false} />);
    expect(screen.getByRole('checkbox', { name: /Mavzu 1/ })).toBeChecked();
    await user.click(screen.getByText('Mavzu 1'));
    expect(onToggle).toHaveBeenCalledWith('t1', false);
  });

  it('toggles with the keyboard (Space)', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const [day] = buildDays();
    render(<DayCard day={day} onToggle={onToggle} isToday={false} />);
    screen.getByRole('checkbox', { name: /Mavzu 1/ }).focus();
    await user.keyboard(' ');
    expect(onToggle).toHaveBeenCalledWith('t1', true);
  });

  it('readOnly disables every checkbox and never calls onToggle', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const [day] = buildDays({ completed: ['t1'] });
    render(<DayCard day={day} onToggle={onToggle} readOnly isToday={false} />);
    const boxes = screen.getAllByRole('checkbox');
    boxes.forEach((box) => expect(box).toBeDisabled());
    await user.click(boxes[1]);
    expect(onToggle).not.toHaveBeenCalled();
    expect(boxes[0]).toBeChecked();
  });

  it('is read-only when no onToggle handler is given', () => {
    const [day] = buildDays();
    render(<DayCard day={day} isToday={false} />);
    screen.getAllByRole('checkbox').forEach((box) => expect(box).toBeDisabled());
  });

  it('shows completed topics struck through with their completion time', () => {
    const completedAt = new Date(2026, 9, 10, 14, 5).toISOString();
    const [day] = buildDays({ completed: ['t1'], completedAt });
    render(<DayCard day={day} onToggle={() => {}} isToday={false} />);
    expect(screen.getByText('Mavzu 1')).toHaveClass('line-through');
    expect(screen.getByText('Mavzu 2')).not.toHaveClass('line-through');
    expect(screen.getByText(/Bajarildi: 10-oktabr, 14:05/)).toBeInTheDocument();
    expect(screen.getByText('1/2 mavzu bajarildi')).toBeInTheDocument();
  });

  it('renders a review day with "Takrorlash / dam olish" and no checkboxes', () => {
    const days = buildDays({ daysCount: 8 }); // 6 study days + 2 review days
    const reviewDay = days[7];
    expect(reviewDay.type).toBe('review');
    render(<DayCard day={reviewDay} onToggle={() => {}} isToday={false} />);
    const card = screen.getByRole('article', { name: '8-kun' });
    expect(within(card).getByText(REVIEW_DAY_LABEL)).toBeInTheDocument();
    expect(within(card).getByText('Takrorlash / dam olish')).toBeInTheDocument();
    expect(within(card).getByText(/bajarilish foiziga ta'sir qilmaydi/)).toBeInTheDocument();
    expect(within(card).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(card).toHaveAttribute('data-day-type', 'review');
  });

  it('shows uneven minutes (61 → 31 + 30)', () => {
    const [day] = buildDays({ dailyMinutes: 61 });
    render(<DayCard day={day} onToggle={() => {}} isToday={false} />);
    expect(screen.getByText('61 daqiqa')).toBeInTheDocument();
    expect(screen.getByText('31 daq.')).toBeInTheDocument();
    expect(screen.getByText('30 daq.')).toBeInTheDocument();
  });

  it('ignores toggles of a pending topic and shows "Saqlanmoqda…"', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const [day] = buildDays();
    render(<DayCard day={day} onToggle={onToggle} pendingTopicIds={new Set(['t1'])} isToday={false} />);
    expect(screen.getByText('Saqlanmoqda…')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Mavzu 1/ }));
    expect(onToggle).not.toHaveBeenCalled();
    await user.click(screen.getByRole('checkbox', { name: /Mavzu 2/ }));
    expect(onToggle).toHaveBeenCalledWith('t2', true);
  });

  it('marks unsaved topics', () => {
    const [day] = buildDays();
    render(<DayCard day={day} onToggle={() => {}} unsavedTopicIds={['t2']} isToday={false} />);
    expect(screen.getByText('Saqlanmagan')).toBeInTheDocument();
  });

  it('highlights today', () => {
    const [day] = buildDays();
    render(<DayCard day={day} isToday />);
    expect(screen.getByText('Bugun')).toBeInTheDocument();
  });
});
