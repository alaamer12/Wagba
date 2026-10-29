import { describe, expect, it } from 'vitest';
import { PARTS, pickAvatar } from '@/lib/avatar';

describe('pickAvatar', () => {
  it('is deterministic for the same handle', () => {
    expect(pickAvatar('mhmadhmd421')).toEqual(pickAvatar('mhmadhmd421'));
  });

  it('gives different handles different faces', () => {
    const a = pickAvatar('mhmadhmd421');
    const b = pickAvatar('saraaebrahym183');
    const c = pickAvatar('krymfwad907');
    const key = (p: typeof a) => Object.values(p).join('|');
    expect(new Set([key(a), key(b), key(c)]).size).toBe(3);
  });

  it('clears facial hair whenever the hijab is drawn', () => {
    // Find a handle that draws the hijab, then assert the invariant on it.
    let checked = 0;
    for (let i = 0; i < 400 && checked < 5; i++) {
      const pick = pickAvatar(`probe-${i}`);
      if (pick.hair === 'hijab') {
        expect(pick.beard).toBe('none');
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('only picks values that exist in the manifest', () => {
    const pick = pickAvatar('anyone');
    for (const [axis, value] of Object.entries(pick)) {
      expect(PARTS[axis as keyof typeof PARTS] as readonly string[]).toContain(value);
    }
  });
});
