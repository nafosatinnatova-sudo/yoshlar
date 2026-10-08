import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  UZ_MONTHS,
  diffInCalendarDays,
  formatDateRangeUz,
  formatDateTimeUz,
  formatDateUz,
  formatDayMonthUz,
  formatMinutesShortUz,
  formatMinutesUz,
  formatRelativeUz,
  formatShortDateUz,
  roleLabel,
  todayISO,
} from './date';
import { isPathAllowedForRole, roleHome } from './roles';

describe('formatDateUz', () => {
  it('formats "YYYY-MM-DD" as "10-oktabr, 2026"', () => {
    expect(formatDateUz('2026-10-10')).toBe('10-oktabr, 2026');
  });

  it('uses all 12 Uzbek month names', () => {
    expect(UZ_MONTHS).toEqual([
      'yanvar',
      'fevral',
      'mart',
      'aprel',
      'may',
      'iyun',
      'iyul',
      'avgust',
      'sentabr',
      'oktabr',
      'noyabr',
      'dekabr',
    ]);
    UZ_MONTHS.forEach((month, index) => {
      const mm = String(index + 1).padStart(2, '0');
      expect(formatDateUz(`2026-${mm}-01`)).toBe(`1-${month}, 2026`);
    });
  });

  it('does not shift calendar dates across timezones', () => {
    expect(formatDateUz('2026-01-01')).toBe('1-yanvar, 2026');
    expect(formatDateUz('2026-12-31')).toBe('31-dekabr, 2026');
  });

  it('supports withYear: false and the short helpers', () => {
    expect(formatDateUz('2026-10-10', { withYear: false })).toBe('10-oktabr');
    expect(formatDayMonthUz('2026-03-08')).toBe('8-mart');
    expect(formatShortDateUz('2026-10-10')).toBe('10-okt');
  });

  it('handles empty and invalid input', () => {
    expect(formatDateUz(null)).toBe('');
    expect(formatDateUz(undefined)).toBe('');
    expect(formatDateUz('')).toBe('');
    expect(formatDateUz('2026-02-30')).toBe('2026-02-30');
    expect(formatDateUz('not a date')).toBe('not a date');
  });

  it('formats a range', () => {
    expect(formatDateRangeUz('2026-10-10', '2026-10-12')).toBe('10-oktabr, 2026 — 12-oktabr, 2026');
    expect(formatDateRangeUz('2026-10-10', '2026-10-10')).toBe('10-oktabr, 2026');
  });
});

describe('formatDateTimeUz', () => {
  it('formats an ISO timestamp in local time as "10-oktabr, 14:05"', () => {
    const iso = new Date(2026, 9, 10, 14, 5).toISOString();
    expect(formatDateTimeUz(iso)).toBe('10-oktabr, 14:05');
  });

  it('zero-pads hours and minutes', () => {
    const iso = new Date(2026, 0, 2, 9, 7).toISOString();
    expect(formatDateTimeUz(iso)).toBe('2-yanvar, 09:07');
  });

  it('can include the year', () => {
    const iso = new Date(2026, 9, 10, 14, 5).toISOString();
    expect(formatDateTimeUz(iso, { withYear: true })).toBe('10-oktabr, 2026, 14:05');
  });

  it('returns "" for null / invalid', () => {
    expect(formatDateTimeUz(null)).toBe('');
    expect(formatDateTimeUz('garbage')).toBe('');
  });
});

describe('todayISO', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the LOCAL date, not UTC', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 23, 59)); // local 23:59 — may already be the next day in UTC
    expect(todayISO()).toBe('2026-01-05');
    vi.setSystemTime(new Date(2026, 0, 6, 0, 1)); // local 00:01 — may still be the previous day in UTC
    expect(todayISO()).toBe('2026-01-06');
  });

  it('accepts an explicit date', () => {
    expect(todayISO(new Date(2026, 9, 8))).toBe('2026-10-08');
  });
});

describe('relative and misc helpers', () => {
  it('diffInCalendarDays counts calendar days', () => {
    expect(diffInCalendarDays('2026-10-10', '2026-10-12')).toBe(2);
    expect(diffInCalendarDays('2026-10-12', '2026-10-10')).toBe(-2);
    expect(diffInCalendarDays(null, '2026-10-10')).toBeNull();
  });

  it('formatRelativeUz', () => {
    const now = new Date(2026, 9, 10, 15, 0);
    expect(formatRelativeUz(new Date(2026, 9, 10, 14, 59, 40), { now })).toBe('hozirgina');
    expect(formatRelativeUz(new Date(2026, 9, 10, 14, 30), { now })).toBe('30 daqiqa oldin');
    expect(formatRelativeUz(new Date(2026, 9, 10, 9, 5), { now })).toBe('bugun, 09:05');
    expect(formatRelativeUz(new Date(2026, 9, 9, 20, 0), { now })).toBe('kecha, 20:00');
    expect(formatRelativeUz(new Date(2026, 9, 7, 20, 0), { now })).toBe('3 kun oldin');
    expect(formatRelativeUz(new Date(2026, 8, 1, 20, 0), { now })).toBe('1-sentabr, 2026');
    expect(formatRelativeUz(null)).toBe("Faollik yo'q");
  });

  it('formats minutes', () => {
    expect(formatMinutesUz(60)).toBe('60 daqiqa');
    expect(formatMinutesShortUz(30)).toBe('30 daq.');
  });
});

describe('roles', () => {
  it('roleLabel returns Uzbek role names', () => {
    expect(roleLabel('student')).toBe("O'quvchi");
    expect(roleLabel('teacher')).toBe("O'qituvchi");
    expect(roleLabel('admin')).toBe('Administrator');
  });

  it('roleHome maps roles to their home routes', () => {
    expect(roleHome('student')).toBe('/');
    expect(roleHome('teacher')).toBe('/teacher');
    expect(roleHome('admin')).toBe('/admin');
    expect(roleHome(null)).toBe('/login');
  });

  it('isPathAllowedForRole', () => {
    expect(isPathAllowedForRole('student', '/plans/abc')).toBe(true);
    expect(isPathAllowedForRole('student', '/teacher')).toBe(false);
    expect(isPathAllowedForRole('teacher', '/teacher/students/1')).toBe(true);
    expect(isPathAllowedForRole('teacher', '/')).toBe(false);
    expect(isPathAllowedForRole('admin', '/admin')).toBe(true);
    expect(isPathAllowedForRole('admin', '/plans')).toBe(false);
  });
});
