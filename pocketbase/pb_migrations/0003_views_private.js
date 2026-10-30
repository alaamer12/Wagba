/// <reference path="../pb_data/types.d.ts" />

// Lock the views journal. `0002` set its rules to the empty string on the belief that empty meant
// "admins only"; in PocketBase the two states are distinct — `null` is admin-only, `''` is public —
// so the journal was readable by every client. Measured against the live API before this change:
// a member could list their own row, and a guest could list everyone's.
//
// The journal is a browsing history: nothing the product shows depends on reading it back, and the
// one thing it must never do is tell a cook who looked at their meal.
migrate(
  (app) => {
    const views = app.findCollectionByNameOrId('meal_views');
    views.listRule = null;
    views.viewRule = null;
    views.deleteRule = null;
    app.save(views);
  },
  (app) => {
    const views = app.findCollectionByNameOrId('meal_views');
    views.listRule = '';
    views.viewRule = '';
    views.deleteRule = '';
    app.save(views);
  },
);
