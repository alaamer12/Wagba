# Wagba — UI Copy

> The single source of truth for text that appears on screen. Every screen in [../product/screens.md](../product/screens.md) refers to elements abstractly; the literal words live here.

**Status: dialect is an open decision.** The product mandate is Egyptian Arabic; the mockups are largely written in Modern Standard Arabic. That conflict was deliberately deferred, so this file records both candidates per string and marks which is which. Until it is resolved, implement from the Egyptian column and treat the mockup wording as reference. Tracked in [../decisions.md](../decisions.md).

## Copy rules

- **Warm and direct, never cutesy.** A neighbor talking, not a brand account.
- **Second person singular, addressed as "you" (ant, مذكر/masculine-neutral Egyptian form).** Do not use plural address for a single user.
- **Buttons are verbs.** «أضف وجبة», not «إضافة».
- **Errors say what happened and what to do.** Never a code, never a blame.
- **Optional fields are marked in the label**, not only in the placeholder.
- **Numbers stay Latin digits**, including prices and distances.
- **Currency is «جنيه»**, written after the number.
- **Never use the word "user", "content", or "item"** in anything a person reads.

## Welcome

| Element | Egyptian (mandate) | Mockup (MSA) | English gloss |
|---|---|---|---|
| Tagline | أكل بيتي من ناس حواليك | أكل بيتي من ناس حوالَيك | Home food from people around you |
| Primary button | يلا نبدأ | ابدأ | Let's start |

## Home

| Element | Egyptian | Mockup | Gloss |
|---|---|---|---|
| Search placeholder | ادور على وجبة... | ابحث عن وجبة أو منطقة... | Looking for a meal... |
| Section title | وجبات حواليك | وجبات حواليك | Meals around you |
| Empty state, line 1 | لسه مفيش وجبات قريبة منك | لا توجد وجبات حاليًا | No meals near you yet |
| Empty state, line 2 | كن أول واحد ينشر | كن أول من يشارك وجبة لذيذة مع الجميع | Be the first to post |
| Empty state action | أضف وجبة | أضف وجبة | Add a meal |
| No search results | مفيش نتائج للبحث ده | — | Nothing matches that search |
| Card distance | على بُعد {n} كم | — | {n} km away |
| Stale feed banner | دي نتائج من {n} دقيقة — اسحب للتحديث | — | These results are {n} minutes old — pull to refresh |
| New meals banner | في أكل جديد قريب منك — اسحب للتحديث | — | New meals near you — pull to refresh |

## Navigation

| Element | Egyptian | Mockup | Gloss |
|---|---|---|---|
| Meals tab | الوجبات | الوجبات | Meals |
| Add meal | أضيف وجبة | أضيف وجبة | Add a meal |
| Settings tab | الإعدادات | الإعدادات | Settings |

## Meal details

| Element | Egyptian | Mockup | Gloss |
|---|---|---|---|
| Primary CTA | كلمه على واتساب | كلمه على واتساب | Message them on WhatsApp |
| Details heading | تفاصيل إضافية | تفاصيل إضافية | More details |
| Quantity row | الكمية المتاحة: {n} وجبات | الكمية المتاحة: {n} وجبات | Available: {n} meals |
| Availability row | متاح من {time} لحد {time} | متاح يوميا: من 12 ظهرا إلى 10 مساء | Available daily, 12pm to 10pm |
| Pickup row | استلام من {area} | — | Pickup in {area} |
| Delivery row | فيه توصيل | — | Delivery available |
| Cook label | صاحب الوجبة | صاحب الوجبة | The cook |
| Saved | اتحفظت | المحفوظة | Saved |
| Removed while open | الوجبة دي اتشالت | — | This meal is gone |

## Add and edit meal

| Element | Egyptian | Mockup | Gloss |
|---|---|---|---|
| Screen title | أضف وجبة | أضف وجبة | Add a meal |
| Edit title | عدّل الوجبة | — | Edit the meal |
| Photo uploader | أضف صورة الوجبة | أضف صورة الوجبة | Add a photo |
| Photo hint | ممكن صورة واحدة لحد خمس صور | ممكن صورة واحدة أو أكثر | One to five photos |
| Name label | اسم الوجبة | اسم الوجبة | Meal name |
| Name placeholder | مثال: محشي بيتي | مثال: محشي ورق عنب | e.g. homemade mahshi |
| Description label | تفاصيل الوجبة | تفاصيل الوجبة | Meal details |
| Description hint | اختياري | اختياري | Optional |
| Price label | السعر | السعر | Price |
| Price placeholder | مثال: 120 جنيه | مثال: 120 جنيه | e.g. 120 EGP |
| Quantity label | عدد الوجبات المتاحة | — | How many you have |
| Availability label | وقت أو يوم التوفر | — | When it is ready |
| Pickup label | طريقة الاستلام | — | Pickup or delivery |
| Pickup option | استلام بس | — | Pickup only |
| Delivery option | فيه توصيل | — | Delivery available |
| Location label | المكان | المنطقة | Location |
| Location hint | اللي هيشوفوا الوجبة | — | What buyers will see |
| Location placeholder | اكتب المكان زي ما انت عايزه يبان | اختر منطقتك | Write it how you want it shown |
| Publish button | نشر الوجبة | نشر الوجبة | Publish the meal |
| Save edits | احفظ التعديلات | — | Save changes |
| Delete action | حذف الوجبة | — | Delete the meal |
| Delete confirm | متأكد عايز تحذف الوجبة دي؟ | — | Delete this meal? |
| Delete confirm note | مش هينفع ترجعها | — | This cannot be undone |

## Profile

| Element | Egyptian | Mockup | Gloss |
|---|---|---|---|
| Setup title | خلّص حسابك | إنشاء حسابك | Set up your account |
| Setup subtitle | عايزين نعرفك ونعرف الناس عليك | أكمل بياناتك لتظهر للناس اللي حواليك | So people nearby can find you |
| Name label | الاسم | الاسم | Name |
| Name placeholder | مثال: أحمد محمد | مثال: أحمد محمد | e.g. Ahmed Mohamed |
| WhatsApp label | رقم الواتساب | رقم الواتساب | WhatsApp number |
| WhatsApp placeholder | مثال: 010 1234 5678 | مثال: 010 1234 5678 | e.g. 010 1234 5678 |
| Location label | المكان | المنطقة | Location |
| Social heading | روابط التواصل | روابط التواصل الاجتماعي (اختياري) | Social links |
| Save | احفظ ومتابعة | حفظ البيانات | Save |
| Edit from settings | تعديل البيانات | تعديل البيانات | Edit details |

## My meals and favorites

| Element | Egyptian | Mockup | Gloss |
|---|---|---|---|
| Title | وجباتي | وجباتي | My meals |
| Filter all | الكل | الكل | All |
| Filter available | متاحة | متاحة | Available |
| Filter unavailable | مش متاحة | غير متاحة | Not available |
| Badge available | متاحة | متاحة | Available |
| Badge unavailable | مش متاحة | غير متاحة | Not available |
| Empty, line 1 | لسه مفيش وجبات | لم تقم بإضافة أي وجبة بعد | No meals yet |
| Empty, line 2 | أول وجبة ليك ممكن تجيبلك أكل جديد | ابدأ الآن بإضافة وجبتك الأولى | Add your first meal |
| Empty action | إضافة وجبة | إضافة وجبة | Add a meal |
| Favorites title | المحفوظة | المحفوظة | Saved |
| Favorites empty | مفيش وجبات محفوظة لسه | — | Nothing saved yet |
| Meal count | {n} وجبة | {n} وجبة نشرتها | {n} meals |

## Settings

| Element | Egyptian | Mockup | Gloss |
|---|---|---|---|
| Account section | حسابي | حسابي | My account |
| App section | التطبيق | التطبيق | App |
| Notifications row | إشعارات وجبة جديدة | إشعارات وجبة جديدة | New meal alerts |
| Share row | مشاركة التطبيق | مشاركة التطبيق | Share the app |
| Location info row | إعدادات الموقع | إعدادات الموقع | Location settings |
| About section | معلومات | معلومات | Info |
| About Wagba | عن وجبة | عن وجبة | About Wagba |
| Terms row | الشروط والخصوصية | الشروط والخصوصية | Terms and privacy |
| Contact row | تواصل معنا | تواصل معنا | Contact us |
| Rate row | قيّم التطبيق | تقييم التطبيق | Rate the app |
| Version | الإصدار {v} | الإصدار 1.0.0 | Version {v} |

## Errors and permissions

New strings with no mockup or spec source; drafted here because the flows now require them.

| Situation | Egyptian | Gloss |
|---|---|---|
| Location denied, title | وجبة محتاج موقعك | Wagba needs your location |
| Location denied, body | من غيره مش هنعرف نوريك الأكل القريب منك. تقدر تفعّله من إعدادات الموبايل | Without it we cannot show you food near you. You can turn it on in your phone settings |
| Location denied, action | جرّب تاني | Try again |
| Location failed, no permission at all | اسمح بالموقع | Allow location |
| Offline, browsing | انت مش متصل — دي آخر نتائج | You are offline — showing the last results |
| Offline, publishing | محتاج إنترنت تنشر الوجبة | You need a connection to publish |
| Publish failed | الوجبة اتنشرتش. جرّب تاني | The meal was not posted. Try again |
| Photo too large | الصورة كبيرة أوي | That photo is too large |
| Photo limit reached | خمس صور كفاية للوجبة الواحدة | Five photos per meal |
| Required field missing | {field} مطلوب | {field} is required |
| WhatsApp not installed | الواتساب مش نصبان على الموبايل ده | WhatsApp is not installed on this device |

## About

| Element | Egyptian | Mockup | Gloss |
|---|---|---|---|
| Body | وجبة تطبيق بسيط يربط أصحاب الأكل البيتي بالناس اللي حواليهم | وجية هو تطبيق بسيط يربط بين أصحاب الأكل البيتي والمحتاجين لوحدات لذيذة | Wagba connects home cooks with people nearby |
| Value 1 | أكل بيتي حقيقي | أكل بيتي حقيقي | Real home food |
| Value 1 note | من ناس حقيقيين، وأكل بيتي أصلي | من ناس حقيقيين، ومذاق بيتي أصيل | From real people, genuinely homemade |
| Value 2 | قريب منك | قريب منك | Near you |
| Value 2 note | بتدور على الوجبات في منطقتك | ابحث عن الوجبات في منطقتك | Search meals in your area |
| Value 3 | تواصل آمن | تواصل آمن | Safe contact |
| Value 3 note | كلام مباشر مع صاحب الوجبة على واتساب | تواصل عبر واتساب مباشرة | Talk to the cook directly on WhatsApp |

## Open copy items

1. **Dialect.** Egyptian per the product mandate, MSA per the mockups. Deferred; unresolved.
2. **Mockup transcriptions.** Rows sourced from `screens/*.png` were read off images and may carry small errors. Verify against the originals before treating any of them as final.
3. **No English strings exist.** The MVP ships Arabic only. The gloss column is for the team, never for the app.
