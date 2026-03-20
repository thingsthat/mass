import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';

import App from 'frontend/src/app.vue';
import Workspace from 'frontend/src/workspace/components/Workspace.vue';
import Workspaces from 'frontend/src/workspace/components/Workspaces.vue';

import 'frontend/src/css/main.css';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/app/workspaces',
      name: 'workspaces',
      component: Workspaces,
    },
    {
      path: '/app/workspace/:id',
      name: 'workspace',
      component: Workspace,
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'catch-all',
      component: { template: '<div></div>' },
    },
  ],
});

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);
app.mount('#app');
