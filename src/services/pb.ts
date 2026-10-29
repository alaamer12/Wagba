import PocketBase from "pocketbase";

// The single SDK instance. Nothing outside src/services may import pocketbase —
// enforced by the gate's grep step, per docs/tech/structure.md.

export const PB_URL = import.meta.env.VITE_POCKETBASE_URL ?? "http://127.0.0.1:8090";

export const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

export function fileUrl(record: { collectionId: string; id: string }, name: string): string {
  if (!name) return "";
  return `${PB_URL}/api/files/${record.collectionId}/${record.id}/${name}`;
}
