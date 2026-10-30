import { describe, expect, it } from "vitest";
import { BEARD_IDS, GLASSES_IDS, HAIR_IDS, layerMarkup, pickAvatar } from "@/lib/avatar";
import { partLayers, RIG } from "@/lib/avatar-parts";

describe("pickAvatar", () => {
  it("is deterministic for the same handle", () => {
    expect(pickAvatar("mhmadhmd421")).toEqual(pickAvatar("mhmadhmd421"));
  });

  it("gives different handles different faces", () => {
    const keys = ["mhmadhmd421", "saraaebrahym183", "krymfwad907"].map((h) => {
      const p = pickAvatar(h);
      return [p.hair, p.beard, p.glasses, p.skin.skin, p.shirt.shirt, p.backdrop.backdrop].join(
        "|",
      );
    });
    expect(new Set(keys).size).toBe(3);
  });

  it("never draws facial hair under the hijab", () => {
    let checked = 0;
    for (let i = 0; i < 600 && checked < 5; i++) {
      const pick = pickAvatar(`probe-${i}`);
      if (pick.hair === "hijab") {
        expect(pick.beard).toBe("none");
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("only picks ids that exist in the rig", () => {
    const pick = pickAvatar("anyone");
    expect(HAIR_IDS).toContain(pick.hair);
    expect(BEARD_IDS).toContain(pick.beard);
    expect(GLASSES_IDS).toContain(pick.glasses);
    for (const slot of [
      "hair",
      "beard",
      "glasses",
      "backdrop",
      "torso",
      "neck",
      "ears",
      "head",
      "nose",
      "mouth",
      "eyes",
      "brows",
    ]) {
      expect(Object.keys(RIG.parts[slot] ?? {}).length).toBeGreaterThan(0);
    }
  });

  it("assembles one ordered markup per rig layer", () => {
    const layers = layerMarkup(pickAvatar("ordered"));
    expect(layers.length).toBe(RIG.layers.length);
    expect(partLayers("hair", "crop").map((p) => p.layer)).toEqual(["hair_back", "hair_front"]);
  });
});
