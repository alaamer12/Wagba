<script setup lang="ts">
import Heading from "../ui/adaptive/Heading.vue";
import Text from "../ui/adaptive/Text.vue";
import NotFoundAction from "./NotFoundAction.vue";

// The 404 body: the words the page cannot say itself (a page composes, it does not paint).
defineProps<{ title: string; body: string; action: string }>();
defineEmits<{ select: [] }>();
</script>

<template>
  <div class="panel">
    <div class="panel__title"><Heading level="2">{{ title }}</Heading></div>
    <div class="panel__body"><Text>{{ body }}</Text></div>
    <NotFoundAction :label="action" @select="$emit('select')" />
  </div>
</template>

<style scoped>
.panel {
  display: contents;
}
/* The wrappers carry the classes; the seam's own heading and paragraph take the type. */
.panel__title h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 400;
  color: var(--brown-mid);
}
.panel__body p {
  margin: 0;
  color: var(--brown-mid);
}
</style>
