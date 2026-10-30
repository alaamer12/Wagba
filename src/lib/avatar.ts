// Deterministic avatar assembly from the rig in reference/avatar-rig.
// The face is a function of the handle and the version prefix — never stored.
// docs/tech/identity.md#avatar owns the rules; this file implements them.

import { partLayers, RIG } from "./avatar-parts";

export const AVATAR_VERSION = "v1";

export const HAIR_IDS = ["bun", "buzz", "crop", "curly", "hijab", "long", "wavy"] as const;
export const BEARD_IDS = ["none", "stubble", "full"] as const;
export const GLASSES_IDS = ["none", "round", "square"] as const;
export const HAIR_COLOURS = ["#251e19", "#3b312b", "#5b3a24", "#6e6e6e"] as const;

export const SKIN_PALETTES = [
  { skin: "#f6cba8", "skin-shade": "#dda98a", blush: "#e8815e" },
  { skin: "#f3b58c", "skin-shade": "#d9926b", blush: "#e06a45" },
  { skin: "#e79a6f", "skin-shade": "#c97752", blush: "#d95f3a" },
  { skin: "#c98356", "skin-shade": "#a5643c", blush: "#b5542f" },
  { skin: "#8f5a3c", "skin-shade": "#6f4229", blush: "#9c4a2c" },
] as const;

export const SHIRT_PALETTES = [
  { shirt: "#4f7179", "shirt-shade": "#3f5f66" },
  { shirt: "#c76a4a", "shirt-shade": "#a95236" },
  { shirt: "#6b8f5e", "shirt-shade": "#527147" },
  { shirt: "#8a6fa8", "shirt-shade": "#6f568c" },
  { shirt: "#c9a227", "shirt-shade": "#a6841b" },
  { shirt: "#5a6b8c", "shirt-shade": "#46536e" },
] as const;

export const BACKDROP_PALETTES = [
  { backdrop: "#fcd76e", "backdrop-shade": "#f6bf45" },
  { backdrop: "#dff0e4", "backdrop-shade": "#c6e0cd" },
  { backdrop: "#dce9f5", "backdrop-shade": "#c3d6e8" },
  { backdrop: "#f8e2d0", "backdrop-shade": "#ecccb3" },
  { backdrop: "#ece4f6", "backdrop-shade": "#d8ccec" },
] as const;

export type AvatarPick = {
  hair: (typeof HAIR_IDS)[number];
  beard: (typeof BEARD_IDS)[number];
  glasses: (typeof GLASSES_IDS)[number];
  hairColour: string;
  skin: (typeof SKIN_PALETTES)[number];
  shirt: (typeof SHIRT_PALETTES)[number];
  backdrop: (typeof BACKDROP_PALETTES)[number];
};

export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

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

function draw<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)] as T;
}

export function pickAvatar(handle: string): AvatarPick {
  const rng = mulberry32(fnv1a32(`${AVATAR_VERSION}:${handle}`));
  // One draw per axis, fixed order: adding a variant to one axis must not shift
  // the others. The hijab rule runs after the draws for the same reason.
  const hair = draw(rng, HAIR_IDS);
  const beard = draw(rng, BEARD_IDS);
  const glasses = draw(rng, GLASSES_IDS);
  const skin = draw(rng, SKIN_PALETTES);
  const shirt = draw(rng, SHIRT_PALETTES);
  const backdrop = draw(rng, BACKDROP_PALETTES);
  const hairColour = draw(rng, HAIR_COLOURS);
  return {
    hair,
    beard: hair === "hijab" ? "none" : beard,
    glasses,
    hairColour,
    skin,
    shirt,
    backdrop,
  };
}

/** CSS variables the rig parts reference. */
export function paletteVars(pick: AvatarPick): Record<string, string> {
  return {
    "--skin": pick.skin.skin,
    "--skin-shade": pick.skin["skin-shade"],
    "--blush": pick.skin.blush,
    "--hair": pick.hairColour,
    "--hair-light": "#4a3c34",
    "--shirt": pick.shirt.shirt,
    "--shirt-shade": pick.shirt["shirt-shade"],
    "--backdrop": pick.backdrop.backdrop,
    "--backdrop-shade": pick.backdrop["backdrop-shade"],
    "--ink": RIG.palette.ink ?? "#241b17",
    "--lip": RIG.palette.lip ?? "#a24a32",
    "--white": RIG.palette.white ?? "#fffaf2",
  };
}

/** Layer-ordered markup for one avatar. */
export function layerMarkup(pick: AvatarPick): string[] {
  const byLayer: Record<string, string> = {};
  const add = (slot: string, id: string) => {
    for (const part of partLayers(slot, id)) byLayer[part.layer] = part.markup;
  };
  add("backdrop", "flat");
  add("hair", pick.hair);
  add("torso", "tee");
  add("neck", "regular");
  add("ears", "round");
  add("head", "oval");
  add("beard", pick.beard);
  add("nose", "button");
  add("mouth", "smile");
  add("eyes", "round");
  add("brows", "arched");
  add("glasses", pick.glasses);
  return RIG.layers.map((layer) => byLayer[layer]).filter((m): m is string => Boolean(m));
}
