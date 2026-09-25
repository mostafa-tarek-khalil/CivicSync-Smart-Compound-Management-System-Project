import { buildFilters, isRealFilter } from './filters';

describe('isRealFilter', () => {
  it('treats the ALL sentinel as "no filter" in any casing', () => {
    expect(isRealFilter('ALL')).toBe(false);
    expect(isRealFilter('all')).toBe(false);
    expect(isRealFilter('All')).toBe(false);
  });

  it('treats blank and serialised-null values as "no filter"', () => {
    expect(isRealFilter('')).toBe(false);
    expect(isRealFilter('   ')).toBe(false);
    expect(isRealFilter(undefined)).toBe(false);
    expect(isRealFilter(null)).toBe(false);
    expect(isRealFilter('null')).toBe(false);
    expect(isRealFilter('undefined')).toBe(false);
  });

  it('accepts genuine filter values', () => {
    expect(isRealFilter('OPEN')).toBe(true);
    expect(isRealFilter('RESIDENT')).toBe(true);
    expect(isRealFilter('MALL')).toBe(true);
  });
});

describe('buildFilters', () => {
  it('drops every key that means "everything"', () => {
    expect(
      buildFilters({ status: 'ALL', category: '', priority: undefined })
    ).toEqual({});
  });

  it('keeps only the narrowing values', () => {
    expect(
      buildFilters({ status: 'ALL', category: 'AC', source: 'ALL' })
    ).toEqual({ category: 'AC' });
  });

  it('returns an empty object for an all-empty filter set', () => {
    // Regression guard: an empty params object must reach the API as
    // "no query string", which is what made the ALL option blow up.
    expect(buildFilters({ status: '', role: '', search: '' })).toEqual({});
  });
});