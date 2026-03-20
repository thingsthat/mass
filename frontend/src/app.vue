<script setup lang="ts">
import { logApp } from 'core/src/helpers/logger';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

import 'vue-sonner/style.css';

import { Toaster } from 'frontend/src/components/ui/sonner';

const router = useRouter();

// Also set up router redirect as backup (in case history.replaceState didn't work)
onMounted(() => {
  logApp();

  router.replace('/app/workspaces');
});
</script>

<template>
  <div>
    <RouterView />
  </div>
  <Toaster />
</template>
