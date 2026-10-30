"""SQLite-level audit of the local PocketBase database.

    python tools/db-audit.py

Reads pb_data/data.db read-only while PocketBase runs (WAL), checks integrity,
indexes and query plans, then asserts the invariants the schema promises:
no orphans, no duplicate handles, no empty search_key, counts that parse.
Exits 1 on any anomaly. Writes artifacts/db-audit.txt.
"""

import os
import sqlite3
import sys

DB = os.path.join("pocketbase", "pb_data", "data.db")
OUT = os.path.join("artifacts", "db-audit.txt")

if not os.path.exists(DB):
    sys.exit(f"database not found: {DB} (run `bun tools/pb.mjs serve` first)")

con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
cur = con.cursor()
lines = []
failures = []


def say(text):
    lines.append(text)
    print(text)


def check(name, ok, detail=""):
    say(f"{'ok  ' if ok else 'FAIL'} {name}{(' — ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


def one(sql, params=()):
    cur.execute(sql, params)
    row = cur.fetchone()
    return row[0] if row else None


journal = one("PRAGMA journal_mode")
check("journal mode is wal", journal == "wal", str(journal))
check("integrity_check", one("PRAGMA integrity_check") == "ok", str(one("PRAGMA integrity_check")))
check("quick_check", one("PRAGMA quick_check") == "ok")

indexes = {row[1] for row in cur.execute("PRAGMA index_list('meals')")}
indexes |= {row[1] for row in cur.execute("PRAGMA index_list('favorites')")}
users_indexes = {row[1] for row in cur.execute("PRAGMA index_list('users')")}
for name in ("idx_meals_geo", "idx_meals_feed", "idx_meals_owner"):
    check(f"index {name}", name in indexes)
check("index idx_favorites_pair", "idx_favorites_pair" in indexes)
check("index idx_users_handle", "idx_users_handle" in users_indexes)

counts = {
    table: one(f"SELECT COUNT(*) FROM {table}")
    for table in ("meals", "users", "favorites")
}
say(f"counts: {counts}")

orphan_meals = one(
    "SELECT COUNT(*) FROM meals WHERE user != '' AND user NOT IN (SELECT id FROM users)"
)
check("no orphan meals", orphan_meals == 0, str(orphan_meals))
orphan_fav_meals = one("SELECT COUNT(*) FROM favorites WHERE meal NOT IN (SELECT id FROM meals)")
check("no favorites pointing at missing meals", orphan_fav_meals == 0, str(orphan_fav_meals))
orphan_fav_users = one("SELECT COUNT(*) FROM favorites WHERE user NOT IN (SELECT id FROM users)")
check("no favorites pointing at missing users", orphan_fav_users == 0, str(orphan_fav_users))

empty_keys = one("SELECT COUNT(*) FROM meals WHERE search_key = '' OR search_key = 'untitled'")
check("every meal has a search_key", empty_keys == 0, str(empty_keys))

bad_keys = one(
    "SELECT COUNT(*) FROM meals WHERE search_key LIKE '%[^a-z0-9 ]%' ESCAPE '\\'"
)
check("search_key alphabet is [a-z0-9 ]", bad_keys == 0, str(bad_keys))

dupe_handles = one(
    "SELECT COUNT(*) FROM (SELECT handle FROM users WHERE handle != '' GROUP BY handle HAVING COUNT(*) > 1)"
)
check("handles are unique when set", dupe_handles == 0, str(dupe_handles))

plans = {
    "bbox feed": "SELECT id FROM meals WHERE status='available' AND latitude BETWEEN 29.9 AND 30.2 AND longitude BETWEEN 31.1 AND 31.4 LIMIT 30",
    "owner list": "SELECT id FROM meals WHERE user='x' ORDER BY created DESC LIMIT 30",
    "search": "SELECT id FROM meals WHERE status='available' AND search_key LIKE '%mhshy%' LIMIT 30",
}
for name, sql in plans.items():
    rows = list(cur.execute(f"EXPLAIN QUERY PLAN {sql}"))
    say(f"plan [{name}]: {rows}")
say(f"page_count: {one('PRAGMA page_count')} · freelist: {one('PRAGMA freelist_count')}")

con.close()
os.makedirs("artifacts", exist_ok=True)
with open(OUT, "w", encoding="utf-8") as fh:
    fh.write("\n".join(lines) + "\n")
print(f"\nwrote {OUT}")

if failures:
    print(f"{len(failures)} audit check(s) failed")
    sys.exit(1)
