import { describe, expect, it } from 'vitest';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

describe('locale catalogs', () => {
  it('have identical key sets', () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  });

  it('never ship an empty string', () => {
    for (const [key, value] of Object.entries(ar)) expect(value.length, key).toBeGreaterThan(0);
    for (const [key, value] of Object.entries(en)) expect(value.length, key).toBeGreaterThan(0);
  });

  it('keep interpolations in both locales', () => {
    for (const key of Object.keys(ar) as Array<keyof typeof ar>) {
      const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
      expect(placeholders(en[key]), key).toBe(placeholders(ar[key]));
    }
  });
});
