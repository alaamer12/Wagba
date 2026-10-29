<script setup lang="ts">
import { computed } from 'vue';
import { hairColour, pickAvatar } from '../../lib/avatar';

const props = defineProps<{ handle: string; label?: string }>();

const pick = computed(() => pickAvatar(props.handle));
const hair = computed(() => hairColour(props.handle));
const skin = computed(() => pick.value.skin);
</script>

<template>
  <svg viewBox="0 0 100 100" role="img" :aria-label="label" class="avatar-art">
    <defs>
      <clipPath id="avatar-clip">
        <circle cx="50" cy="50" r="50" />
      </clipPath>
    </defs>
    <g clip-path="url(#avatar-clip)">
      <rect width="100" height="100" :fill="pick.backdrop" />

      <!-- shoulders -->
      <path d="M8 100 C 20 76, 38 68, 50 68 C 62 68, 80 76, 92 100 Z" :fill="pick.shirt" />
      <!-- neck -->
      <path d="M42 56 h16 v14 c0 6 -4 9 -8 9 c-4 0 -8 -3 -8 -9 Z" :fill="skin" />
      <!-- long hair sits behind the head -->
      <path
        v-if="pick.hair === 'long'"
        d="M28 46 C 24 24, 38 14, 50 14 C 62 14, 76 24, 72 46 L 74 70 C 66 66, 60 62, 60 50 L 40 50 C 40 62, 34 66, 26 70 Z"
        :fill="hair"
      />
      <!-- head -->
      <ellipse cx="50" cy="42" rx="20" ry="23" :fill="skin" />
      <!-- ears -->
      <circle cx="29" cy="44" r="4.5" :fill="skin" />
      <circle cx="71" cy="44" r="4.5" :fill="skin" />

      <!-- hair variants -->
      <template v-if="pick.hair === 'short'">
        <path d="M30 34 C 32 20, 42 15, 50 15 C 58 15, 68 20, 70 34 C 64 28, 56 25, 50 25 C 44 25, 36 28, 30 34 Z" :fill="hair" />
      </template>
      <template v-else-if="pick.hair === 'wavy'">
        <path d="M29 36 C 28 20, 40 14, 50 14 C 60 14, 72 20, 71 36 C 66 26, 58 22, 50 22 C 42 22, 34 26, 29 36 Z" :fill="hair" />
        <circle cx="34" cy="26" r="6" :fill="hair" />
        <circle cx="46" cy="19" r="7" :fill="hair" />
        <circle cx="60" cy="21" r="7" :fill="hair" />
        <circle cx="68" cy="30" r="6" :fill="hair" />
      </template>
      <template v-else-if="pick.hair === 'curly'">
        <circle cx="32" cy="30" r="7" :fill="hair" />
        <circle cx="42" cy="21" r="8" :fill="hair" />
        <circle cx="54" cy="18" r="8" :fill="hair" />
        <circle cx="66" cy="24" r="7" :fill="hair" />
        <circle cx="72" cy="34" r="6" :fill="hair" />
      </template>
      <template v-else-if="pick.hair === 'bun'">
        <path d="M30 34 C 32 20, 42 15, 50 15 C 58 15, 68 20, 70 34 C 64 28, 56 25, 50 25 C 44 25, 36 28, 30 34 Z" :fill="hair" />
        <circle cx="50" cy="10" r="9" :fill="hair" />
      </template>
      <template v-else-if="pick.hair === 'hijab'">
        <path d="M50 12 C 30 12, 24 28, 26 44 C 27 54, 30 60, 33 64 L 36 48 C 36 30, 42 22, 50 22 C 58 22, 64 30, 64 48 L 67 64 C 70 60, 73 54, 74 44 C 76 28, 70 12, 50 12 Z" :fill="pick.shirt" />
        <path d="M33 64 C 38 70, 44 72, 50 72 C 56 72, 62 70, 67 64 C 66 58, 60 54, 50 54 C 40 54, 34 58, 33 64 Z" :fill="pick.shirt" />
      </template>
      <template v-else-if="pick.hair === 'bald'">
        <ellipse cx="50" cy="24" rx="13" ry="7" :fill="skin" opacity="0.6" />
      </template>

      <!-- eyebrows -->
      <path d="M38 36 q 5 -3 10 -1" stroke="#2a1f1a" stroke-width="2" fill="none" stroke-linecap="round" />
      <path d="M52 35 q 5 -2 10 1" stroke="#2a1f1a" stroke-width="2" fill="none" stroke-linecap="round" />
      <!-- eyes -->
      <circle cx="43" cy="43" r="2.2" fill="#1e1815" />
      <circle cx="57" cy="43" r="2.2" fill="#1e1815" />
      <!-- nose -->
      <path d="M50 46 v6" stroke="#bf6746" stroke-width="1.6" stroke-linecap="round" opacity="0.7" />
      <!-- smile -->
      <path d="M43 56 q 7 6 14 0" stroke="#a24a32" stroke-width="2" fill="none" stroke-linecap="round" />

      <!-- facial hair -->
      <template v-if="pick.beard === 'stubble'">
        <path d="M34 50 C 36 62, 44 66, 50 66 C 56 66, 64 62, 66 50 C 64 58, 58 60, 50 60 C 42 60, 36 58, 34 50 Z" fill="#2a1f1a" opacity="0.18" />
      </template>
      <template v-else-if="pick.beard === 'beard'">
        <path d="M32 48 C 34 64, 44 70, 50 70 C 56 70, 66 64, 68 48 C 66 60, 58 63, 50 63 C 42 63, 34 60, 32 48 Z" :fill="hair" />
      </template>

      <!-- glasses -->
      <template v-if="pick.glasses === 'round'">
        <circle cx="43" cy="43" r="7" fill="none" stroke="#3f2205" stroke-width="1.6" />
        <circle cx="57" cy="43" r="7" fill="none" stroke="#3f2205" stroke-width="1.6" />
        <path d="M50 43 h0" stroke="#3f2205" stroke-width="1.6" />
      </template>
      <template v-else-if="pick.glasses === 'square'">
        <rect x="36" y="37" width="14" height="12" rx="2" fill="none" stroke="#3f2205" stroke-width="1.6" />
        <rect x="50" y="37" width="14" height="12" rx="2" fill="none" stroke="#3f2205" stroke-width="1.6" />
        <path d="M50 43 h0" stroke="#3f2205" stroke-width="1.6" />
      </template>
    </g>
  </svg>
</template>

<style scoped>
.avatar-art {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
