/// <reference path="../pb_data/types.d.ts" />

// Schema for the MVP. Written against the 0.28.4 `app` API; field constructors and
// option names were checked against the generated pb_data/types.d.ts.
// The `users` collection already exists in PocketBase — this migration extends it
// rather than creating it, so the auth fields stay owned by the engine.

migrate((app) => {
  // --- users: identity only, never content ---------------------------------
  const users = app.findCollectionByNameOrId('users');
  users.listRule = 'id = @request.auth.id';
  users.viewRule = 'id = @request.auth.id';
  users.createRule = ''; // anonymous provisioning (device-generated credentials)
  users.updateRule = 'id = @request.auth.id';
  users.deleteRule = 'id = @request.auth.id';
  // handle and whatsapp are empty until the profile form runs: the account is
  // provisioned anonymously on first launch, before the user has typed anything.
  // The form enforces both; the unique index below only covers chosen handles.
  users.fields.add(
    new TextField({ name: 'display_name', max: 80 }),
    new TextField({ name: 'handle', max: 24 }),
    new TextField({ name: 'whatsapp', max: 20 }),
    new TextField({ name: 'location_text', max: 120 }),
    new FileField({
      name: 'avatar',
      maxSelect: 1,
      maxSize: 2000000,
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    }),
    new URLField({ name: 'facebook_url' }),
    new URLField({ name: 'instagram_url' }),
    new URLField({ name: 'tiktok_url' }),
  );
  users.indexes = [
    ...users.indexes,
    // Partial: many accounts may sit at '' until their owner picks a handle.
    "CREATE UNIQUE INDEX idx_users_handle ON users (handle) WHERE handle != ''",
  ];
  app.save(users);

  const usersId = app.findCollectionByNameOrId('users').id;

  // --- meals ---------------------------------------------------------------
  const meals = new Collection({
    type: 'base',
    name: 'meals',
    listRule: "status = 'available' || user = @request.auth.id",
    viewRule: "status = 'available' || user = @request.auth.id",
    createRule: 'user = @request.auth.id',
    updateRule: 'user = @request.auth.id',
    deleteRule: 'user = @request.auth.id',
    fields: [
      { name: 'user', type: 'relation', required: true, maxSelect: 1, collectionId: usersId, cascadeDelete: true },
      { name: 'title', type: 'text', required: true, max: 80 },
      { name: 'description', type: 'text', max: 600 },
      { name: 'price', type: 'number', min: 0, max: 100000 },
      { name: 'quantity', type: 'number', min: 0, max: 1000, onlyInt: true },
      { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['available', 'unavailable'] },
      { name: 'photos', type: 'file', maxSelect: 5, maxSize: 2000000, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
      { name: 'delivery_option', type: 'select', maxSelect: 1, values: ['pickup', 'delivery'] },
      { name: 'available_time', type: 'text', max: 60 },
      { name: 'location_text', type: 'text', required: true, max: 120 },
      // Not `required`: PocketBase's required check rejects 0, which is a real
      // coordinate on the equator and the prime meridian. The create hook refuses
      // a payload without them instead.
      { name: 'latitude', type: 'number', min: -90, max: 90 },
      { name: 'longitude', type: 'number', min: -180, max: 180 },
      { name: 'search_key', type: 'text', required: true, max: 400 },
      { name: 'distance_km', type: 'number' },
      { name: 'cook', type: 'json', maxSize: 2000 },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: [
      'CREATE INDEX idx_meals_feed ON meals (status, created DESC)',
      'CREATE INDEX idx_meals_geo ON meals (latitude, longitude)',
      'CREATE INDEX idx_meals_owner ON meals (user)',
    ],
  });
  app.save(meals);

  const mealsId = app.findCollectionByNameOrId('meals').id;

  // --- favorites -----------------------------------------------------------
  const favorites = new Collection({
    type: 'base',
    name: 'favorites',
    listRule: 'user = @request.auth.id',
    viewRule: 'user = @request.auth.id',
    createRule: 'user = @request.auth.id',
    updateRule: '', // a favorite is created or deleted, never edited
    deleteRule: 'user = @request.auth.id',
    fields: [
      { name: 'user', type: 'relation', required: true, maxSelect: 1, collectionId: usersId, cascadeDelete: true },
      { name: 'meal', type: 'relation', required: true, maxSelect: 1, collectionId: mealsId, cascadeDelete: true },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_favorites_pair ON favorites (user, meal)'],
  });
  app.save(favorites);
}, (app) => {
  // Teardown: drop the collections this migration created. `users` is engine-owned,
  // so only the fields we added would be removed — deliberately left in place.
  for (const name of ['favorites', 'meals']) {
    try {
      app.delete(app.findCollectionByNameOrId(name));
    } catch (e) {
      /* already gone */
    }
  }
});
