<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import NotFoundPanel from "../app/NotFoundPanel.vue";

// The surface for a path that names nothing. It is a route, not a rendition: no read failed
// and nothing is absent from a list — the address itself is unknown. The action goes to "/"
// exactly as the old link did, so the welcome redirect still decides what a first arrival sees.
const { t } = useI18n();
const router = useRouter();
</script>

<template>
  <main class="not-found">
    <div class="not-found__inner">
      <div class="not-found__code" aria-hidden="true">404</div>
      <NotFoundPanel
        :title="t('notFound.title')"
        :body="t('notFound.body')"
        :action="t('notFound.action')"
        @select="router.push('/')"
      />
    </div>
  </main>
</template>

<style scoped>
.not-found {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: var(--cream);
  color: var(--ink);
  text-align: center;
}
.not-found__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  max-width: 40ch;
}
.not-found__code {
  font-size: 30vh;
  font-weight: 800;
  line-height: 1;
  color: var(--butter);
}
/* The wrappers carry the classes; the seam's own heading and paragraph take the type. */
</style>
