/// <reference path="../pb_data/types.d.ts" />

// One-time fill of `meals.cook`.
//
// Before this change `cook` was only ever *written* as `{}` and filled per response by
// `onRecordEnrich`, which cost one `users` SELECT per returned record -- the cause the
// stress report names for the list/search advisories (2000 rows: p95 1837 ms list and
// 1940 ms search against 800/700 ms budgets). The hooks now store the same public subset
// at write time; this migration is the half that covers rows written before that.
//
// A row left at `{}` is not broken -- the enrich fallback still serves it -- but it pays
// two lookups on EVERY read until its next save. This is what makes that fallback
// unreachable for existing data.
//
// It also raises `cook`'s `maxSize`. 2000 was chosen while the field only ever held `{}`
// on write; now it is a real write-time limit, and a cook with an Arabic name and area
// (~400 bytes) plus three pasted social URLs can exceed it -- the publish would fail with
// a generic 400 for a row the old code accepted. The bump is best-effort: the backfill
// matters more than the headroom, so a field that refuses to be re-saved is only warned
// about.
migrate(
  (app) => {
    try {
      const meals = app.findCollectionByNameOrId('meals');
      const field = meals.fields.getByName('cook');
      if (field && field.maxSize < 8000) {
        field.maxSize = 8000;
        app.save(meals);
      }
    } catch (err) {
      console.warn('0004_backfill_cook: could not raise meals.cook maxSize: ' + String(err));
    }

    const collectionId = app.findCollectionByNameOrId('users').id;

    // One read of the users table instead of one per meal. Ids are 15-char alphanumerics,
    // so a Map keeps the lookup exact.
    const users = new Map();
    for (const user of app.findAllRecords('users')) {
      if (user) users.set(user.id, user);
    }

    const pageSize = 200;
    let offset = 0;
    while (true) {
      // `id != ""` is the always-true filter the views recount uses: the list API refuses
      // an empty expression, and "every meal" is the intent anyway. Paged because the
      // whole table need not be in memory at once.
      const page = app.findRecordsByFilter('meals', 'id != ""', 'id', pageSize, offset);
      if (page.length === 0) break;
      offset += page.length;

      for (const meal of page) {
        if (!meal) continue;

        // Skip a row that already carries the full snapshot: this migration can then be
        // re-run without rewriting every row, and a partial snapshot is healed.
        let current = null;
        try {
          const raw = meal.getString('cook');
          if (raw) current = JSON.parse(raw);
        } catch (err) {
          current = null;
        }
        if (current && current.id && current.collectionId) continue;

        const user = users.get(meal.getString('user'));
        if (!user) {
          // Cascade delete should make this impossible; one orphan must not block boot
          // because a failed migration refuses to start the app. The enrich fallback
          // will return `{}` for it.
          console.warn('0004_backfill_cook: meal without a cook, left to the fallback: ' + meal.id);
          continue;
        }

        meal.set('cook', {
          id: user.id,
          collectionId,
          display_name: user.getString('display_name'),
          handle: user.getString('handle'),
          whatsapp: user.getString('whatsapp'),
          location_text: user.getString('location_text'),
          avatar: user.getString('avatar'),
          facebook_url: user.getString('facebook_url'),
          instagram_url: user.getString('instagram_url'),
          tiktok_url: user.getString('tiktok_url'),
        });

        try {
          app.save(meal);
        } catch (err) {
          // Same reason: one invalid legacy row is a fallback case, not a boot failure.
          console.warn('0004_backfill_cook: could not backfill meal ' + meal.id + ': ' + String(err));
        }
      }
    }
  },
  (app) => {
    // The copy is derived. Clear it before putting the 2000-byte limit back, or a later
    // save of a large snapshot would be refused by the restored limit.
    const pageSize = 200;
    let offset = 0;
    while (true) {
      const page = app.findRecordsByFilter('meals', 'id != ""', 'id', pageSize, offset);
      if (page.length === 0) break;
      offset += page.length;
      for (const meal of page) {
        if (!meal) continue;
        meal.set('cook', {});
        try {
          app.save(meal);
        } catch (err) {
          console.warn('0004_backfill_cook: could not clear meal ' + meal.id + ': ' + String(err));
        }
      }
    }

    try {
      const meals = app.findCollectionByNameOrId('meals');
      const field = meals.fields.getByName('cook');
      if (field && field.maxSize > 2000) {
        field.maxSize = 2000;
        app.save(meals);
      }
    } catch (err) {
      console.warn('0004_backfill_cook: could not restore meals.cook maxSize: ' + String(err));
    }
  },
);
