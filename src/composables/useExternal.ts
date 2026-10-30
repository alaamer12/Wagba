import { openExternally } from "../shared/behaviour/useExternalOpen";

/** Kept as a named composable so a component asks for "open externally", not for a path. */
export function useExternal() {
  return { open: openExternally };
}
