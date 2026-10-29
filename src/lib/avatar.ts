// Deterministic avatar assembly. The face is a function of the handle and a
// version prefix — never stored, never random. See docs/tech/identity.md#avatar.

export type AvatarPick = {
  skin: string;
  hair: string;
  beard: string;
  glasses: string;
  shirt: string;
  backdrop: string;
};

export const PARTS = {
  skin: ["#f4c9a8", "#e9b28d", "#d99a72", "#c07f57", "#8f5a3c"],
  hair: ["short", "wavy", "curly", "long", "bun", "hijab", "bald"],
  beard: ["none", "stubble", "beard"],
  glasses: ["none", "round", "square"],
  shirt: ["#4f7179", "#c76a4a", "#6b8f5e", "#8a6fa8", "#c9a227", "#5a6b8c"],
  backdrop: ["#faf0dd", "#dff0e4", "#dce9f5", "#f8e2d0", "#ece4f6"],
} as const;

export const HAIR_COLOURS = ["#251e19", "#3b312b", "#5b3a24", "#6e6e6e"];

export const AVATAR_VERSION = "v1";

/** 32-bit FNV-1a over UTF-16 code units; stable across platforms. */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Small deterministic PRNG — same seed, same sequence, everywhere. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AXES = ["skin", "hair", "beard", "glasses", "shirt", "backdrop"] as const;

export function pickAvatar(handle: string): AvatarPick {
  const rng = mulberry32(fnv1a32(`${AVATAR_VERSION}:${handle}`));
  const pick: Record<string, string> = {};
  // One draw per axis, in a fixed order: adding a variant to one axis must not
  // shift the others.
  for (const axis of AXES) {
    const list = PARTS[axis] as readonly string[];
    pick[axis] = list[Math.floor(rng() * list.length)] as string;
  }
  // The hijab rule runs after the draws so it never consumes randomness.
  if (pick.hair === "hijab") pick.beard = "none";
  return pick as AvatarPick;
}

export function hairColour(handle: string): string {
  const rng = mulberry32(fnv1a32(`hair:${AVATAR_VERSION}:${handle}`));
  return HAIR_COLOURS[Math.floor(rng() * HAIR_COLOURS.length)] as string;
}
