import { OfficeAdapter } from '../src';

describe('public API', () => {
  it('exports OfficeAdapter', () => {
    const adapter = new OfficeAdapter();

    expect(adapter.name).toBe('office');
  });
});
