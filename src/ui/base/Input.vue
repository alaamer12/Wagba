<script setup lang="ts">
import { QInput } from "quasar";
import { onBeforeUnmount, onMounted, ref } from "vue";

// The platform control, named once. Quasar owns what we would otherwise re-implement — the
// native type, the controlled value, disabled semantics, IME handling, autofill — while the
// skin stays in ui/adaptive. Two seam details are repaired here.
//
// `v-model` compiles to a `modelValue` prop plus an `update:modelValue` event, neither of which
// falls through as an attribute, so the contract is implemented at the seam.
//
// Quasar sets `inheritAttrs: false` and rebuilds the control's attributes itself: everything
// except class/style/listeners is forwarded to the `<input>`, but `id` is overwritten by the uid
// it generates for the field's label. An id therefore travels as QInput's `for` prop, which seeds
// that uid; `aria-label`, `inputmode`, `autocomplete` and `data-*` reach the control as attrs.
const props = defineProps<{
  modelValue?: string;
  disabled?: boolean;
  /** The control's id; it is passed as `for` because QInput generates the id itself. */
  id?: string;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

function onUpdate(value: string | number | null) {
  emit("update:modelValue", value === null ? "" : String(value));
}

const control = ref<{ $el?: unknown; nativeEl?: HTMLInputElement | null } | null>(null);
let root: HTMLElement | null = null;

function takeFocus(): void {
  control.value?.nativeEl?.focus();
}

onMounted(() => {
  // `adaptive/Input` focuses this unit through `$el`, which is QInput's root <label>. A label
  // takes no focus of its own, so the root becomes a programmatic target and hands the focus
  // to the control instead of swallowing the request.
  root = (control.value?.$el as HTMLElement | undefined) ?? null;
  if (root === null) return;
  root.setAttribute("tabindex", "-1");
  root.addEventListener("focus", takeFocus);
});

onBeforeUnmount(() => {
  root?.removeEventListener("focus", takeFocus);
});
</script>

<template>
  <QInput
    ref="control"
    class="seam-input"
    borderless
    hide-bottom-space
    :model-value="props.modelValue ?? ''"
    :disable="disabled"
    :for="id"
    @update:model-value="onUpdate"
  />
</template>

<style scoped>
/* Quasar strips the outline from the control (`outline: 0 !important`), and the adaptive skin's
   `:focus` rule lands on the QInput root, which never takes focus. The ring is drawn on the node
   that actually has focus, where a keyboard user and the accessibility audit read it. */
.seam-input :deep(.q-field__native:focus) {
  box-shadow: 0 0 0 2px var(--butter);
}
</style>
