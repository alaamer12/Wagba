import { pb } from "./pb";

// The dishes people actually look at. The ranking is the server's seven-day count, not a guess
// from the loaded feed: a chip must survive the viewer scrolling somewhere else.
//
// Titles repeat across cooks ("كشري" is cooked by four people), so duplicates collapse — the chip
// is a dish, not a meal, and tapping it searches the word.
export async function listViralDishes(limit = 4): Promise<string[]> {
  const rows = await pb.collection("meals").getList(1, 40, {
    sort: "-views_7d,-created",
    filter: "views_7d > 0",
    fields: "title",
  });
  const seen: string[] = [];
  for (const row of rows.items) {
    const title = String((row as { title?: string }).title ?? "").trim();
    if (!title) continue;
    if (seen.some((existing) => existing === title)) continue;
    seen.push(title);
    if (seen.length >= limit) break;
  }
  return seen;
}
