<script setup lang="ts">
import PageShell from "../app/_PageShell.vue";
import ProfileFormView from "../features/profile/views/ProfileFormView/ProfileFormView.vue";

// The route surface for the account form. The bar belongs to the View, because its title says
// whether this is a new account being finished or an existing one being edited, and a Page that
// read the session to label the chrome would be a Page reading a fact.
</script>

<template>
  <PageShell :with-bar="false">
    <ProfileFormView />
  </PageShell>
</template>
