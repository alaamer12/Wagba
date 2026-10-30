<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { startNetworkCondition } from "./shared/conditions/useNetworkCondition";
import { useSessionState } from "./shared/state/useSessionState";

const session = useSessionState();
let releaseNetwork: (() => void) | null = null;

onMounted(async () => {
  releaseNetwork = startNetworkCondition();
  // Anonymous provisioning happens on first launch. A failure is now recorded as a phase
  // on the session and surfaces on the screens that need an account, instead of being
  // dropped on the floor as "Home will somehow show it".
  try {
    await session.boot();
  } catch {
    /* phase === "failed" */
  }
});

onUnmounted(() => {
  releaseNetwork?.();
  releaseNetwork = null;
});
</script>

<template>
  <router-view />
</template>
