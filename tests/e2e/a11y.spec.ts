import { expect, type Page, test } from "@playwright/test";

// Dependency-free accessibility audit: accessible names, labels, alt text,
// document language/direction, focus visibility, and WCAG contrast for text.
// (axe-core could not be installed while the local scanner blocks bun; the
// checks below cover the failure classes this app can actually produce.)

declare global {
  interface Window {
    __a11yIssues?: string[];
  }
}

async function audit(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const issues: string[] = [];
    const visible = (el: Element) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none"
      );
    };
    const luminance = (rgb: number[]) => {
      const channels = rgb.map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return (
        0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0)
      );
    };
    const parse = (value: string) => {
      const m = value.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const parts = (m[1] ?? "").split(",").map((p) => Number.parseFloat(p));
      return { rgb: parts.slice(0, 3), alpha: parts[3] ?? 1 };
    };
    const background = (el: Element) => {
      let node: Element | null = el;
      while (node) {
        const style = getComputedStyle(node);
        const parsed = parse(style.backgroundColor);
        if (parsed && parsed.alpha > 0.9) return parsed.rgb;
        node = node.parentElement;
      }
      return [255, 255, 255];
    };
    const ratio = (a: number[], b: number[]) => {
      const [high = 0, low = 0] = [luminance(a), luminance(b)].sort((p, q) => q - p);
      return (high + 0.05) / (low + 0.05);
    };

    for (const el of document.querySelectorAll("button, a[href]")) {
      if (!visible(el)) continue;
      const name = (el.getAttribute("aria-label") || el.textContent || "").trim();
      if (!name) issues.push(`unnamed control: <${el.tagName.toLowerCase()}>`);
    }
    for (const img of document.querySelectorAll("img")) {
      if (!img.hasAttribute("alt"))
        issues.push(`image without alt: ${(img.getAttribute("src") ?? "").slice(0, 40)}`);
    }
    for (const input of document.querySelectorAll("input, textarea, select")) {
      if (!visible(input)) continue;
      const id = input.getAttribute("id");
      const labelled =
        (id && document.querySelector(`label[for="${id}"]`)) ||
        input.closest("label") ||
        input.getAttribute("aria-label");
      if (!labelled) issues.push(`unlabelled field: <${input.tagName.toLowerCase()}>`);
    }
    const html = document.documentElement;
    if (!html.getAttribute("lang")) issues.push("document lang missing");
    if (!html.getAttribute("dir")) issues.push("document dir missing");

    const textEls = document.querySelectorAll("p, span, h1, h2, h3, button, a, dt, dd, legend");
    for (const el of textEls) {
      if (!visible(el)) continue;
      if (el.querySelector("p, span, h1, h2, h3")) continue;
      if (el.getAttribute("aria-hidden") === "true") continue;
      const text = (el.textContent ?? "").trim();
      if (!text) continue;
      const style = getComputedStyle(el);
      if (Number.parseFloat(style.opacity) < 0.8) continue;
      if (style.visibility === "hidden") continue;
      const fg = parse(style.color);
      if (!fg) continue;
      const size = Number.parseFloat(style.fontSize);
      const weight = Number.parseInt(style.fontWeight, 10) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const contrast = ratio(fg.rgb, background(el));
      const required = large ? 3 : 4.5;
      if (contrast < required) {
        issues.push(
          `contrast ${contrast.toFixed(2)} < ${required}: "${text.slice(0, 28)}" (${size}px/${weight})`,
        );
      }
    }
    return issues;
  });
}

async function focusAudit(page: Page): Promise<string[]> {
  const issues: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const before = await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 60) ?? "");
    await page.keyboard.press("Tab");
    const after = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      return {
        html: el.outerHTML.slice(0, 60),
        outline: style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0,
        shadow: style.boxShadow !== "none",
      };
    });
    if (!after) continue;
    if (after.html === before) continue;
    if (!after.outline && !after.shadow)
      issues.push(`focus not visible on ${after.html.slice(0, 40)}`);
  }
  return issues;
}

const screens: Array<[string, string]> = [
  ["home", "/#/home"],
  ["settings", "/#/settings"],
  ["about", "/#/about"],
  ["profile", "/#/profile"],
  ["terms", "/#/terms"],
];

for (const [name, url] of screens) {
  test(`a11y: ${name}`, async ({ page }) => {
    await page.goto(url);
    await page.waitForTimeout(2500);
    expect(await audit(page)).toEqual([]);
    expect(await focusAudit(page)).toEqual([]);
  });
}

test("a11y: meal details", async ({ page }) => {
  await page.goto("/#/home");
  await expect(page.locator('[data-kind="ready"] article').first()).toBeVisible({
    timeout: 30_000,
  });
  await page.locator('[data-kind="ready"] article').first().click();
  await expect(page.locator(".hero img").first()).toBeVisible({ timeout: 20_000 });
  expect(await audit(page)).toEqual([]);
});

test("a11y: add meal form", async ({ page }) => {
  await page.goto("/#/home");
  await expect(page.locator("[data-kind]").first()).toBeVisible({ timeout: 30_000 });
  await page.goto("/#/add");
  await page.waitForTimeout(2500);
  expect(await audit(page)).toEqual([]);
});
