/// <reference path="../pb_data/types.d.ts" />

// Meal views — the counting behind "the dishes people actually look at".
//
// Its own file because `cronAdd` parses the expression at registration and a malformed one aborts
// the *whole* hooks bundle: a mechanism that can take the app down with it stays where it can only
// take itself down. Measured in the M0 probe.
//
// Each handler below defines its own day key. Goja does not give handlers the file scope (measured:
// a top-level function is `undefined` at call time), so shared helpers must be required or
// redeclared *inside* the handler — the rule is written down in AGENTS.md.

onRecordCreateRequest((e) => {
  // A calendar day, not a timestamp: "at most one view per account per meal per day" is a
  // statement about the date, so the date is what the unique index enforces. Fixed to UTC+2
  // rather than a real Africa/Cairo conversion because the JS VM carries no zone database.
  const dayKey = () =>
    new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // The client sends its own id because a create rule is evaluated against the *submitted*
  // record before hooks run — a hook cannot stamp what the rule has already had to accept.
  e.record.set('viewed_on', dayKey());

  // A cook opening their own meal is not demand. Checked here rather than on a read hook because
  // the journal is write-only from the API: view rules are empty, so no client can reach a view
  // request to refuse.
  const meal = e.app.findRecordById('meals', e.record.getString('meal'));
  if (meal.getString('user') === e.record.getString('user')) {
    throw new BadRequestError('a cook does not view their own meal', { meal: 'self_view' });
  }
  e.next();
}, 'meal_views');

onRecordAfterCreateSuccess((e) => {
  // Reached only when the insert succeeded, which the unique index makes equivalent to "this
  // viewer has not counted this meal today". No double count, and no per-read increment.
  try {
    const meal = e.app.findRecordById('meals', e.record.getString('meal'));
    meal.set('views', meal.getInt('views') + 1);
    e.app.save(meal);
  } catch (err) {
    // The count is a ranking signal, not a promise to the person who opened the meal: a failure
    // here must not turn a successful view into an error response.
    console.log('views: increment failed', String(err));
  }
}, 'meal_views');

cronAdd('views: seven-day recount', '0 * * * *', (e) => {
  const dayKey = (offsetMs) =>
    new Date(Date.now() + (offsetMs === undefined ? 2 * 60 * 60 * 1000 : offsetMs))
      .toISOString()
      .slice(0, 10);

  const windowStart = dayKey(-7 * 24 * 60 * 60 * 1000);
  const counts = new Map();
  const rows = e.app.findRecordsByFilter('meal_views', 'viewed_on >= {:since}', '', 0, 0, {
    since: windowStart,
  });
  for (const row of rows) {
    const id = row.getString('meal');
    counts.set(id, (counts.get(id) || 0) + 1);
  }

  // Recomputed, not incremented: an increment drifts with every cascade delete and cannot be
  // repaired without a recount anyway, so the honest number is the one that is always derived.
  // `id != ""` is a filter that always matches: the list call refuses an empty expression, and
  // spelling out "every meal" is the point anyway.
  const meals = e.app.findRecordsByFilter('meals', 'id != ""', '', 0, 0);
  for (const meal of meals) {
    const next = counts.get(meal.id) || 0;
    if (meal.getInt('views_7d') === next) continue;
    meal.set('views_7d', next);
    e.app.save(meal);
  }
});
