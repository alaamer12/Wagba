// PocketBase hooks. Thin on purpose: derive search_key, expose a public cook
// subset, compute distance for the current request, and strip coordinates from
// every serialized meal.
//
// Two engine facts this file depends on:
//   1. Each hook handler runs in its own isolated scope -- module-level helpers are
//      not visible inside them, so shared code is required per handler.
//   2. `hidden` fields are dropped on write AND blocked from filtering, so they
//      cannot hold coordinates. Coordinates are ordinary fields, zeroed here.

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
  e.record.set('cook', {});
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
  e.record.set('cook', {});
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
  const name = e.record.getString('display_name');
  const handle = e.record.getString('handle');
  e.next();
  if (!name && !handle) return;
  const meals = e.app.findRecordsByFilter('meals', 'user = {:u}', '', 0, 0, { u: e.record.id });
  for (const meal of meals) {
    meal.set('search_key', fold.searchKey([
      meal.getString('title'),
      meal.getString('description'),
      meal.getString('location_text'),
      name,
      handle,
    ]) || 'untitled');
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

  try {
    const cook = e.app.findRecordById('users', e.record.getString('user'));
    // The eight public fields, chosen here and nowhere else. `id` and `collectionId` are
    // the cook's own — without them a client cannot build a file URL for the cook's avatar
    // and silently requests it under the meal's ids, which 404s for every real avatar.
    // The users collection id is a `pbc_…` hash, and a record loaded through the DAO
    // reports it as null, so it is resolved from the collection itself.
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
  } catch (err) {
    e.record.set('cook', {});
  }

  // Privacy: the real coordinate never leaves the server.
  e.record.set('latitude', 0);
  e.record.set('longitude', 0);

  e.next();
}, 'meals');
