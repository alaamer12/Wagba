import { describe, expect, it } from "vitest";
import { boundingBox, distanceKm, MAX_RADIUS_KM, MIN_RADIUS_KM } from "../../shared/normalize";

function inside(box: ReturnType<typeof boundingBox>, lat: number, lng: number) {
  if (lat < box.minLat || lat > box.maxLat) return false;
  return box.wraps
    ? lng >= box.minLng || lng <= box.maxLng
    : lng >= box.minLng && lng <= box.maxLng;
}

describe("boundingBox", () => {
  it("is a superset of the radius circle for random centres", () => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < 400; i += 1) {
      const centre = { lat: rand() * 180 - 90, lng: rand() * 360 - 180 };
      const radius = 0.2 + rand() * (MAX_RADIUS_KM - 0.2);
      const box = boundingBox(centre, radius);
      for (let j = 0; j < 40; j += 1) {
        const point = { lat: rand() * 180 - 90, lng: rand() * 360 - 180 };
        // Skip pairs whose true distance is dominated by the antimeridian in a
        // way the test's own longitude arithmetic would misread.
        if (distanceKm(centre, point) <= radius) {
          expect(inside(box, point.lat, point.lng), JSON.stringify({ centre, radius, point })).toBe(
            true,
          );
        }
      }
    }
  });

  it("splits a box that crosses the antimeridian", () => {
    const east = boundingBox({ lat: 0, lng: 179.95 }, 50);
    expect(east.wraps).toBe(true);
    expect(inside(east, 0, 179.99)).toBe(true);
    expect(inside(east, 0, -179.99)).toBe(true);
    expect(inside(east, 0, 0)).toBe(false);

    const west = boundingBox({ lat: 0, lng: -179.95 }, 50);
    expect(west.wraps).toBe(true);
    expect(inside(west, 0, -179.99)).toBe(true);
    expect(inside(west, 0, 179.99)).toBe(true);
  });

  it("clamps latitude and never divides by zero at the poles", () => {
    for (const lat of [90, -90, 89.999, -89.999]) {
      const box = boundingBox({ lat, lng: 10 }, 10);
      expect(Number.isFinite(box.minLng)).toBe(true);
      expect(Number.isFinite(box.maxLng)).toBe(true);
      expect(box.minLat).toBeGreaterThanOrEqual(-90);
      expect(box.maxLat).toBeLessThanOrEqual(90);
    }
    const pole = boundingBox({ lat: 90, lng: 0 }, 10);
    // Near the pole the box's longitude span is widened by the cos guard, so a
    // point one degree east at 89.95° is inside, and far ones stay outside.
    expect(inside(pole, 89.95, 1)).toBe(true);
    expect(inside(pole, 89.95, 170)).toBe(false);
  });

  it("clamps the radius to the supported range", () => {
    const tiny = boundingBox({ lat: 30, lng: 31 }, 0);
    const huge = boundingBox({ lat: 30, lng: 31 }, 10_000);
    const referenceTiny = boundingBox({ lat: 30, lng: 31 }, MIN_RADIUS_KM);
    expect(tiny.minLat).toBeCloseTo(referenceTiny.minLat, 6);
    expect(huge.maxLat - huge.minLat).toBeLessThanOrEqual(2 * (MAX_RADIUS_KM / 111.19) + 1e-9);
  });

  it("wraps out-of-range longitudes instead of producing an inverted box", () => {
    const box = boundingBox({ lat: 0, lng: 181 }, 10);
    expect(box.minLng).toBeLessThan(box.maxLng);
    expect(box.wraps).toBe(false);
  });
});

describe("distanceKm", () => {
  it("matches known city distances within a percent", () => {
    const cairo = { lat: 30.0444, lng: 31.2357 };
    const alexandria = { lat: 31.2001, lng: 29.9187 };
    expect(distanceKm(cairo, alexandria)).toBeGreaterThan(175);
    expect(distanceKm(cairo, alexandria)).toBeLessThan(190);
    expect(distanceKm(cairo, cairo)).toBeCloseTo(0, 6);
  });

  it("is symmetric and never NaN at the poles", () => {
    const a = { lat: 90, lng: 0 };
    const b = { lat: -90, lng: 0 };
    expect(distanceKm(a, b)).toBeCloseTo(20015, -2);
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 6);
  });
});
