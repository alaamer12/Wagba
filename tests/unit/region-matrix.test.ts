import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { KINDS, SCREENS } from "../e2e/region-matrix";

// The applicability matrix is data, so it can be checked for shape without a browser: every
// screen must classify every kind exactly once, and no cell may point at a journey that has been
// renamed away. A matrix that quietly stops matching the specs is worse than no matrix.

const stories = readFileSync(join(import.meta.dirname, "../e2e/stories.spec.ts"), "utf8");

describe("the region applicability matrix", () => {
  it.each(SCREENS.map((s) => [s.name, s] as const))(
    "%s classifies every kind exactly once",
    (_, screen) => {
      const seen = screen.cells.map((c) => c.kind);
      expect([...seen].sort()).toEqual([...KINDS].sort());
      expect(new Set(seen).size).toBe(KINDS.length);
    },
  );

  it("requires a screen to have a real blocked case only where a position is needed", () => {
    const needsPosition = SCREENS.filter((s) => s.route.includes("home"));
    for (const screen of needsPosition) {
      expect(screen.cells.find((c) => c.kind === "blocked")?.outcome).toBe("case");
    }
    for (const screen of SCREENS.filter((s) => !s.route.includes("home"))) {
      expect(screen.cells.find((c) => c.kind === "blocked")?.outcome).toBe("fallback");
    }
  });

  it("points every data cell at a journey that still exists", () => {
    for (const screen of SCREENS) {
      for (const c of screen.cells) {
        if (c.outcome !== "data") continue;
        expect(c.coveredBy, `${screen.name}/${c.kind} has no covering journey`).toBeTruthy();
        expect(stories, `S${c.coveredBy} is gone from stories.spec.ts`).toContain(
          `${c.coveredBy} `,
        );
      }
    }
  });

  it("keeps no screen claiming a case it cannot reach", () => {
    // `unknown` is the fallback by definition, and no read-only screen may own a `submitting`
    // case — those were the two cells the plan found photographed as designed states.
    for (const screen of SCREENS) {
      expect(screen.cells.find((c) => c.kind === "unknown")?.outcome).toBe("fallback");
      expect(screen.cells.find((c) => c.kind === "submitting")?.outcome).not.toBe("case");
    }
  });

  // C17: the matrix used to cover four screens, which let a screen present a kind it had no case
  // for — or no region at all — go unmentioned. The scope is pinned here, so adding a screen to
  // the app means classifying it rather than silently widening the gap.
  it("classifies every screen the app routes to", () => {
    expect(SCREENS.map((s) => s.name).sort()).toEqual([
      "favorites",
      "home",
      "meal",
      "my meals",
      "profile",
      "settings",
      "welcome",
    ]);
  });

  it("gives a screen without a ladder no case to force, and a landmark to prove it painted", () => {
    for (const screen of SCREENS) {
      if (screen.region) {
        expect(
          screen.cells.some((c) => c.outcome === "case"),
          `${screen.name} has a region but no case`,
        ).toBe(true);
        continue;
      }
      // No ladder means every kind is a fallback by absence — a `case` or `data` here would
      // claim a display that does not exist, which is the C1 mistake one screen over.
      expect(screen.cells.every((c) => c.outcome === "fallback")).toBe(true);
      expect(screen.landmark, `${screen.name} has nothing to prove it rendered`).toBeTruthy();
      expect(screen.shots, `${screen.name} has no case, so there is nothing to photograph`).toBe(
        false,
      );
    }
  });
});
