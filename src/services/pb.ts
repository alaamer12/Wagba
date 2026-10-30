import PocketBase from "pocketbase";
import { AppError } from "../types/errors";

// The single SDK instance. Nothing outside src/services may import pocketbase —
// enforced by the gate's grep step, per docs/tech/structure.md.

export const PB_URL = import.meta.env.VITE_POCKETBASE_URL ?? "http://127.0.0.1:8090";

export const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

export function fileUrl(record: { collectionId: string; id: string }, name: string): string {
  if (!name) return "";
  return `${PB_URL}/api/files/${record.collectionId}/${record.id}/${name}`;
}

export type SessionModel = { id: string; handle?: string };

/**
 * The only session assertion in the service layer. It throws rather than inventing an
 * empty result, because "you are not signed in" and "there is nothing here" render as
 * different screens and must never share a value.
 */
export function requireSession(): SessionModel {
  const model = pb.authStore.model as SessionModel | null;
  if (!model?.id) throw new AppError("VALIDATION", { reason: "no-session" });
  return model;
}
