// PocketBase hooks. Thin on purpose: derive search_key, store the public cook
// subset on the meal at write time, compute distance for the current request, and
// strip coordinates from every serialized meal.
//
// Two engine facts this file depends on:
//   1. Each hook handler runs in its own isolated scope -- module-level helpers are
//      not visible inside them, so shared code is required per handler.
//   2. `hidden` fields are dropped on write AND blocked from filtering, so they
//      cannot hold coordinates. Coordinates are ordinary fields, zeroed here.
//
// The cook subset is denormalised on `meals.cook`, not rebuilt per response. The old
// enrich-only version ran `findRecordById('users', ...)` once per returned record, so a
// 500-row feed cost 500 lookups -- the latency advisory in artifacts/stress. The copy is
// written by the three hooks below and re-read by the enrich hook, which still owns the
// allow-list (never the writer) and the coordinate zeroing.

onRecordCreateRequest((e) => {
  // Ownership is the create rule's job (`user = @request.auth.id`): PocketBase
  // evaluates it against the submitted record, so the hook never rewrites `user`.
  const fold = require(`${__hooks}/lib/normalize.cjs`);

  // Coordinates cannot be schema-required (PocketBase rejects 0 as blank, and 0 is
  // a real coordinate). The client always sends them for a publish; a record that
  // omits them lands at (0,0), which no Egypt-centred query reaches.
  //
  // A missing cook is refused, not tolerated: an empty catch here used to bake a
  // search_key without the cook's name or handle into the row permanently, so the
  // meal became unfindable by the person who cooked it until its next save.
  let cook;
  try {
    cook = e.app.findRecordById('users', e.record.getString('user'));
  } catch (err) {
    throw new BadRequestError('meal without a cook', { user: 'invalid' });
  }

  e.record.set('search_key', fold.searchKey([
    e.record.getString('title'),
    e.record.getString('description'),
    e.record.getString('location_text'),
    cook.getString('display_name'),
    cook.getString('handle'),
  ]) || 'untitled');
  e.record.set('distance_km', 0);

  // The public cook subset, stored at write time: the enrich hook reads this back
  // instead of looking the cook up once per returned row. Written unconditionally, so
  // a client that submits its own `cook` cannot forge it. The eight public fields are
  // the same allow-list enrich enforces; `id` and `collectionId` are the cook's own, or
  // every avatar URL is built from the meal's ids and 404s.
  e.record.set('cook', {
    id: cook.id,
    collectionId: e.app.findCollectionByNameOrId('users').id,
    display_name: cook.getString('display_name'),
    handle: cook.getString('handle'),
    whatsapp: cook.getString('whatsapp'),
    location_text: cook.getString('location_text'),
    avatar: cook.getString('avatar'),
    facebook_url: cook.getString('facebook_url'),
    instagram_url: cook.getString('instagram_url'),
    tiktok_url: cook.getString('tiktok_url'),
  });
  e.next();
}, 'meals');

onRecordUpdateRequest((e) => {
  const fold = require(`${__hooks}/lib/normalize.cjs`);
  let cook;
  try {
    cook = e.app.findRecordById('users', e.record.getString('user'));
  } catch (err) {
    throw new BadRequestError('meal without a cook', { user: 'invalid' });
  }

  e.record.set('search_key', fold.searchKey([
    e.record.getString('title'),
    e.record.getString('description'),
    e.record.getString('location_text'),
    cook.getString('display_name'),
    cook.getString('handle'),
  ]) || 'untitled');
  e.record.set('distance_km', 0);

  // Same snapshot as create. Rebuilt on every save, which is also what follows a
  // changed `user` (the lookup above reads the record's new owner).
  e.record.set('cook', {
    id: cook.id,
    collectionId: e.app.findCollectionByNameOrId('users').id,
    display_name: cook.getString('display_name'),
    handle: cook.getString('handle'),
    whatsapp: cook.getString('whatsapp'),
    location_text: cook.getString('location_text'),
    avatar: cook.getString('avatar'),
    facebook_url: cook.getString('facebook_url'),
    instagram_url: cook.getString('instagram_url'),
    tiktok_url: cook.getString('tiktok_url'),
  });
  e.next();
}, 'meals');

onRecordUpdateRequest((e) => {
  // The handle is frozen after its first save. The UI disables the field, but a
  // crafted request must be refused too — a shared link depends on it.
  const original = e.record.original();
  const previous = original ? original.getString('handle') : '';
  const next = e.record.getString('handle');
  if (previous && previous !== next) {
    throw new BadRequestError('handle is immutable', { handle: 'immutable' });
  }
  e.next();
}, 'users');

onRecordUpdateRequest((e) => {
  const fold = require(`${__hooks}/lib/normalize.cjs`);
  const original = e.record.original();

  // Both copies are rebuilt here when any field they carry moves: a rename changes the
  // search key and the snapshot's name/handle, and an avatar swap, a new WhatsApp number
  // or an edited social link changes the snapshot alone -- the meal would otherwise show
  // the old filename (404) or the old number forever. An edit to any other users field
  // costs nothing.
  const changed =
    !original ||
    original.getString('display_name') !== e.record.getString('display_name') ||
    original.getString('handle') !== e.record.getString('handle') ||
    original.getString('whatsapp') !== e.record.getString('whatsapp') ||
    original.getString('location_text') !== e.record.getString('location_text') ||
    original.getString('avatar') !== e.record.getString('avatar') ||
    original.getString('facebook_url') !== e.record.getString('facebook_url') ||
    original.getString('instagram_url') !== e.record.getString('instagram_url') ||
    original.getString('tiktok_url') !== e.record.getString('tiktok_url');

  e.next();
  if (!changed) return;

  // Read after `next()`: an uploaded avatar only has its persisted filename once the
  // file field has been processed, and the snapshot must carry that name. Same
  // allow-list as the two meals hooks; the enrich hook re-applies it on every response.
  const cook = {
    id: e.record.id,
    collectionId: e.app.findCollectionByNameOrId('users').id,
    display_name: e.record.getString('display_name'),
    handle: e.record.getString('handle'),
    whatsapp: e.record.getString('whatsapp'),
    location_text: e.record.getString('location_text'),
    avatar: e.record.getString('avatar'),
    facebook_url: e.record.getString('facebook_url'),
    instagram_url: e.record.getString('instagram_url'),
    tiktok_url: e.record.getString('tiktok_url'),
  };

  const meals = e.app.findRecordsByFilter('meals', 'user = {:u}', '', 0, 0, { u: e.record.id });
  for (const meal of meals) {
    meal.set('search_key', fold.searchKey([
      meal.getString('title'),
      meal.getString('description'),
      meal.getString('location_text'),
      cook.display_name,
      cook.handle,
    ]) || 'untitled');
    meal.set('cook', cook);
    e.app.save(meal);
  }
}, 'users');

onRecordEnrich((e) => {
  const fold = require(`${__hooks}/lib/normalize.cjs`);

  const lat = e.record.getFloat('latitude');
  const lng = e.record.getFloat('longitude');
  const q = e.requestInfo ? e.requestInfo.query : null;
  if (q && q.lat && q.lng) {
    const km = fold.distanceKm({ lat: parseFloat(q.lat), lng: parseFloat(q.lng) }, { lat, lng });
    e.record.set('distance_km', Math.round(km * 10) / 10);
  }

  // The subset stored at write time (the create/update hooks above, and the users
  // rebuild). Reading it back is the point: the old code ran `findRecordById('users',
  // ...)` here, once per returned record, so a 500-row feed paid 500 lookups -- the
  // stress report's list/search miss. `getString` because a `json` field surfaces as raw
  // JSON (the engine's own `Record.UnmarshalJSONField` reads it the same way); `get`
  // would hand goja a byte container, not an object.
  let snapshot = null;
  try {
    const raw = e.record.getString('cook');
    if (raw) snapshot = JSON.parse(raw);
  } catch (err) {
    snapshot = null;
  }

  if (!snapshot || !snapshot.id || !snapshot.collectionId) {
    // Fallback ONLY for a row that predates the snapshot (its `cook` is `{}`) or was
    // written by some path that bypasses the request hooks. Cost: two SELECTs for that
    // one row on every read until its next save; `0004_backfill_cook.js` exists so
    // existing data never reaches this branch.
    try {
      const cook = e.app.findRecordById('users', e.record.getString('user'));
      // The eight public fields, chosen here and nowhere else. `id` and `collectionId` are
      // the cook's own — without them a client cannot build a file URL for the cook's avatar
      // and silently requests it under the meal's ids, which 404s for every real avatar.
      // The users collection id is a `pbc_…` hash, and a record loaded through the DAO
      // reports it as null, so it is resolved from the collection itself.
      snapshot = {
        id: cook.id,
        collectionId: e.app.findCollectionByNameOrId('users').id,
        display_name: cook.getString('display_name'),
        handle: cook.getString('handle'),
        whatsapp: cook.getString('whatsapp'),
        location_text: cook.getString('location_text'),
        avatar: cook.getString('avatar'),
        facebook_url: cook.getString('facebook_url'),
        instagram_url: cook.getString('instagram_url'),
        tiktok_url: cook.getString('tiktok_url'),
      };
    } catch (err) {
      snapshot = null;
    }
  }

  if (!snapshot) {
    e.record.set('cook', {});
  } else {
    // Rebuilt from the allow-list rather than passed through: whichever writer produced
    // the row, the response carries these eight public fields plus the cook's own ids,
    // and nothing else that writer might have put there.
    const text = (key) => (typeof snapshot[key] === 'string' ? snapshot[key] : '');
    e.record.set('cook', {
      id: text('id'),
      collectionId: text('collectionId'),
      display_name: text('display_name'),
      handle: text('handle'),
      whatsapp: text('whatsapp'),
      location_text: text('location_text'),
      avatar: text('avatar'),
      facebook_url: text('facebook_url'),
      instagram_url: text('instagram_url'),
      tiktok_url: text('tiktok_url'),
    });
  }

  // Privacy: the real coordinate never leaves the server.
  e.record.set('latitude', 0);
  e.record.set('longitude', 0);

  e.next();
}, 'meals');
