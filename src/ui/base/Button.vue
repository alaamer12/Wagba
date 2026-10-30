<script setup lang="ts">
import { QBtn } from "quasar";

// The platform control, named once. Quasar supplies the behaviour we would otherwise invent —
// press state, keyboard activation, loading/progress, disabled semantics — the skin belongs to
// ui/adaptive, and the focus ring is repaired here: QBtn removes the outline from the node that
// takes focus and draws its ring on an inner helper, which is invisible to a keyboard user who
// is not on the helper and to the accessibility audit, which reads the focused element.
withDefaults(
  defineProps<{
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    loading?: boolean;
    percentage?: number;
  }>(),
  { type: "button", disabled: false, loading: false },
);
</script>

<template>
  <QBtn
    class="seam-btn"
    :type="type"
    :disable="disabled"
    :loading="loading"
    :percentage="percentage"
    no-caps
    unelevated
  >
    <slot />
  </QBtn>
</template>

<style scoped>
/* Quasar ships `.no-outline { outline: 0 !important }` on every QBtn, so an outline cannot be
   restored without an !important of our own. The ring is drawn as a shadow instead: the focused
   node is the one a keyboard user is on, and the one the accessibility audit reads. */
.seam-btn.seam-btn:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
  box-shadow:
    0 0 0 2px var(--surface),
    0 0 0 4px var(--ink);
}
</style>
