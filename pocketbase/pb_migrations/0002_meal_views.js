/// <reference path="../pb_data/types.d.ts" />

// Meal views: the counting that makes a dish viral (plan §4). Split from `main.pb.js` on purpose —
// a malformed cron expression aborts the whole hooks file, so the one mechanism that can take the
// app down with it lives where it can only take itself down.

migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId('users').id;
    const mealsId = app.findCollectionByNameOrId('meals').id;

    const mealViews = new Collection({
      type: 'base',
      name: 'meal_views',
      // The journal is a browsing history. Nothing a client can do depends on reading it, so
      // there is no rule that would make it readable: empty means superuser-only, and that is
      // asserted by `tools/verify-api.ts` rather than assumed.
      listRule: '',
      viewRule: '',
      createRule: 'user = @request.auth.id',
      deleteRule: '',
      fields: [
        {
          name: 'meal',
          type: 'relation',
          required: true,
          maxSelect: 1,
          collectionId: mealsId,
          cascadeDelete: true,
        },
        {
          name: 'user',
          type: 'relation',
          required: true,
          maxSelect: 1,
          collectionId: usersId,
          cascadeDelete: true,
        },
        // A day key, not a timestamp: "one view per viewer per meal per day" is a statement about
        // the calendar, so the calendar is what the unique index enforces. Africa/Cairo because
        // the product is Egyptian and a UTC day boundary would cut the dinner hour in half.
        { name: 'viewed_on', type: 'text', required: true, max: 10 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_views_once ON meal_views (meal, user, viewed_on)',
        'CREATE INDEX idx_views_recent ON meal_views (viewed_on)',
      ],
    });
    app.save(mealViews);

    // Counts live on the meal: the feed sorts by them and a sort column may not traverse a
    // relation (measured, schema-reference.md §0). `views` is lifetime, `views_7d` is the window
    // the chips rank by, recomputed hourly rather than incremented per read.
    const meals = app.findCollectionByNameOrId('meals');
    meals.fields.add(
      new NumberField({ name: 'views', onlyInt: true, min: 0, max: 100000000 }),
      new NumberField({ name: 'views_7d', onlyInt: true, min: 0, max: 100000000 }),
    );
    meals.indexes = [
      ...meals.indexes,
      'CREATE INDEX idx_meals_viral ON meals (views_7d DESC, created DESC)',
    ];
    app.save(meals);
  },
  (app) => {
    const meals = app.findCollectionByNameOrId('meals');
    meals.fields.remove('views');
    meals.fields.remove('views_7d');
    meals.indexes = meals.indexes.filter((sql) => !sql.includes('idx_meals_viral'));
    app.save(meals);

    const mealViews = app.findCollectionByNameOrId('meal_views');
    app.delete(mealViews);
  },
);
