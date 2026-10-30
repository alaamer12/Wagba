import { expect, type Page, test } from "@playwright/test";

// The account and publish surfaces: the five defects this pass was about, each asserted as the
// DOM text a person reads rather than as a flag inside the app. Labels are matched in both
// locales so one spec runs in the `ar` and the `en` project.
//
// Nothing here forces a region kind through `?state=`: every case is produced by the real fact
// that causes it (a refused request, a typed handle, a second visit), so the ladder decides and
// the screen answers.

const NAME = /الاسم|Name/;
const WHATSAPP = /رقم الواتساب|WhatsApp number/;
const AREA = /المكان|Location/;
const SAVE_PROFILE = /احفظ ومتابعة|Save/;
const PUBLISH = /نشر الوجبة|Publish/;
const MEAL_NAME = /اسم الوجبة|Meal name/;

async function completeProfile(page: Page, name: string) {
  await page.goto("/#/profile");
  await page.getByLabel(NAME).fill(name);
  await page.getByLabel(WHATSAPP).fill("01012345678");
  await page.getByLabel(AREA).fill("المعادي");
  await page.getByRole("button", { name: SAVE_PROFILE }).click();
  await expect(page).toHaveURL(/#\/settings/, { timeout: 20_000 });
}

test("C15 · Welcome is a first launch, not a stop on the way Home", async ({ page }) => {
  await page.goto("/#/welcome");
  await expect(
    page.getByText(/أكل بيتي من ناس حواليك|Home food from people around you/),
  ).toBeVisible({ timeout: 30_000 });

  // The mark is the device's, and it is left the first time the screen is seen.
  expect(await page.evaluate(() => localStorage.getItem("wagba:welcome-seen"))).toBeTruthy();

  await page.goto("/#/welcome");
  await expect(page).toHaveURL(/#\/home/, { timeout: 20_000 });
  await expect(
    page.getByText(/أكل بيتي من ناس حواليك|Home food from people around you/),
  ).toHaveCount(0);
});

test("C15 · a device that refuses storage repeats the screen instead of pretending", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      // Only this key: the anonymous credential and the locale still persist, so the app boots
      // normally and the only thing that fails is remembering the visit.
      if (key === "wagba:welcome-seen") throw new Error("quota exceeded");
      return setItem.call(this, key, value);
    };
  });

  await page.goto("/#/welcome");
  await expect(page.getByText(/يلا نبدأ|Let's start/)).toBeVisible({ timeout: 30_000 });
  await page.goto("/#/home");
  await page.goto("/#/welcome");
  // No redirect: the mark never landed, so the honest answer is that this device has not seen
  // it. A swallowed write would have made this the same as "seen".
  await expect(page.getByText(/يلا نبدأ|Let's start/)).toBeVisible();
});

test("C16 · Profile Setup with a session that never provisioned offers a retry, not a Save", async ({
  page,
}) => {
  await page.route("**/api/collections/users/**", (route) => route.abort());
  await page.goto("/#/profile");

  await expect(page.locator('[data-kind="fault"]')).toBeVisible({ timeout: 30_000 });
  // The form used to render here and offer the button on an account that does not exist.
  await expect(page.getByRole("button", { name: SAVE_PROFILE })).toHaveCount(0);
  await expect(page.getByLabel(NAME)).toHaveCount(0);

  await page.unroute("**/api/collections/users/**");
  await page.locator('[data-kind="fault"]').getByRole("button").click();
  await expect(page.getByLabel(NAME)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-kind="fault"]')).toHaveCount(0);

  // And the retry is not decorative: the account it provisioned can be saved into.
  await completeProfile(page, "سلمى محمود");
});

test("C10 · the publish form answers each field on the field", async ({ page }) => {
  await completeProfile(page, "هالة سمير");
  await page.goto("/#/add");
  await expect(page.getByLabel(MEAL_NAME)).toBeVisible({ timeout: 30_000 });
  // The profile's area prefills the location field, so an untouched form would answer one
  // field, not two. Empty it on purpose: the case being proved is two failures at once, each
  // named where it was typed.
  await page.getByLabel(AREA).fill("");

  await page.getByRole("button", { name: PUBLISH }).click();

  const errors = page.locator(".field__error");
  await expect(errors).toHaveCount(2);
  await expect(errors.nth(0)).toContainText(/اسم الوجبة|Meal name/);
  await expect(errors.nth(1)).toContainText(/المكان|Location/);
  // The one shared line under the form is gone for a field failure.
  await expect(page.locator("p.error")).toHaveCount(0);

  // Correcting one field retires only its own message.
  await page.getByLabel(MEAL_NAME).fill("كفتة");
  await expect(errors).toHaveCount(1);
  await expect(errors.first()).toContainText(/المكان|Location/);

  await page.getByLabel(AREA).fill("المعادي");
  await expect(errors).toHaveCount(0);
});

test("C10 · a count that cannot be a whole number is named where it was typed", async ({
  page,
}) => {
  await completeProfile(page, "منى فؤاد");
  await page.goto("/#/add");
  await page.getByLabel(MEAL_NAME).fill("محشي");
  await page.getByLabel(AREA).fill("المعادي");
  await page.getByLabel(/عدد الوجبات المتاحة|How many you have/).fill("3.5");

  await page.getByRole("button", { name: PUBLISH }).click();
  // The schema stores an integer, so this used to leave the form as a generic refusal.
  await expect(page.locator(".field__error")).toContainText(/رقم صحيح|whole number/, {
    timeout: 10_000,
  });
});

test("F50 · the handle line answers before the press, and never guesses yes", async ({ page }) => {
  await page.goto("/#/profile");
  const handle = page.getByLabel("handle");
  await expect(handle).toBeVisible({ timeout: 30_000 });

  // Reserved is the app's own rule (`identity.md#handle`), so it can be answered on the spot.
  await handle.fill("support");
  await expect(page.getByText(/محجوزة|reserved/i)).toBeVisible({ timeout: 10_000 });
  await expect(handle).toHaveAttribute("aria-invalid", "true");

  // A base too short to be kept is not a handle the person is choosing — the save would build it
  // from the display name instead, and the field says that rather than showing an ignored word.
  await handle.fill("ab");
  await expect(page.getByText(/قصير|Too short/)).toBeVisible({ timeout: 10_000 });
  // A warning about what the save will do is not a refusal, so the field does not read broken.
  await expect(handle).not.toHaveAttribute("aria-invalid");

  // A usable base: the honest answer today is that the app cannot ask. `free` must never appear
  // without a server that answered — that is the lie this line protects.
  await handle.fill("mahmoud");
  await expect(page.getByText(/مقدرناش نتأكد|We can.t check before you save/)).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText(/مش محجوز|not claimed/)).toHaveCount(0);
});

test("C14 · the share row answers each way a share can end", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      value: async () => undefined,
      configurable: true,
    });
  });
  await page.goto("/#/settings");
  await page.getByRole("button", { name: /مشاركة التطبيق|Share the app/ }).click();
  await expect(page.getByText(/اللينك اتبعت|Link shared/)).toBeVisible({ timeout: 10_000 });
});

test("C14 · a share that could not go anywhere says so", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("NotAllowedError")) },
      configurable: true,
    });
  });
  await page.goto("/#/settings");
  await page.getByRole("button", { name: /مشاركة التطبيق|Share the app/ }).click();
  await expect(page.getByText(/مقدرناش نشارك|could not share/i)).toBeVisible({ timeout: 10_000 });
});

test("F51 · the call to action goes where its words say", async ({ page }) => {
  await page.goto("/#/settings");
  await page.getByRole("button", { name: /أضف أول وجبة|Add your first meal/ }).click();

  // The card's own title is «Finish your account first», so the press goes to the account — not
  // to the meal form that bounces straight back here.
  await expect(page).toHaveURL(/#\/profile/, { timeout: 20_000 });
  await expect(page.getByLabel(NAME)).toBeVisible();

  await page.getByLabel(NAME).fill("نور حسن");
  await page.getByLabel(WHATSAPP).fill("01012345678");
  await page.getByLabel(AREA).fill("المعادي");
  await page.getByRole("button", { name: SAVE_PROFILE }).click();

  // The meal the row promised is still the destination — queued behind the account, one hop.
  await expect(page).toHaveURL(/#\/add/, { timeout: 20_000 });
});
