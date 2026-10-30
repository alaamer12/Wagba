<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import Button from "../ui/adaptive/Button.vue";

// One purposeful function: go back. It used to be an inline <button> inside the header
// wrapper — which made the header a group of things that do not coordinate plus one thing
// that acts — and its label was the literal English string "back".
const router = useRouter();
const { t } = useI18n();
</script>

<template>
  <Button variant="bare" :block="false" class="back" :aria-label="t('common.back')" @click="router.back()">
    <span class="back__glyph" aria-hidden="true">‹</span>
  </Button>
</template>

<style scoped>
/* The seam owns the control's skin. What is left here is where it sits and how big its glyph
   is — the glyph is a plain span, so its type is ours rather than a rule painted onto Button. */
.back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  cursor: pointer;
}
.back__glyph {
  font-family: inherit;
  font-size: 26px;
  line-height: 1;
  padding: 0 6px;
  color: var(--ink);
}
</style>
