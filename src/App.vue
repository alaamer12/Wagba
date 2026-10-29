<script setup lang="ts">
import { onMounted } from "vue";
import { useNetwork } from "./composables/useNetwork";
import { useSessionStore } from "./stores/session";

const session = useSessionStore();
const network = useNetwork();

onMounted(async () => {
  network.start();
  // Anonymous provisioning happens on first launch; failures surface on the
  // screens that need an account rather than blocking the whole app.
  try {
    await session.boot();
  } catch {
    /* offline first launch — Home will show its fault state */
  }
});
</script>

<template>
  <router-view />
</template>
