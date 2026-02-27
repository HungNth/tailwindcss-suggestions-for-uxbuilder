import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'UX Builder Tailwind CSS IntelliSense',
    description: 'Tailwind CSS class autocomplete and validation for Flatsome UX Builder',
    version: '0.1.0',
    permissions: ['activeTab', 'storage'],
    host_permissions: ['http://localhost:3000/*'],
  },
});
