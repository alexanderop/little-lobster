import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  css: { postcss: { plugins: [tailwindcss()] } },
  server: { host: '127.0.0.1' },
});
