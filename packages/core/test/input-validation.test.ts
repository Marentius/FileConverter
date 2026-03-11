import { parsePositiveInt, parseIntInRange } from '../src/input-validation';

describe('input-validation', () => {
  describe('parsePositiveInt', () => {
    it('should parse a valid positive integer', () => {
      expect(parsePositiveInt('5', 'concurrency')).toBe(5);
    });

    it('should parse "1" correctly', () => {
      expect(parsePositiveInt('1', 'retries')).toBe(1);
    });

    it('should throw on non-numeric input', () => {
      expect(() => parsePositiveInt('abc', 'concurrency'))
        .toThrow(/concurrency must be a positive integer/);
    });

    it('should throw on zero', () => {
      expect(() => parsePositiveInt('0', 'concurrency'))
        .toThrow(/concurrency must be a positive integer/);
    });

    it('should throw on negative numbers', () => {
      expect(() => parsePositiveInt('-3', 'retries'))
        .toThrow(/retries must be a positive integer/);
    });

    it('should throw on floating point numbers', () => {
      expect(() => parsePositiveInt('2.5', 'concurrency'))
        .toThrow(/concurrency must be a positive integer/);
    });

    it('should throw on empty string', () => {
      expect(() => parsePositiveInt('', 'quality'))
        .toThrow(/quality must be a positive integer/);
    });
  });

  describe('parseIntInRange', () => {
    it('should parse a value within range', () => {
      expect(parseIntInRange('50', 'quality', 1, 100)).toBe(50);
    });

    it('should accept the lower bound', () => {
      expect(parseIntInRange('1', 'quality', 1, 100)).toBe(1);
    });

    it('should accept the upper bound', () => {
      expect(parseIntInRange('100', 'quality', 1, 100)).toBe(100);
    });

    it('should throw on value below minimum', () => {
      expect(() => parseIntInRange('0', 'quality', 1, 100))
        .toThrow(/quality must be between 1 and 100/);
    });

    it('should throw on value above maximum', () => {
      expect(() => parseIntInRange('101', 'quality', 1, 100))
        .toThrow(/quality must be between 1 and 100/);
    });

    it('should throw on non-numeric input', () => {
      expect(() => parseIntInRange('high', 'quality', 1, 100))
        .toThrow(/quality must be a valid integer/);
    });
  });
});
