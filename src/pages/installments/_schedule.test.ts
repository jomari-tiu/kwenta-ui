import { describe, expect, it } from 'vitest';
import {
  generateSchedule,
  scheduleWasClamped,
  splitCentavos,
} from './_schedule';

/**
 * The executable spec for the shared installment algorithm. The API's
 * test/unit/installments-split.test.ts mirrors these cases — if one side
 * changes, both must.
 */
describe('splitCentavos', () => {
  it('sums to exactly the total for every input in a sweep', () => {
    for (let total = 1; total <= 20_000; total += 37) {
      for (let parts = 1; parts <= 24; parts += 1) {
        if (total < parts) continue;
        const split = splitCentavos(total, parts);
        const label = `total=${total} parts=${parts}`;
        expect(
          split.reduce((a, b) => a + b, 0),
          label,
        ).toBe(total);
        expect(split, label).toHaveLength(parts);
        expect(Math.min(...split), label).toBeGreaterThan(0);

        // Contract: remainder on the LAST payment. Every earlier payment is
        // identical; the last is (total % parts) centavos larger.
        const head = split.slice(0, -1);
        if (head.length > 0) {
          expect(new Set(head).size, label).toBe(1);
          expect(split[split.length - 1] - head[0], label).toBe(total % parts);
        }
      }
    }
  });

  it('puts the remainder on the last payment', () => {
    expect(splitCentavos(1_000_000, 3)).toEqual([333_333, 333_333, 333_334]);
  });

  it('divides evenly when it can', () => {
    expect(splitCentavos(3_000_000, 12)).toEqual(Array(12).fill(250_000));
  });

  it('rejects a total below one centavo per part', () => {
    expect(() => splitCentavos(5, 12)).toThrow(/at least 1 centavo/);
  });
});

describe('generateSchedule', () => {
  it('generates the PHP 30,000 / 12-month / day-15 plan', () => {
    const s = generateSchedule({
      totalCentavos: 3_000_000,
      termMonths: 12,
      startDate: '2026-08-15',
      dayOfMonth: 15,
    });

    expect(s).toHaveLength(12);
    expect(s.reduce((a, p) => a + p.amountCentavos, 0)).toBe(3_000_000);
    expect(s[0]).toEqual({
      sequenceNo: 1,
      dueDate: '2026-08-15',
      amountCentavos: 250_000,
    });
    expect(s[11].dueDate).toBe('2027-07-15');
  });

  it('does NOT drift: day 31 clamps to Feb then RETURNS to Mar 31', () => {
    const s = generateSchedule({
      totalCentavos: 400_000,
      termMonths: 4,
      startDate: '2026-01-31',
      dayOfMonth: 31,
    });
    expect(s.map((p) => p.dueDate)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('clamps to Feb 29 in a leap year', () => {
    const s = generateSchedule({
      totalCentavos: 200_000,
      termMonths: 2,
      startDate: '2028-01-31',
      dayOfMonth: 31,
    });
    expect(s[1].dueDate).toBe('2028-02-29');
  });

  it('crosses a year boundary over 24 months', () => {
    const s = generateSchedule({
      totalCentavos: 2_400_000,
      termMonths: 24,
      startDate: '2026-11-05',
      dayOfMonth: 5,
    });
    expect(s).toHaveLength(24);
    expect(s[13].dueDate).toBe('2027-12-05');
    expect(s[23].dueDate).toBe('2028-10-05');
    expect(s.reduce((a, p) => a + p.amountCentavos, 0)).toBe(2_400_000);
  });

  it('handles a single-month term', () => {
    const s = generateSchedule({
      totalCentavos: 123_456,
      termMonths: 1,
      startDate: '2026-05-09',
      dayOfMonth: 9,
    });
    expect(s).toEqual([
      { sequenceNo: 1, dueDate: '2026-05-09', amountCentavos: 123_456 },
    ]);
  });

  it('sums exactly when the total does not divide by the term', () => {
    const s = generateSchedule({
      totalCentavos: 999_999,
      termMonths: 7,
      startDate: '2026-03-10',
      dayOfMonth: 10,
    });
    expect(s.reduce((a, p) => a + p.amountCentavos, 0)).toBe(999_999);
  });
});

describe('scheduleWasClamped', () => {
  it('detects clamping so the form can say so', () => {
    const clamped = generateSchedule({
      totalCentavos: 400_000,
      termMonths: 4,
      startDate: '2026-01-31',
      dayOfMonth: 31,
    });
    expect(scheduleWasClamped(clamped, 31)).toBe(true);

    const clean = generateSchedule({
      totalCentavos: 400_000,
      termMonths: 4,
      startDate: '2026-01-15',
      dayOfMonth: 15,
    });
    expect(scheduleWasClamped(clean, 15)).toBe(false);
  });
});
