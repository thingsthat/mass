<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

import Loader from 'frontend/src/components/ai-elements/loader/Loader.vue';
import { fetchWorkspaces, upsertWorkspaceConversation } from 'frontend/src/workspace/workspaceApi';

const router = useRouter();
const emptyConversation = { name: '', messages: [] };

onMounted(async () => {
  const workspaces = await fetchWorkspaces(false, { storeResult: false });
  if (workspaces.length > 0) {
    router.replace({ name: 'workspace', params: { id: workspaces[0].id } });
    return;
  }
  const { id } = await upsertWorkspaceConversation(emptyConversation, 'Untitled', '');
  router.replace({ name: 'workspace', params: { id } });
});
</script>

<template>
  <div class="mx-auto flex justify-center p-10">
    <Loader :size="24" />
  </div>
</template>
