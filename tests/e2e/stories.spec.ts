import { expect, type Page, test } from "@playwright/test";

// User stories. These are the definition of done: each test walks a journey a
// person actually takes, not a unit of code. Labels come from the active locale,
// so the same story runs in Arabic and English.

type Labels = Record<
  | "welcomeCta"
  | "name"
  | "whatsapp"
  | "area"
  | "saveProfile"
  | "mealName"
  | "publish"
  | "waCta"
  | "waMissing"
  | "saveMeal"
  | "saved"
  | "hide"
  | "show"
  | "edit"
  | "del"
  | "confirm"
  | "cancel"
  | "all"
  | "share"
  | "about"
  | "terms"
  | "contact"
  | "favorites"
  | "mine"
  | "settings",
  string
>;

const AR: Labels = {
  welcomeCta: "يلا نبدأ",
  name: "الاسم",
  whatsapp: "رقم الواتساب",
  area: "المكان",
  saveProfile: "احفظ ومتابعة",
  mealName: "اسم الوجبة",
  publish: "نشر الوجبة",
  waCta: "كلمه على واتساب",
  waMissing: "الواتساب مش نصبان على الموبايل ده",
  saveMeal: "احفظ في المحفوظة",
  saved: "محفوظة",
  hide: "إخفاء",
  show: "إظهار",
  edit: "تعديل",
  del: "حذف",
  confirm: "أيوه",
  cancel: "لأ",
  all: "الكل",
  share: "مشاركة التطبيق",
  about: "عن وجبة",
  terms: "الشروط والخصوصية",
  contact: "تواصل معنا",
  favorites: "المحفوظة",
  mine: "وجباتي",
  settings: "الإعدادات",
};

const EN: Labels = {
  welcomeCta: "Let's start",
  name: "Name",
  whatsapp: "WhatsApp number",
  area: "Location",
  saveProfile: "Save",
  mealName: "Meal name",
  publish: "Publish",
  waCta: "Message them on WhatsApp",
  waMissing: "WhatsApp is not installed on this device",
  saveMeal: "Save it",
  saved: "Saved",
  hide: "Hide",
  show: "Show",
  edit: "Edit",
  del: "Delete",
  confirm: "Yes",
  cancel: "No",
  all: "All",
  share: "Share the app",
  about: "About Wagba",
  terms: "Terms and privacy",
  contact: "Contact us",
  favorites: "Saved",
  mine: "My meals",
  settings: "Settings",
};

const L = (project: string): Labels => (project === "en" ? EN : AR);

test.describe.configure({ mode: "serial" });
const T = () => L(test.info().project.name);

async function waitForFeed(page: Page) {
  await expect(page.locator('[data-kind="ready"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-kind="ready"] article').first()).toBeVisible({
    timeout: 30_000,
  });
}

async function completeProfile(page: Page, t: Labels, name: string) {
  await page.goto("/#/profile");
  await page.getByLabel(t.name, { exact: false }).fill(name);
  await page.getByLabel(t.whatsapp, { exact: false }).fill("01012345678");
  await page.getByLabel(t.area, { exact: false }).fill("المعادي");
  await page.getByRole("button", { name: t.saveProfile }).click();
  await expect(page).toHaveURL(/#\/(settings|add)/, { timeout: 20_000 });
}

test("S1 buyer browses, opens a meal, and messages the cook on WhatsApp", async ({ page }) => {
  const t = T();
  await page.goto("/#/home");
  await waitForFeed(page);

  const cards = page.locator('[data-kind="ready"] article');
  expect(await cards.count()).toBeGreaterThanOrEqual(5);

  const distance = async (index: number) => {
    const text = ((await cards.nth(index).textContent()) ?? "").replace(/\u200f/g, "");
    const match = text.match(/([\d.]+)\s*(كم|km)/);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  };
  expect(await distance(0)).toBeLessThanOrEqual(await distance(3));

  const title = ((await cards.first().locator("h3").textContent()) ?? "").trim();
  await cards.first().click();
  const cta = page.getByRole("button", { name: t.waCta });
  await expect(cta).toBeVisible({ timeout: 20_000 });

  const [popup] = await Promise.all([page.waitForEvent("popup"), cta.click()]);
  const url = popup.url();
  const decoded = decodeURIComponent(url).replace(/\+/g, " ").replace(/‏/g, "");
  expect(url).toMatch(/^https:\/\/(wa\.me|api\.whatsapp\.com\/send)/);
  expect(decoded).toMatch(/phone=20\d+/);
  expect(decoded).toContain(title);
  await expect(page.getByText(t.waMissing)).toHaveCount(0);
  await popup.close();
});

test("S2 cook completes a profile, publishes, edits, hides, shows and deletes", async ({
  page,
}) => {
  const t = T();
  const name = "نور حسن";
  await completeProfile(page, t, name);

  await page.goto("/#/add");
  const meal = `كفتة ${Date.now()}`;
  await page.getByLabel(t.mealName, { exact: false }).fill(meal);
  await page.locator("#photos").setInputFiles("tests/fixtures/photos/p2.jpg");
  await page.getByLabel(t.area, { exact: false }).fill("المعادي");
  await page.getByRole("button", { name: t.publish }).click();

  await waitForFeed(page);
  await expect(page.getByText(meal).first()).toBeVisible({ timeout: 20_000 });

  // Edit: the meal keeps its identity, the title changes.
  await page.goto("/#/mine");
  const item = page.locator(".item").filter({ hasText: meal });
  await expect(item).toBeVisible({ timeout: 20_000 });
  await item.getByRole("button", { name: t.edit }).click();
  const renamed = `${meal} مشوية`;
  await page.getByLabel(t.mealName, { exact: false }).fill(renamed);
  // The answer is asserted on the record the server wrote, not on the navigation the app
  // chose: an update that resolved with the *old* title still navigated home, and every
  // later assertion then read like a stale cache. Under load that is exactly what happened.
  const saved = page.waitForResponse(
    (res) =>
      /\/api\/collections\/meals\/records\//.test(res.url()) && res.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: t.publish }).click();
  const written = (await (await saved).json()) as { title: string };
  expect(written.title).toBe(renamed);
  await expect(page).toHaveURL(/#\/home/, { timeout: 20_000 });
  await page.goto("/#/mine");
  await expect(page.getByText(renamed).first()).toBeVisible({ timeout: 20_000 });

  // Hide: gone from Home for everyone.
  const renamedItem = page.locator(".item").filter({ hasText: renamed });
  await renamedItem.getByRole("button", { name: t.hide }).click();
  await page.goto("/#/home");
  await page.getByRole("searchbox").fill(renamed);
  await expect(page.locator('[data-kind="empty-filtered"]')).toBeVisible({ timeout: 20_000 });

  // Show, then delete with confirmation.
  await page.goto("/#/mine");
  await renamedItem.getByRole("button", { name: t.show }).click();
  await renamedItem.getByRole("button", { name: t.del }).click();
  await page.getByRole("dialog").getByRole("button", { name: t.confirm }).click();
  await expect(page.getByText(renamed)).toHaveCount(0, { timeout: 20_000 });
});

test("S3 buyer saves a meal, finds it in Favorites, and removes it", async ({ page }) => {
  const t = T();
  await page.goto("/#/home");
  await waitForFeed(page);
  await page.getByRole("searchbox").fill("محشي");
  const title = "محشي بيتي";
  const card = page.locator('[data-kind="ready"] article').filter({ hasText: title }).first();
  await expect(card).toBeVisible({ timeout: 20_000 });
  await card.click();

  const savedResponse = page.waitForResponse(
    (res) =>
      res.url().includes("/api/collections/favorites/records") &&
      res.request().method() === "POST" &&
      res.status() === 200,
  );
  await page.getByRole("button", { name: t.saveMeal }).click();
  await savedResponse;
  await expect(page.getByRole("button", { name: t.saved })).toBeVisible({ timeout: 15_000 });

  await page.goto("/#/favorites");
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });
  await page.getByText(title).first().click();
  const removedResponse = page.waitForResponse(
    (res) =>
      res.url().includes("/api/collections/favorites/records/") &&
      res.request().method() === "DELETE",
  );
  await page.getByRole("button", { name: t.saved }).click();
  await removedResponse;
  await expect(page.getByRole("button", { name: t.saveMeal })).toBeVisible({ timeout: 15_000 });

  await page.goto("/#/favorites");
  await expect(page.getByText(title)).toHaveCount(0, { timeout: 20_000 });
});

test("S4 search works by dish, cook name, handle, area, fold, digits and stopwords", async ({
  page,
}) => {
  await page.goto("/#/home");
  await waitForFeed(page);
  const search = page.getByRole("searchbox");

  const cases: Array<[string, string]> = [
    ["محشي", "محشي"],
    ["كريم", "فراخ"], // cook display name كريم فؤاد
    ["krymfwad907", "فراخ"], // handle
    ["السيدة زينب", "محشي"], // area
    ["السيده زينب", "محشي"], // taa marbuta fold
    ["محشي في السيدة", "محشي"], // stopword in a sentence
    ["٦ أكتوبر", "٦ أكتوبر"], // Arabic-Indic digits
  ];
  for (const [query, expected] of cases) {
    await search.fill(query);
    // Wait for *this* query's answer, not for "some rows are on screen": the previous
    // result set is already visible, so the old assertion was satisfied before the debounced
    // search had even gone out and read back the feed it had replaced.
    await expect(page.locator('[data-kind="ready"]')).toContainText(expected, { timeout: 20_000 });
  }

  await search.fill("zzzz");
  await expect(page.locator('[data-kind="empty-filtered"]')).toBeVisible({ timeout: 20_000 });
});

test("S5 a denied location is explained and retry recovers", async ({ page, context }) => {
  await context.clearPermissions();
  await page.goto("/#/home");
  await expect(page.locator('[data-kind="blocked"]')).toBeVisible({ timeout: 30_000 });

  await context.grantPermissions(["geolocation"]);
  await page.locator('[data-kind="blocked"]').getByRole("button").click();
  await waitForFeed(page);
});

test("S6 offline shows cached meals, and no cache is a fault not an empty", async ({
  page,
  browser,
}) => {
  await page.goto("/#/home");
  await waitForFeed(page);

  await page.route("**/api/collections/meals/**", (route) => route.abort());
  await page.reload();
  await expect(page.locator('[data-kind="stale"]')).toBeVisible({ timeout: 30_000 });
  expect(await page.locator('[data-kind="stale"] article').count()).toBeGreaterThan(0);
  await page.unroute("**/api/collections/meals/**");

  // Fresh context, no cache, API down: fault with a retry, never a silent empty.
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: test.info().project.name === "en" ? "en-US" : "ar-EG",
    permissions: ["geolocation"],
    geolocation: { latitude: 30.0459, longitude: 31.2243 },
  });
  const fresh = await ctx.newPage();
  await fresh.route("**/api/collections/meals/**", (route) => route.abort());
  await fresh.goto("/#/home");
  await expect(fresh.locator('[data-kind="fault"]')).toBeVisible({ timeout: 30_000 });
  await ctx.close();
});

test("S7 the interface flips direction with the language", async ({ page }) => {
  await page.goto("/#/settings");
  await expect(page.locator("h1")).toBeVisible({ timeout: 30_000 });
  const before = await page.locator("html").getAttribute("dir");
  await page.getByRole("button", { name: /اللغة|Language/ }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", before === "rtl" ? "ltr" : "rtl");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("S8 a brand-new user sees a call to action, not an empty account card", async ({ page }) => {
  const t = T();
  await page.goto("/#/settings");
  await expect(page.getByRole("button", { name: t.settings }).first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator(".account")).toHaveCount(0);
  await expect(page.getByText("@", { exact: false })).toHaveCount(0);

  await page.getByRole("button", { name: /أضف أول وجبة|Add your first meal/ }).click();
  await expect(page).toHaveURL(/#\/(add|profile)/, { timeout: 20_000 });

  await completeProfile(page, t, "سلمى محمود");
  await page.goto("/#/settings");
  await expect(page.locator(".account")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".account .avatar-art, .account img")).toBeVisible();
});

test("S9 the legal pages open, and share copies the link", async ({ page, context }) => {
  const t = T();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  });
  await page.goto("/#/settings");
  await expect(page.getByRole("button", { name: t.about })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: t.about }).click();
  await expect(page).toHaveURL(/#\/about/);
  await expect(page.locator("h1")).toBeVisible();
  await page.goBack();

  await page.getByRole("button", { name: t.terms }).click();
  await expect(page).toHaveURL(/#\/terms/);
  await page.goBack();

  await page.getByRole("button", { name: t.contact }).click();
  await expect(page).toHaveURL(/#\/contact/);
  await page.goBack();

  await page.getByRole("button", { name: t.share }).click();
  await expect(page.getByText(/اتنسخ اللينك|Link copied/)).toBeVisible({ timeout: 10_000 });
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip.toLowerCase()).toContain("wagba");
});

test("S10 guardrails: photo count, size, type, and an unusable display name", async ({ page }) => {
  const t = T();
  await completeProfile(page, t, "هالة سمير");

  await page.goto("/#/add");
  const file = "tests/fixtures/photos/p2.jpg";
  await page.locator("#photos").setInputFiles([file, file, file, file, file, file]);
  await expect(page.locator(".error")).toContainText(/خمس صور|five photos/i, { timeout: 15_000 });

  await page.locator("#photos").setInputFiles({
    name: "huge.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(9 * 1024 * 1024, 7),
  });
  await expect(page.locator(".error")).toContainText(/الصورة كبيرة|too large/i, {
    timeout: 15_000,
  });

  await page.getByRole("button", { name: t.publish }).click();
  await expect(page.locator(".error")).toContainText(t.mealName, { timeout: 10_000 });

  await page.goto("/#/profile");
  await page.getByLabel(t.name, { exact: false }).fill("😀😀");
  await page.getByLabel(t.whatsapp, { exact: false }).fill("01012345678");
  await page.getByLabel(t.area, { exact: false }).fill("المعادي");
  await page.getByRole("button", { name: t.saveProfile }).click();
  await expect(page.getByText(/حروف|letters/i)).toBeVisible({ timeout: 15_000 });
});

test("S11 every Settings row does something", async ({ page }) => {
  const t = T();
  await page.goto("/#/settings");
  await expect(page.getByRole("button", { name: t.mine })).toBeVisible({ timeout: 30_000 });

  const targets: Array<[string, RegExp]> = [
    [t.mine, /#\/mine/],
    [t.favorites, /#\/favorites/],
    [t.about, /#\/about/],
    [t.terms, /#\/terms/],
    [t.contact, /#\/contact/],
  ];
  for (const [label, url] of targets) {
    await page.goto("/#/settings");
    await page.getByRole("button", { name: label }).click();
    await expect(page).toHaveURL(url, { timeout: 15_000 });
  }

  await page.goto("/#/settings");
  const before = await page.locator("html").getAttribute("dir");
  await page.getByRole("button", { name: /اللغة|Language/ }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", before === "rtl" ? "ltr" : "rtl");
});
