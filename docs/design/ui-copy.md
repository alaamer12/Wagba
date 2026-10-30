# Wagba — UI Copy

> The message catalog: one key per string, one entry per locale. Screens in [../product/screens.md](../product/screens.md) refer to elements abstractly; the words live here.

## The model

**UI text is catalogued. User content is not translated.**

- **App strings** — ours. One key, one value per locale, stored in `src/i18n/messages/{locale}.json`. Never a database column, never `label_ar` / `label_en`.
- **Meal titles, descriptions, location text** — the cook's words. One field, stored exactly as typed, shown exactly as typed. No translation, no per-locale variants, no machine translation. A field named `title_ar` would be a bug on sight.

### Locales

| Locale | Status                                    | Direction |
| ------ | ----------------------------------------- | --------- |
| `ar`   | Ships. Primary.                           | RTL       |
| `en`   | Ships. English draft below is unreviewed. | LTR       |

**Fallback chain:** resolved locale → `ar`. An unknown or missing key resolves to Arabic rather than rendering the key, because a key on screen is worse than a wrong-language word. In development, missing keys throw so they are caught before release.

### Dialect: reserved, not built

Dialect is a second dimension on top of language, deferred to a later version. The catalog shape already allows it: keys resolve `dialect-specific → language → ar`, and the dialect tag defaults to `ar` with the intended eventual value `eg`.

Storing `dialect = 'ar'` is knowingly imprecise. It is a placeholder that keeps the shape right, not a claim that Egyptian and MSA are the same thing. When dialects arrive, `eg` and `msa` files appear beside the language files and nothing else changes.

The mockup wording in Modern Standard Arabic is recorded below as a candidate `msa` dialect variant, not as an alternative language.

### Loading

Both locales are bundled at build time. On-demand loading is the documented upgrade path, triggered by either of: more than two locales, or a catalog large enough that the initial payload matters. The trade-off that keeps it deferred is that lazy loading makes the interface depend on a network call — a first launch offline would show unlabelled controls.

### Validation

Message catalogs are flat key-value objects with no nesting and no logic. `en` must have exactly the same key set as `ar`; a parity test in Vitest fails the build when they diverge. That test is the only thing standing between a two-locale app and one locale with holes.

## Rules

- Warm and direct, never cutesy. A neighbor talking, not a brand account.
- Second person singular. Arabic uses the masculine-neutral Egyptian form.
- Buttons are verbs: «أضف وجبة», not «إضافة» / "Add", not "New".
- Errors say what happened and what to do. No codes, no blame.
- Optional fields are marked in the label, not only the placeholder.
- Latin digits for numbers in both locales, including prices and distances.
- Currency is «جنيه» / "EGP", written after the number.
- Interpolate, never concatenate: `t('home.card.distance', { n })`.
- Never use "user", "content", or "item" in anything a person reads.

---

## Welcome

| Key               | ar                     | en (draft)                       | msa (candidate)        |
| ----------------- | ---------------------- | -------------------------------- | ---------------------- |
| `welcome.tagline` | أكل بيتي من ناس حواليك | Home food from people around you | أكل بيتي من ناس حوالَيك |
| `welcome.cta`     | يلا نبدأ                | Let's start                      | ابدأ                   |

## Home

| Key                       | ar                                   | en (draft)                                          | msa (candidate)                      |
| ------------------------- | ------------------------------------ | --------------------------------------------------- | ------------------------------------ |
| `home.search.placeholder` | ادور على وجبة...                     | Looking for a meal...                               | ابحث عن وجبة أو منطقة...             |
| `home.search.open`        | بحث                                  | Search                                              | بحث                                  |
| `home.chips.label`        | اقتراحات بحث                         | Search suggestions                                  | اقتراحات البحث                       |
| `home.chips.nearby`       | قريب                                 | Nearby                                              | قريب                                 |
| `home.section.title`      | وجبات حواليك                         | Meals around you                                    | وجبات حواليك                         |
| `home.empty.title`        | لسه مفيش وجبات قريبة منك             | No meals near you yet                               | لا توجد وجبات حاليًا                   |
| `home.empty.body`         | كن أول واحد ينشر                     | Be the first to post                                | كن أول من يشارك وجبة لذيذة مع الجميع |
| `home.empty.cta`          | أضف وجبة                             | Add a meal                                          | أضف وجبة                             |
| `home.search.empty`       | مفيش نتائج للبحث ده                  | Nothing matches that search                         | —                                    |
| `home.card.distance`      | على بُعد {n} كم                       | {n} km away                                         | —                                    |
| `home.banner.stale`       | دي نتائج من {n} دقيقة — اسحب للتحديث | These results are {n} minutes old — pull to refresh | —                                    |
| `home.banner.new`         | في أكل جديد قريب منك — اسحب للتحديث  | New meals near you — pull to refresh                | —                                    |
| `home.card.saved`         | محفوظة                               | Saved                                               | المحفوظة                             |

The suggestion chips are «قريب» plus three dish words — محشي، فراخ، كشري — that are search terms for Arabic meal names, not interface copy, so they stay Arabic in both locales. Governorate names from the mockup are not matching keys (discovery is numeric) and are not shipped.

## Navigation

| Key            | ar        | en (draft) | msa (candidate) |
| -------------- | --------- | ---------- | --------------- |
| `nav.meals`    | الوجبات   | Meals      | الوجبات         |
| `nav.add`      | أضيف وجبة | Add a meal | أضيف وجبة       |
| `nav.settings` | الإعدادات  | Settings   | الإعدادات        |

## Meal details

| Key                    | ar                        | en (draft)               | msa (candidate)                    |
| ---------------------- | ------------------------- | ------------------------ | ---------------------------------- |
| `meal.cta.whatsapp`    | كلمه على واتساب           | Message them on WhatsApp | كلمه على واتساب                    |
| `meal.details.heading` | تفاصيل إضافية             | More details             | تفاصيل إضافية                      |
| `meal.quantity`        | الكمية المتاحة: {n} وجبات | {n} available            | الكمية المتاحة: {n} وجبات          |
| `meal.availability`    | متاح من {from} لحد {to}   | Available {from} to {to} | متاح يوميا: من 12 ظهرا إلى 10 مساء |
| `meal.pickup`          | استلام من {area}           | Pickup in {area}         | —                                  |
| `meal.delivery`        | فيه توصيل                 | Delivery available       | —                                  |
| `meal.cook.label`      | صاحب الوجبة               | The cook                 | صاحب الوجبة                        |
| `meal.gone`            | الوجبة دي اتشالت          | This meal is gone        | —                                  |
| `avatar.alt`           | صورة رمزية                | Profile picture          | —                                  |

## Add and edit meal

| Key                        | ar                               | en (draft)                     | msa (candidate)         |
| -------------------------- | -------------------------------- | ------------------------------ | ----------------------- |
| `add.title`                | أضف وجبة                         | Add a meal                     | أضف وجبة                |
| `edit.title`               | عدّل الوجبة                       | Edit the meal                  | —                       |
| `add.photos.title`         | أضف صورة الوجبة                  | Add a photo                    | أضف صورة الوجبة         |
| `add.photos.hint`          | ممكن صورة واحدة لحد خمس صور      | One to five photos             | ممكن صورة واحدة أو أكثر |
| `add.name.label`           | اسم الوجبة                       | Meal name                      | اسم الوجبة              |
| `add.name.placeholder`     | مثال: محشي بيتي                  | e.g. homemade mahshi           | مثال: محشي ورق عنب      |
| `add.description.label`    | تفاصيل الوجبة                    | Meal details                   | تفاصيل الوجبة           |
| `add.description.optional` | اختياري                          | Optional                       | اختياري                 |
| `add.price.label`          | السعر                            | Price                          | السعر                   |
| `add.price.placeholder`    | مثال: 120 جنيه                   | e.g. 120 EGP                   | مثال: 120 جنيه          |
| `add.quantity.label`       | عدد الوجبات المتاحة              | How many you have              | —                       |
| `add.availability.label`   | وقت أو يوم التوفر                | When it is ready               | —                       |
| `add.delivery.label`       | طريقة الاستلام                     | Pickup or delivery             | —                       |
| `add.delivery.pickup`      | استلام بس                         | Pickup only                    | —                       |
| `add.delivery.available`   | فيه توصيل                        | Delivery available             | —                       |
| `add.location.label`       | المكان                           | Location                       | المنطقة                 |
| `add.location.hint`        | اللي هيشوفوا الوجبة              | What buyers will see           | —                       |
| `add.location.placeholder` | اكتب المكان زي ما انت عايزه يبان | Write it how you want it shown | اختر منطقتك             |
| `add.publish`              | نشر الوجبة                       | Publish                        | نشر الوجبة              |
| `edit.save`                | احفظ التعديلات                    | Save changes                   | —                       |
| `edit.delete`              | حذف الوجبة                       | Delete                         | —                       |
| `edit.delete.confirm`      | متأكد عايز تحذف الوجبة دي؟       | Delete this meal?              | —                       |
| `edit.delete.note`         | مش هينفع ترجعها                  | This cannot be undone          | —                       |

## Profile

| Key                            | ar                                                         | en (draft)                                                                 | msa (candidate)                      |
| ------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------ |
| `profile.title`                | خلّص حسابك                                                  | Set up your account                                                        | إنشاء حسابك                          |
| `profile.subtitle`             | عايزين نعرفك ونعرف الناس عليك                              | So people nearby can find you                                              | أكمل بياناتك لتظهر للناس اللي حواليك |
| `profile.name.label`           | الاسم                                                       | Name                                                                       | الاسم                                 |
| `profile.name.placeholder`     | مثال: أحمد محمد                                            | e.g. Ahmed Mohamed                                                         | مثال: أحمد محمد                      |
| `profile.whatsapp.label`       | رقم الواتساب                                               | WhatsApp number                                                            | رقم الواتساب                         |
| `profile.whatsapp.placeholder` | مثال: 010 1234 5678                                        | e.g. 010 1234 5678                                                         | مثال: 010 1234 5678                  |
| `profile.location.label`       | المكان                                                     | Location                                                                   | المنطقة                              |
| `profile.social.heading`       | روابط التواصل                                              | Social links                                                               | روابط التواصل الاجتماعي (اختياري)     |
| `profile.displayName.label`    | الاسم                                                       | Name                                                                       | الاسم                                 |
| `profile.handle.label`         | اسم المستخدم                                               | Username                                                                   | —                                    |
| `profile.handle.hint`          | بنعمله من اسمك — مش هينفع تغيره بعد كده                    | Made from your name. It can't be changed later                             | —                                    |
| `profile.handle.frozen`        | الاسم ده ثابت                                               | This is permanent                                                          | —                                    |
| `profile.avatar.hint`          | الصورة اتولدت من اسم المستخدم. تقدر تحط صورة من عندك بعدين | Generated from your username. You can replace it with your own photo later | —                                    |
| `profile.save`                 | احفظ ومتابعة                                               | Save                                                                       | حفظ البيانات                         |
| `profile.edit`                 | تعديل البيانات                                             | Edit details                                                               | تعديل البيانات                       |

## My meals and favorites

| Key                          | ar                                | en (draft)                                | msa (candidate)             |
| ---------------------------- | --------------------------------- | ----------------------------------------- | --------------------------- |
| `myMeals.title`              | وجباتي                            | My meals                                  | وجباتي                      |
| `myMeals.filter.all`         | الكل                              | All                                       | الكل                        |
| `myMeals.filter.available`   | متاحة                             | Available                                 | متاحة                       |
| `myMeals.filter.unavailable` | مش متاحة                          | Not available                             | غير متاحة                   |
| `myMeals.badge.available`    | متاحة                             | Available                                 | متاحة                       |
| `myMeals.badge.unavailable`  | مش متاحة                          | Not available                             | غير متاحة                   |
| `myMeals.empty.title`        | لسه مفيش وجبات                    | No meals yet                              | لم تقم بإضافة أي وجبة بعد   |
| `myMeals.empty.body`         | أول وجبة ليك ممكن تجيبلك أكل جديد | Your first meal is the one that gets seen | ابدأ الآن بإضافة وجبتك الأولى |
| `myMeals.empty.cta`          | إضافة وجبة                        | Add a meal                                | إضافة وجبة                  |
| `myMeals.count`              | {n} وجبة                          | {n} meals                                 | {n} وجبة نشرتها             |
| `favorites.title`            | المحفوظة                          | Saved                                     | المحفوظة                    |
| `favorites.empty`            | مفيش وجبات محفوظة لسه             | Nothing saved yet                         | —                           |

## Settings

| Key                        | ar                 | en (draft)        | msa (candidate)    |
| -------------------------- | ------------------ | ----------------- | ------------------ |
| `settings.account.section` | حسابي              | My account        | حسابي              |
| `settings.app.section`     | التطبيق            | App               | التطبيق            |
| `settings.notifications`   | إشعارات وجبة جديدة | New meal alerts   | إشعارات وجبة جديدة |
| `settings.share`           | مشاركة التطبيق     | Share the app     | مشاركة التطبيق     |
| `settings.location`        | إعدادات الموقع     | Location settings | إعدادات الموقع     |
| `settings.info.section`    | معلومات            | Info              | معلومات            |
| `settings.about`           | عن وجبة            | About Wagba       | عن وجبة            |
| `settings.terms`           | الشروط والخصوصية   | Terms and privacy | الشروط والخصوصية   |
| `settings.contact`         | تواصل معنا         | Contact us        | تواصل معنا         |
| `settings.rate`            | قيّم التطبيق        | Rate the app      | تقييم التطبيق      |
| `settings.version`         | الإصدار {v}         | Version {v}       | الإصدار 1.0.0       |
| `settings.language`        | اللغة              | Language          | —                  |

## Errors and permissions

No mockup or spec source; drafted here because the flows require them.

| Key                         | ar                                                                     | en (draft)                                                                             |
| --------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `error.location.title`      | وجبة محتاج موقعك                                                       | Wagba needs your location                                                              |
| `error.location.body`       | من غيره مش هنعرف نوريك الأكل القريب منك. تقدر تفعّله من إعدادات الموبايل | Without it we cannot show you food near you. You can turn it on in your phone settings |
| `error.location.retry`      | جرّب تاني                                                               | Try again                                                                              |
| `error.location.allow`      | اسمح بالموقع                                                           | Allow location                                                                         |
| `error.offline.browsing`    | انت مش متصل — دي آخر نتائج                                             | You are offline — showing the last results                                             |
| `error.offline.publish`     | محتاج إنترنت تنشر الوجبة                                               | You need a connection to publish                                                       |
| `error.publish.failed`      | الوجبة اتنشرتش. جرّب تاني                                               | The meal was not posted. Try again                                                     |
| `error.photo.tooLarge`      | الصورة كبيرة أوي                                                       | That photo is too large                                                                |
| `error.photo.limit`         | خمس صور كفاية للوجبة الواحدة                                           | Five photos per meal                                                                   |
| `error.field.required`      | {field} مطلوب                                                          | {field} is required                                                                    |
| `error.displayName.letters` | اكتب اسم فيه حروف                                                      | Use a name with letters                                                                |
| `error.handle.taken`        | الاسم ده متاخد، جرب غيره                                                | That username is taken, try another                                                    |
| `error.whatsapp.missing`    | الواتساب مش نصبان على الموبايل ده                                      | WhatsApp is not installed on this device                                               |

## About

| Key                  | ar                                                         | en (draft)                                            | msa (candidate)                                                       |
| -------------------- | ---------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------- |
| `about.body`         | وجبة تطبيق بسيط يربط أصحاب الأكل البيتي بالناس اللي حواليهم | Wagba connects home cooks with the people around them | وجبة هو تطبيق بسيط يربط بين أصحاب الأكل البيتي والمحتاجين لوحدات لذيذة |
| `about.value1.title` | أكل بيتي حقيقي                                             | Real home food                                        | أكل بيتي حقيقي                                                        |
| `about.value1.body`  | من ناس حقيقيين، وأكل بيتي أصلي                             | From real people, genuinely homemade                  | من ناس حقيقيين، ومذاق بيتي أصيل                                       |
| `about.value2.title` | قريب منك                                                   | Near you                                              | قريب منك                                                              |
| `about.value2.body`  | بتدور على الوجبات في منطقتك                                | Find meals in your area                               | ابحث عن الوجبات في منطقتك                                             |
| `about.value3.title` | تواصل آمن                                                  | Safe contact                                          | تواصل آمن                                                             |
| `about.value3.body`  | كلام مباشر مع صاحب الوجبة على واتساب                        | Talk to the cook directly on WhatsApp                 | تواصل عبر واتساب مباشرة                                               |

## Open items

1. **English is unreviewed.** Every `en` cell is a first draft for a native reviewer, not approved copy.
2. **Dialect.** Deferred. The `msa` column is recorded as a candidate variant, and `dialect` stores `ar` until `eg` exists. See [../decisions.md](../decisions.md#dialect-is-a-reserved-dimension).
3. **Mockup transcriptions.** Rows sourced from `mockups/*.png` were read off images and may carry small errors, including at least one typo in the original («أبدأ» where the imperative is «ابدأ»).
