import { describe, expect, it } from 'vitest';
import { computeProgress } from '@shared/planner';
import { buildDays } from '@/test/fixtures';
import { findTopic, getCompletedTopicIds, resetDays, setTopicCompletedInDays } from './planDays';

describe('planDays helpers', () => {
  it('setTopicCompletedInDays toggles one topic immutably', () => {
    const days = buildDays();
    const next = setTopicCompletedInDays(days, 't3', true, '2026-10-10T10:00:00.000Z');
    expect(next).not.toBe(days);
    expect(findTopic(next, 't3')).toMatchObject({ completed: true, completedAt: '2026-10-10T10:00:00.000Z' });
    expect(findTopic(days, 't3')?.completed).toBe(false); // original untouched
    expect(next[0]).toBe(days[0]); // untouched days keep identity
    expect(computeProgress(next).percent).toBe(17);
  });

  it('keeps the original completedAt when re-completing and clears it when unchecking', () => {
    const days = buildDays({ completed: ['t1'], completedAt: '2026-10-09T08:00:00.000Z' });
    const again = setTopicCompletedInDays(days, 't1', true, '2026-10-10T10:00:00.000Z');
    expect(findTopic(again, 't1')?.completedAt).toBe('2026-10-09T08:00:00.000Z');
    const cleared = setTopicCompletedInDays(days, 't1', false);
    expect(findTopic(cleared, 't1')).toMatchObject({ completed: false, completedAt: null });
  });

  it('resetDays unchecks everything and getCompletedTopicIds lists completed ids', () => {
    const days = buildDays({ completed: ['t1', 't4', 't6'] });
    expect(getCompletedTopicIds(days)).toEqual(['t1', 't4', 't6']);
    expect(computeProgress(days).percent).toBe(50);
    const reset = resetDays(days);
    expect(getCompletedTopicIds(reset)).toEqual([]);
    expect(computeProgress(reset).percent).toBe(0);
  });
});
