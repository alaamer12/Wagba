<script setup lang="ts">
import { QSkeleton } from "quasar";

// The platform placeholder, named once. QSkeleton supplies the animation, the sizing props and
// the wave/pulse timing a hand-rolled div would have to invent; the shape of a loading card
// (thumb, lines, spacing) stays in ui/adaptive, which passes its classes through to this root.
</script>

<template>
  <QSkeleton>
    <slot />
  </QSkeleton>
</template>
