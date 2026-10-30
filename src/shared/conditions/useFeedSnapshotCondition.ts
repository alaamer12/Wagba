import { type FeedSnapshot, loadFeed } from "../../lib/feedCache";

/**
 * What an earlier run left on this device. The snapshot either exists or it does not,
 * whether or not any screen is currently asking — which makes it a Condition: consumers
 * read it, nobody writes it from a view. Writes stay in `lib/feedCache`, driven by a
 * successful load.
 */
export async function readSnapshot(): Promise<FeedSnapshot | null> {
  return loadFeed();
}
