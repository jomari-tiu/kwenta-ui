import { describe, expect, it } from 'vitest';
import {
  centavosToInputString,
  formatPeso,
  formatPeso0,
  formatPesoCompact,
  formatPesoNet,
  formatPesoSigned,
  parsePesoInput,
  sumCentavos,
} from './money';

describe('parsePesoInput', () => {
  it('parses the shapes a user actually types', () => {
    expect(parsePesoInput('1234.50')).toBe(123450);
    expect(parsePesoInput('1,234.5')).toBe(123450);
    expect(parsePesoInput('₱1,234')).toBe(123400);
    expect(parsePesoInput('1234')).toBe(123400);
    expect(parsePesoInput('.5')).toBe(50);
    expect(parsePesoInput('0.01')).toBe(1);
    expect(parsePesoInput('1,000,000')).toBe(100000000);
    expect(parsePesoInput(' 500 ')).toBe(50000);
    expect(parsePesoInput('+250')).toBe(25000);
  });

  it('TRUNCATES a third decimal rather than rounding up', () => {
    // Rounding a centavo up silently is worse than dropping one you cannot
    // spend. 8.165 is also the value that exposes the float-multiply bug:
    // parseFloat('8.165') * 100 === 816.5000000000001
    expect(parsePesoInput('8.169')).toBe(816);
    expect(parsePesoInput('8.165')).toBe(816);
    expect(parsePesoInput('8.161')).toBe(816);
  });

  it('avoids float error across a sweep of two-decimal values', () => {
    for (let c = 0; c <= 2000; c += 1) {
      const s = centavosToInputString(c);
      expect(parsePesoInput(s), `input=${s}`).toBe(c);
    }
  });

  it('returns null for unparseable input', () => {
    expect(parsePesoInput('')).toBeNull();
    expect(parsePesoInput('.')).toBeNull();
    expect(parsePesoInput('-')).toBeNull();
    expect(parsePesoInput('abc')).toBeNull();
    expect(parsePesoInput('12a4')).toBeNull();
    expect(parsePesoInput('1.2.3')).toBeNull();
  });

  it('handles negatives, including the unicode minus', () => {
    expect(parsePesoInput('-5')).toBe(-500);
    expect(parsePesoInput('−5')).toBe(-500);
  });
});

describe('formatPeso', () => {
  it('formats with two decimals and thousands separators', () => {
    expect(formatPeso(123450)).toBe('₱1,234.50');
    expect(formatPeso(0)).toBe('₱0.00');
    expect(formatPeso(1)).toBe('₱0.01');
    expect(formatPeso(100000000)).toBe('₱1,000,000.00');
  });

  it('uses a unicode minus for negatives', () => {
    expect(formatPeso(-34050)).toBe('−₱340.50');
  });
});

describe('formatPeso0', () => {
  it('rounds to whole pesos', () => {
    expect(formatPeso0(123450)).toBe('₱1,235');
    expect(formatPeso0(123449)).toBe('₱1,234');
    expect(formatPeso0(0)).toBe('₱0');
  });
});

describe('formatPesoCompact', () => {
  it('pins the k and M boundaries so chart ticks do not shift', () => {
    expect(formatPesoCompact(99900)).toBe('₱999');
    expect(formatPesoCompact(100000)).toBe('₱1k');
    expect(formatPesoCompact(120000)).toBe('₱1.2k');
    expect(formatPesoCompact(1000000)).toBe('₱10k');
    expect(formatPesoCompact(99999900)).toBe('₱1000k');
    expect(formatPesoCompact(100000000)).toBe('₱1M');
    expect(formatPesoCompact(340000000)).toBe('₱3.4M');
  });
});

describe('formatPesoSigned', () => {
  it('always carries an explicit sign — the CVD fallback', () => {
    expect(formatPesoSigned(120000, 'income')).toBe('+₱1,200.00');
    expect(formatPesoSigned(34000, 'expense')).toBe('−₱340.00');
  });

  it('uses U+2212 MINUS SIGN, not a hyphen', () => {
    expect(formatPesoSigned(100, 'expense').charCodeAt(0)).toBe(0x2212);
  });
});

describe('formatPesoNet', () => {
  it('signs by value and leaves zero unsigned', () => {
    expect(formatPesoNet(5000)).toBe('+₱50.00');
    expect(formatPesoNet(-5000)).toBe('−₱50.00');
    expect(formatPesoNet(0)).toBe('₱0.00');
  });
});

describe('centavosToInputString', () => {
  it('round-trips through parsePesoInput', () => {
    for (const c of [0, 1, 50, 99, 100, 12345, 100000000]) {
      expect(parsePesoInput(centavosToInputString(c))).toBe(c);
    }
  });

  it('always pads to two decimals', () => {
    expect(centavosToInputString(5)).toBe('0.05');
    expect(centavosToInputString(50)).toBe('0.50');
    expect(centavosToInputString(123450)).toBe('1234.50');
  });
});

describe('sumCentavos', () => {
  it('is exact integer addition', () => {
    expect(sumCentavos([1, 2, 3])).toBe(6);
    expect(sumCentavos([])).toBe(0);
    // The classic float failure: 0.1 + 0.2 !== 0.3 in pesos, but 10 + 20 === 30
    // in centavos.
    expect(sumCentavos([10, 20])).toBe(30);
  });
});
