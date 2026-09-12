import { describe, expect, it } from 'vitest';
import {
  addHours,
  dayIndexOf,
  fromExifDate,
  hoursBetween,
  naiveToMs,
  sameDay,
  tripLengthDays,
  withinWindow,
} from '../src/time';

describe('naive time helpers', () => {
  it('converts EXIF dates and rejects zeros', () => {
    expect(fromExifDate('2026:09:11 10:42:00')).toBe('2026-09-11T10:42:00');
    expect(fromExifDate('2026-09-11T10:42:00')).toBe('2026-09-11T10:42:00');
    expect(fromExifDate('0000:00:00 00:00:00')).toBeNull();
    expect(fromExifDate(undefined)).toBeNull();
  });
  it('does arithmetic without touching the machine timezone', () => {
    expect(addHours('2026-09-11T23:30:00', 1)).toBe('2026-09-12T00:30:00');
    expect(hoursBetween('2026-09-11T10:00:00', '2026-09-11T12:30:00')).toBe(2.5);
    expect(naiveToMs('1970-01-01T00:00:00')).toBe(0);
  });
  it('windows and days', () => {
    expect(
      withinWindow('2026-09-11T09:15:00', '2026-09-11T10:00:00', '2026-09-11T11:00:00', 2),
    ).toBe(true);
    expect(
      withinWindow('2026-09-11T07:59:00', '2026-09-11T10:00:00', '2026-09-11T11:00:00', 2),
    ).toBe(false);
    expect(sameDay('2026-09-11T23:59:59', '2026-09-11T00:00:00')).toBe(true);
    expect(dayIndexOf('2026-09-11', '2026-09-12T09:20:00')).toBe(2);
    expect(tripLengthDays('2026-09-11', '2026-09-12')).toBe(2);
  });
});
