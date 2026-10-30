<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

// The end of the painted feed, and the only thing that asks for more of it (`F25`).
//
// It is a marker, not a case: it renders no word and picks no sibling. The View owns the
// window and the sentinel only reports "the end is in view"; whether that means twenty more
// rows or nothing at all is `enabled`, set by the View from `hasMore`. A component that
// decided for itself would be a second authority over what is shown.
//
// `rootMargin` starts the append about one row before the literal bottom, so the next twenty
// are painted while the reader is still looking at rows, not after they hit the floor.
const props = defineProps<{ enabled: boolean }>();
const emit = defineEmits<{ more: [] }>();

const node = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  // A browser without the observer keeps the first page; the feed is still readable and
  // pull-to-refresh still re-reads. Paging is an optimisation of paint, never a gate.
  if (!node.value || typeof IntersectionObserver === "undefined") return;
  observer = new IntersectionObserver(
    (entries) => {
      if (!props.enabled) return;
      if (entries.some((entry) => entry.isIntersecting)) emit("more");
    },
    { rootMargin: "240px 0px" },
  );
  observer.observe(node.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
});
</script>

<template>
  <div ref="node" class="sentinel" :data-more="enabled ? 'true' : 'false'" aria-hidden="true" />
</template>

<style scoped>
.sentinel {
  height: 1px;
}
</style>
