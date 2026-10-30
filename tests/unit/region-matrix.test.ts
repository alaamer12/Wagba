import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Kind } from "@/lib/region";
import { SCREENS } from "../e2e/region-matrix";

// The applicability matrix is data, so it can be checked for shape without a browser: every
// screen must classify every kind exactly once, and no cell may point at a journey that has been
// renamed away. A matrix that quietly stops matching the specs is worse than no matrix.

const KINDS: Kind[] = [
  "blocked",
  "submitting",
  "rejected",
  "loading",
  "stale",
  "fault",
  "empty",
  "empty-filtered",
  "ready",
  "unknown",
];

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
});
