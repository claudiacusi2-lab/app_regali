import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the built site works from any sub-path (e.g. GitHub Pages /app_regali/)
export default defineConfig({
  plugins: [react()],
  base: './',
});
